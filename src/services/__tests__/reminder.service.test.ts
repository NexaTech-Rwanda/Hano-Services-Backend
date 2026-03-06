import { ReminderService } from '../reminder.service';
import pool from '../../config/database';
import { SmsService } from '../sms.service';

jest.mock('../../config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../sms.service', () => ({
  SmsService: {
    sendSMS: jest.fn(),
  },
}));

describe('ReminderService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendUpcomingBookingReminders', () => {
    it('should find bookings and send SMS reminders to both customer and provider', async () => {
      const mockBookings = [
        {
          id: 'b-1',
          scheduled_date: new Date(Date.now() + 23.5 * 60 * 60 * 1000).toISOString(),
          customer_phone: '+250780000001',
          customer_name: 'Customer A',
          provider_phone: '+250780000002',
          provider_name: 'Provider B',
        },
      ];

      (pool.query as jest.Mock).mockResolvedValue({ rows: mockBookings });
      (SmsService.sendSMS as jest.Mock).mockResolvedValue({ success: true });

      await ReminderService.sendUpcomingBookingReminders();

      expect(pool.query).toHaveBeenCalled();
      expect(SmsService.sendSMS).toHaveBeenCalledTimes(2);
      expect(SmsService.sendSMS).toHaveBeenCalledWith('+250780000001', expect.stringContaining('Provider B'));
      expect(SmsService.sendSMS).toHaveBeenCalledWith('+250780000002', expect.stringContaining('Customer A'));
    });

    it('should handle zero bookings gracefully', async () => {
      (pool.query as jest.Mock).mockResolvedValue({ rows: [] });

      await ReminderService.sendUpcomingBookingReminders();

      expect(SmsService.sendSMS).not.toHaveBeenCalled();
    });

    it('should continue processing other reminders if one SMS fails', async () => {
      const mockBookings = [
        { customer_phone: '1', provider_phone: '2', provider_name: 'P', customer_name: 'C', scheduled_date: new Date() },
        { customer_phone: '3', provider_phone: '4', provider_name: 'P2', customer_name: 'C2', scheduled_date: new Date() },
      ];

      (pool.query as jest.Mock).mockResolvedValue({ rows: mockBookings });
      (SmsService.sendSMS as jest.Mock)
        .mockRejectedValueOnce(new Error('SMS Failed'))
        .mockResolvedValue({ success: true });

      await ReminderService.sendUpcomingBookingReminders();

      // Should try to send 4 SMS (2 per booking), but even if 1 fails, it continues
      expect(SmsService.sendSMS).toHaveBeenCalledTimes(4);
    });
  });
});
