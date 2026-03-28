import cron from 'node-cron';
import Booking from '../models/Booking.model';
import proxmoxService from './proxmox.service';

class BookingLifecycleService {
    private started = false;

    start() {
        if (this.started) return;
        this.started = true;

        // Every 10 minutes, expire local bookings and schedule/defer deletion.
        cron.schedule('*/10 * * * *', async () => {
            try {
                await this.expireProvisionedBookings();
                await this.deleteExpiredBookings();
            } catch (error) {
                console.error('[BookingLifecycle] Job failed:', error);
            }
        });
    }

    async expireProvisionedBookings() {
        const now = new Date();
        const bookings = await Booking.find({
            provisioningType: 'local',
            provisioningStatus: 'provisioned',
            expiresAt: { $lte: now },
        });

        for (const booking of bookings) {
            const localConfig = booking.localProvisioning as any || {};
            if (localConfig.vmId) {
                try {
                    await proxmoxService.stopVm(localConfig.vmId, localConfig.nodeName);
                } catch (error) {
                    if (proxmoxService.isMissingVmError(error)) {
                        console.warn(`[BookingLifecycle] VM ${localConfig.vmId} is already missing during stop; marking booking expired.`);
                    } else {
                    console.error(`[BookingLifecycle] Failed to stop VM ${localConfig.vmId}:`, error);
                    }
                }
            }

            booking.provisioningStatus = 'expired';
            booking.status = 'completed';
            if (!booking.deletionScheduledAt) {
                booking.deletionScheduledAt = booking.expiresAt;
            }
            await booking.save();
        }
    }

    async deleteExpiredBookings() {
        const now = new Date();
        const bookings = await Booking.find({
            provisioningType: 'local',
            provisioningStatus: { $in: ['expired', 'deleted'] },
            deletionScheduledAt: { $lte: now },
        });

        for (const booking of bookings) {
            if (booking.provisioningStatus === 'deleted') {
                continue;
            }

            const localConfig = booking.localProvisioning as any || {};
            if (localConfig.vmId) {
                try {
                    await proxmoxService.deleteVm(localConfig.vmId, localConfig.nodeName);
                } catch (error) {
                    if (proxmoxService.isMissingVmError(error)) {
                        console.warn(`[BookingLifecycle] VM ${localConfig.vmId} already absent during delete; marking booking deleted.`);
                    } else {
                        console.error(`[BookingLifecycle] Failed to delete VM ${localConfig.vmId}:`, error);
                        continue;
                    }
                }
            }

            booking.provisioningStatus = 'deleted';
            booking.status = 'completed';
            await booking.save();
        }
    }
}

const bookingLifecycleService = new BookingLifecycleService();
export default bookingLifecycleService;
