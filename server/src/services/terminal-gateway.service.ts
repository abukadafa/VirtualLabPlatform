import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { Client as SSHClient } from 'ssh2';
import Booking from '../models/Booking.model';
import configService from './config.service';

interface DecodedToken {
    id: string;
    role: string;
}

class TerminalGatewayService {
    private wss?: WebSocketServer;

    private rejectUpgrade(socket: any, status: string, message: string) {
        socket.write(`HTTP/1.1 ${status}\r\nContent-Type: text/plain\r\nContent-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`);
        socket.destroy();
    }

    initialize(server: http.Server) {
        this.wss = new WebSocketServer({ noServer: true });

        server.on('upgrade', async (request, socket, head) => {
            try {
                const url = new URL(request.url || '', 'http://localhost');
                if (url.pathname !== '/ws/terminal') {
                    return;
                }

                const token = url.searchParams.get('token');
                const bookingId = url.searchParams.get('bookingId');

                if (!token || !bookingId || !process.env.JWT_SECRET) {
                    this.rejectUpgrade(socket, '401 Unauthorized', 'Missing terminal authentication details.');
                    return;
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
                const booking = await Booking.findById(bookingId);

                if (!booking) {
                    this.rejectUpgrade(socket, '404 Not Found', 'Booking not found.');
                    return;
                }

                const isStaff = ['admin', 'facilitator', 'lab technician'].includes(decoded.role);
                const ownsBooking = booking.user.toString() === decoded.id;
                
                if (!ownsBooking && !isStaff) {
                    this.rejectUpgrade(socket, '403 Forbidden', 'You do not have access to this booking.');
                    return;
                }

                if (booking.provisioningStatus === 'deleted' || booking.provisioningStatus === 'expired' || booking.status === 'completed') {
                    this.rejectUpgrade(socket, '410 Gone', 'This lab booking has expired or has already been cleaned up.');
                    return;
                }

                if (booking.approvalStatus !== 'approved' || booking.provisioningStatus !== 'provisioned' || booking.provisioningType !== 'local') {
                    this.rejectUpgrade(socket, '400 Bad Request', 'This booking is not currently provisioned for local terminal access.');
                    return;
                }

                this.wss?.handleUpgrade(request, socket, head, (ws) => {
                    (ws as any).bookingId = bookingId;
                    this.wss?.emit('connection', ws, request);
                });
            } catch (error) {
                this.rejectUpgrade(socket, '401 Unauthorized', 'Terminal authentication failed.');
            }
        });

        this.wss.on('connection', async (ws) => {
            const bookingId = (ws as any).bookingId;
            const booking = await Booking.findById(bookingId);
            
            if (!booking?.localProvisioning?.ipAddress || !booking.localProvisioning.username || !booking.localProvisioning.password) {
                console.error(`[Terminal] Incomplete connection details for booking ${bookingId}`);
                ws.send(JSON.stringify({ type: 'error', message: 'Local VM connection details are incomplete.' }));
                ws.close();
                return;
            }

            const targetIp = booking.localProvisioning.ipAddress;
            const targetUser = booking.localProvisioning.username;
            console.log(`[Terminal] Connecting to ${targetUser}@${targetIp} for booking ${bookingId}`);

            const proxmoxConfig = await configService.get<any>('proxmox');
            const proxmoxHost = proxmoxConfig?.apiUrl ? new URL(proxmoxConfig.apiUrl).hostname : '';
            if (targetIp === proxmoxHost) {
                console.warn(`[Terminal] Security Block: Attempt to connect to Proxmox host ${targetIp}`);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: 'Terminal target is set to the Proxmox host IP, not the VM guest IP. Update the booking with the VM SSH IP.'
                }));
                ws.close();
                return;
            }

            const ssh = new SSHClient();
            let shellStream: any;

            ssh.on('ready', () => {
                console.log(`[Terminal] SSH Handshake successful for ${targetIp}`);
                ssh.shell((err, stream) => {
                    if (err) {
                        console.error(`[Terminal] Shell request failed: ${err.message}`);
                        ws.send(JSON.stringify({ type: 'error', message: err.message }));
                        ws.close();
                        ssh.end();
                        return;
                    }

                    shellStream = stream;
                    ws.send(JSON.stringify({ type: 'ready' }));

                    stream.on('data', (data: Buffer) => {
                        ws.send(JSON.stringify({ type: 'data', data: data.toString('utf-8') }));
                    });

                    stream.stderr?.on('data', (data: Buffer) => {
                        ws.send(JSON.stringify({ type: 'data', data: data.toString('utf-8') }));
                    });

                    stream.on('close', () => {
                        console.log(`[Terminal] Shell stream closed for ${targetIp}`);
                        ws.close();
                        ssh.end();
                    });
                });
            });

            ssh.on('error', (error) => {
                console.error(`[Terminal] SSH Error for ${targetIp}: ${error.message}`);
                ws.send(JSON.stringify({ type: 'error', message: error.message }));
                ws.close();
            });

            ssh.on('close', () => {
                console.log(`[Terminal] SSH Connection closed for ${targetIp}`);
            });

            ws.on('message', (raw) => {
                try {
                    const message = JSON.parse(raw.toString());
                    if (!shellStream) return;

                    if (message.type === 'input' && typeof message.data === 'string') {
                        shellStream.write(message.data);
                    }

                    if (message.type === 'resize' && typeof shellStream.setWindow === 'function') {
                        shellStream.setWindow(message.rows || 24, message.cols || 80, 0, 0);
                    }
                } catch {
                    // Ignore malformed client messages.
                }
            });

            const teardown = () => {
                if (shellStream) {
                    shellStream.end();
                }
                ssh.end();
            };

            ws.on('close', teardown);
            ws.on('error', teardown);

            ssh.connect({
                host: booking.localProvisioning.ipAddress,
                port: booking.localProvisioning.sshPort || 22,
                username: booking.localProvisioning.username,
                password: booking.localProvisioning.password,
                readyTimeout: 15000,
                tryKeyboard: false,
            });
        });
    }
}

const terminalGatewayService = new TerminalGatewayService();
export default terminalGatewayService;
