import cron from 'node-cron';
import pool from '../config/database';
import { SmsService } from './sms.service';

export class ReminderService {
  /**
   * Initialize and start the reminder cron job
   * Runs every hour at minute 0
   */
  static init(): void {
    console.log('[ReminderService] Initializing automated reminders cron job...');
    
    // Schedule to run every hour
    cron.schedule('0 * * * *', () => {
      console.log('[ReminderService] Running hourly booking reminders check...');
      this.sendUpcomingBookingReminders().catch(err => 
        console.error('[ReminderService] Error sending reminders:', err)
      );
    });
  }

  /**
   * Find bookings scheduled in the next 24 hours and send SMS reminders
   */
  static async sendUpcomingBookingReminders(): Promise<void> {
    try {
      // Find bookings scheduled between 23 and 24 hours from now
      // that are in 'accepted' status and haven't been completed/cancelled
      const result = await pool.query(`
        SELECT 
          b.id, 
          b.scheduled_date, 
          b.description,
          u_cust.phone as customer_phone,
          u_cust.username as customer_name,
          u_prov.phone as provider_phone,
          p.name as provider_name
        FROM bookings b
        JOIN users u_cust ON b.customer_id = u_cust.id
        JOIN providers p ON b.provider_id = p.id
        JOIN users u_prov ON p.user_id = u_prov.id
        WHERE b.status = 'accepted'
          AND b.scheduled_date BETWEEN NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '24 hours'
      `);

      const reminders = result.rows;
      console.log(`[ReminderService] Found ${reminders.length} bookings for reminder.`);

      for (const booking of reminders) {
        const scheduledTime = new Date(booking.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        // Remind Customer
        const customerMsg = `Reminder: Your booking with ${booking.provider_name} is scheduled for tomorrow at ${scheduledTime}.`;
        await SmsService.sendSMS(booking.customer_phone, customerMsg).catch(err => 
          console.error(`[ReminderService] Failed to send SMS to customer ${booking.customer_phone}:`, err)
        );

        // Remind Provider
        const providerMsg = `Reminder: You have a booking with ${booking.customer_name} tomorrow at ${scheduledTime}.`;
        await SmsService.sendSMS(booking.provider_phone, providerMsg).catch(err => 
          console.error(`[ReminderService] Failed to send SMS to provider ${booking.provider_phone}:`, err)
        );
      }
    } catch (error) {
      console.error('[ReminderService] Failed to process reminders:', error);
      throw error;
    }
  }
}
