import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { Client as SSHClient } from 'ssh2';
import Booking from '../models/Booking.model';

interface DecodedToken {
    id: string;
    role: string;
}

class TerminalGatewayService {
    private wss?: WebSocketServer;

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
                    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                    socket.destroy();
                    return;
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET) as DecodedToken;
                const booking = await Booking.findById(bookingId);

                if (!booking) {
                    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
                    socket.destroy();
                    return;
                }

                const ownsBooking = booking.user.toString() === decoded.id;
                if (!ownsBooking && decoded.role !== 'admin') {
                    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
                    socket.destroy();
                    return;
                }

                if (booking.approvalStatus !== 'approved' || booking.provisioningStatus !== 'provisioned' || booking.provisioningType !== 'local') {
                    socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
                    socket.destroy();
                    return;
                }

                this.wss?.handleUpgrade(request, socket, head, (ws) => {
                    (ws as any).bookingId = bookingId;
                    this.wss?.emit('connection', ws, request);
                });
            } catch (error) {
                socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                socket.destroy();
            }
        });

        this.wss.on('connection', async (ws) => {
            const booking = await Booking.findById((ws as any).bookingId);
            if (!booking?.localProvisioning?.ipAddress || !booking.localProvisioning.username || !booking.localProvisioning.password) {
                ws.send(JSON.stringify({ type: 'error', message: 'Local VM connection details are incomplete.' }));
                ws.close();
                return;
            }

            const ssh = new SSHClient();
            let shellStream: any;

            ssh.on('ready', () => {
                ssh.shell((err, stream) => {
                    if (err) {
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
                        ws.close();
                        ssh.end();
                    });
                });
            });

            ssh.on('error', (error) => {
                ws.send(JSON.stringify({ type: 'error', message: error.message }));
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
