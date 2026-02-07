import { BadRequestException } from '@nestjs/common';

import { DateTimeUtils } from 'src/mkt-core/utils/date-time.utils';
import { DashboardDateRangeService } from 'src/mkt-core/mkt-dashboard/services/core/dashboard-date-range.service';

jest.mock('src/mkt-core/utils/date-time.utils');

const MOCK_DATE_TIME_UTILS = DateTimeUtils as jest.Mocked<typeof DateTimeUtils>;

describe('DashboardDateRangeService', () => {
  let service: DashboardDateRangeService;

  beforeEach(() => {
    service = new DashboardDateRangeService();
    jest.clearAllMocks();
  });

  // ============================================
  // Helper to set up range mock returns
  // ============================================

  const mockRangeReturn = (startISO: string, endISO: string) => {
    const mockStart = { toISO: () => startISO } as any;
    const mockEnd = { toISO: () => endISO } as any;

    MOCK_DATE_TIME_UTILS.toISO.mockImplementation(
      (dt: any) => dt.toISO() as string,
    );

    return { start: mockStart, end: mockEnd };
  };

  // ============================================
  // resolve()
  // ============================================

  describe('resolve', () => {
    it('should return today range for TODAY period', () => {
      const range = mockRangeReturn(
        '2024-01-15T00:00:00.000Z',
        '2024-01-15T23:59:59.999Z',
      );

      MOCK_DATE_TIME_UTILS.getToday.mockReturnValue(range as any);

      const result = service.resolve('TODAY');

      expect(result.startDate).toBe('2024-01-15T00:00:00.000Z');
      expect(result.endDate).toBe('2024-01-15T23:59:59.999Z');
      expect(MOCK_DATE_TIME_UTILS.getToday).toHaveBeenCalledTimes(1);
    });

    it('should return current week range for THIS_WEEK period', () => {
      const range = mockRangeReturn(
        '2024-01-15T00:00:00.000Z',
        '2024-01-21T23:59:59.999Z',
      );

      MOCK_DATE_TIME_UTILS.getCurrentWeek.mockReturnValue(range as any);

      const result = service.resolve('THIS_WEEK');

      expect(result.startDate).toBe('2024-01-15T00:00:00.000Z');
      expect(result.endDate).toBe('2024-01-21T23:59:59.999Z');
      expect(MOCK_DATE_TIME_UTILS.getCurrentWeek).toHaveBeenCalledTimes(1);
    });

    it('should return current month range for THIS_MONTH period', () => {
      const range = mockRangeReturn(
        '2024-01-01T00:00:00.000Z',
        '2024-01-31T23:59:59.999Z',
      );

      MOCK_DATE_TIME_UTILS.getCurrentMonth.mockReturnValue(range as any);

      const result = service.resolve('THIS_MONTH');

      expect(result.startDate).toBe('2024-01-01T00:00:00.000Z');
      expect(result.endDate).toBe('2024-01-31T23:59:59.999Z');
      expect(MOCK_DATE_TIME_UTILS.getCurrentMonth).toHaveBeenCalledTimes(1);
    });

    it('should return current quarter range for THIS_QUARTER period', () => {
      const range = mockRangeReturn(
        '2024-01-01T00:00:00.000Z',
        '2024-03-31T23:59:59.999Z',
      );

      MOCK_DATE_TIME_UTILS.getCurrentQuarter.mockReturnValue(range as any);

      const result = service.resolve('THIS_QUARTER');

      expect(result.startDate).toBe('2024-01-01T00:00:00.000Z');
      expect(result.endDate).toBe('2024-03-31T23:59:59.999Z');
      expect(MOCK_DATE_TIME_UTILS.getCurrentQuarter).toHaveBeenCalledTimes(1);
    });

    it('should return current year range for THIS_YEAR period', () => {
      const range = mockRangeReturn(
        '2024-01-01T00:00:00.000Z',
        '2024-12-31T23:59:59.999Z',
      );

      MOCK_DATE_TIME_UTILS.getCurrentYear.mockReturnValue(range as any);

      const result = service.resolve('THIS_YEAR');

      expect(result.startDate).toBe('2024-01-01T00:00:00.000Z');
      expect(result.endDate).toBe('2024-12-31T23:59:59.999Z');
      expect(MOCK_DATE_TIME_UTILS.getCurrentYear).toHaveBeenCalledTimes(1);
    });

    it('should return custom dates for CUSTOM period with valid dates', () => {
      const customStart = '2024-06-01T00:00:00.000Z';
      const customEnd = '2024-06-30T23:59:59.999Z';

      const result = service.resolve('CUSTOM', customStart, customEnd);

      expect(result.startDate).toBe(customStart);
      expect(result.endDate).toBe(customEnd);
    });

    it('should throw BadRequestException for CUSTOM period without startDate', () => {
      expect(() =>
        service.resolve('CUSTOM', undefined, '2024-06-30T23:59:59.999Z'),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for CUSTOM period without endDate', () => {
      expect(() =>
        service.resolve('CUSTOM', '2024-06-01T00:00:00.000Z'),
      ).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for CUSTOM period without any dates', () => {
      expect(() => service.resolve('CUSTOM')).toThrow(BadRequestException);
      expect(() => service.resolve('CUSTOM')).toThrow(
        'startDate and endDate are required for CUSTOM period',
      );
    });

    it('should fall back to THIS_MONTH for unknown period', () => {
      const range = mockRangeReturn(
        '2024-01-01T00:00:00.000Z',
        '2024-01-31T23:59:59.999Z',
      );

      MOCK_DATE_TIME_UTILS.getCurrentMonth.mockReturnValue(range as any);

      const result = service.resolve('UNKNOWN_PERIOD' as never);

      expect(result.startDate).toBe('2024-01-01T00:00:00.000Z');
      expect(result.endDate).toBe('2024-01-31T23:59:59.999Z');
      expect(MOCK_DATE_TIME_UTILS.getCurrentMonth).toHaveBeenCalledTimes(1);
    });

    it('should not call any DateTimeUtils range method for CUSTOM with valid dates', () => {
      service.resolve(
        'CUSTOM',
        '2024-01-01T00:00:00.000Z',
        '2024-01-31T23:59:59.999Z',
      );

      expect(MOCK_DATE_TIME_UTILS.getToday).not.toHaveBeenCalled();
      expect(MOCK_DATE_TIME_UTILS.getCurrentWeek).not.toHaveBeenCalled();
      expect(MOCK_DATE_TIME_UTILS.getCurrentMonth).not.toHaveBeenCalled();
      expect(MOCK_DATE_TIME_UTILS.getCurrentQuarter).not.toHaveBeenCalled();
      expect(MOCK_DATE_TIME_UTILS.getCurrentYear).not.toHaveBeenCalled();
    });
  });

  // ============================================
  // getPreviousPeriod()
  // ============================================

  describe('getPreviousPeriod', () => {
    it('should calculate the previous period based on current range duration', () => {
      const currentRange = {
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z',
      };

      const mockStart = { id: 'start' } as any;
      const mockEnd = { id: 'end' } as any;
      const mockPreviousEnd = {
        id: 'previousEnd',
        toISO: () => '2023-12-31T00:00:00.000Z',
      } as any;
      const mockPreviousStart = {
        id: 'previousStart',
        toISO: () => '2023-12-01T00:00:00.000Z',
      } as any;

      MOCK_DATE_TIME_UTILS.fromISO.mockImplementation((iso: string) => {
        if (iso === currentRange.startDate) return mockStart;
        if (iso === currentRange.endDate) return mockEnd;

        return {} as any;
      });

      MOCK_DATE_TIME_UTILS.diffInDays.mockReturnValue(30);

      MOCK_DATE_TIME_UTILS.subtract.mockImplementation(
        (_dt: any, duration: any) => {
          if (duration.days === 1) return mockPreviousEnd;
          if (duration.days === 30) return mockPreviousStart;

          return {} as any;
        },
      );

      MOCK_DATE_TIME_UTILS.toISO.mockImplementation(
        (dt: any) => dt.toISO() as string,
      );

      const result = service.getPreviousPeriod('THIS_MONTH', currentRange);

      expect(result.startDate).toBe('2023-12-01T00:00:00.000Z');
      expect(result.endDate).toBe('2023-12-31T00:00:00.000Z');
      expect(MOCK_DATE_TIME_UTILS.fromISO).toHaveBeenCalledWith(
        currentRange.startDate,
      );
      expect(MOCK_DATE_TIME_UTILS.fromISO).toHaveBeenCalledWith(
        currentRange.endDate,
      );
      expect(MOCK_DATE_TIME_UTILS.diffInDays).toHaveBeenCalledWith(
        mockStart,
        mockEnd,
      );
      expect(MOCK_DATE_TIME_UTILS.subtract).toHaveBeenCalledWith(mockStart, {
        days: 1,
      });
      expect(MOCK_DATE_TIME_UTILS.subtract).toHaveBeenCalledWith(
        mockPreviousEnd,
        { days: 30 },
      );
    });

    it('should handle single-day period (TODAY)', () => {
      const currentRange = {
        startDate: '2024-03-15T00:00:00.000Z',
        endDate: '2024-03-15T23:59:59.999Z',
      };

      const mockStart = { id: 'start' } as any;
      const mockEnd = { id: 'end' } as any;
      const mockPreviousEnd = {
        id: 'previousEnd',
        toISO: () => '2024-03-14T00:00:00.000Z',
      } as any;
      const mockPreviousStart = {
        id: 'previousStart',
        toISO: () => '2024-03-14T00:00:00.000Z',
      } as any;

      MOCK_DATE_TIME_UTILS.fromISO.mockImplementation((iso: string) => {
        if (iso === currentRange.startDate) return mockStart;
        if (iso === currentRange.endDate) return mockEnd;

        return {} as any;
      });

      // For a single day, diffInDays could be ~0.999... (less than 1 full day)
      MOCK_DATE_TIME_UTILS.diffInDays.mockReturnValue(0);

      MOCK_DATE_TIME_UTILS.subtract.mockImplementation(
        (_dt: any, duration: any) => {
          if (duration.days === 1) return mockPreviousEnd;
          if (duration.days === 0) return mockPreviousStart;

          return {} as any;
        },
      );

      MOCK_DATE_TIME_UTILS.toISO.mockImplementation(
        (dt: any) => dt.toISO() as string,
      );

      const result = service.getPreviousPeriod('TODAY', currentRange);

      expect(result.startDate).toBe('2024-03-14T00:00:00.000Z');
      expect(result.endDate).toBe('2024-03-14T00:00:00.000Z');
    });
  });

  // ============================================
  // getPeriodProgress()
  // ============================================

  describe('getPeriodProgress', () => {
    it('should return correct elapsed and total days mid-period', () => {
      const range = {
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z',
      };

      const mockStart = { id: 'start' } as any;
      const mockEnd = { id: 'end' } as any;
      const mockNow = { id: 'now' } as any;

      MOCK_DATE_TIME_UTILS.fromISO.mockImplementation((iso: string) => {
        if (iso === range.startDate) return mockStart;
        if (iso === range.endDate) return mockEnd;

        return {} as any;
      });

      MOCK_DATE_TIME_UTILS.now.mockReturnValue(mockNow);

      // Total days: diffInDays(start, end) + 1 = 30 + 1 = 31
      // Elapsed days: Math.min(diffInDays(start, now) + 1, 31) = Math.min(15 + 1, 31) = 16
      MOCK_DATE_TIME_UTILS.diffInDays.mockImplementation((s: any, e: any) => {
        if (s.id === 'start' && e.id === 'end') return 30;
        if (s.id === 'start' && e.id === 'now') return 15;

        return 0;
      });

      const result = service.getPeriodProgress(range);

      expect(result.totalDays).toBe(31);
      expect(result.elapsedDays).toBe(16);
      expect(MOCK_DATE_TIME_UTILS.now).toHaveBeenCalledTimes(1);
    });

    it('should cap elapsed days at total days when past end of period', () => {
      const range = {
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z',
      };

      const mockStart = { id: 'start' } as any;
      const mockEnd = { id: 'end' } as any;
      const mockNow = { id: 'now' } as any;

      MOCK_DATE_TIME_UTILS.fromISO.mockImplementation((iso: string) => {
        if (iso === range.startDate) return mockStart;
        if (iso === range.endDate) return mockEnd;

        return {} as any;
      });

      MOCK_DATE_TIME_UTILS.now.mockReturnValue(mockNow);

      // Total: 30 + 1 = 31
      // Elapsed before cap: 45 + 1 = 46, capped to 31
      MOCK_DATE_TIME_UTILS.diffInDays.mockImplementation((s: any, e: any) => {
        if (s.id === 'start' && e.id === 'end') return 30;
        if (s.id === 'start' && e.id === 'now') return 45;

        return 0;
      });

      const result = service.getPeriodProgress(range);

      expect(result.totalDays).toBe(31);
      expect(result.elapsedDays).toBe(31);
    });

    it('should return 1 elapsed day on the first day of the period', () => {
      const range = {
        startDate: '2024-01-01T00:00:00.000Z',
        endDate: '2024-01-31T23:59:59.999Z',
      };

      const mockStart = { id: 'start' } as any;
      const mockEnd = { id: 'end' } as any;
      const mockNow = { id: 'now' } as any;

      MOCK_DATE_TIME_UTILS.fromISO.mockImplementation((iso: string) => {
        if (iso === range.startDate) return mockStart;
        if (iso === range.endDate) return mockEnd;

        return {} as any;
      });

      MOCK_DATE_TIME_UTILS.now.mockReturnValue(mockNow);

      // Total: 30 + 1 = 31
      // Elapsed: Math.min(0 + 1, 31) = 1
      MOCK_DATE_TIME_UTILS.diffInDays.mockImplementation((s: any, e: any) => {
        if (s.id === 'start' && e.id === 'end') return 30;
        if (s.id === 'start' && e.id === 'now') return 0;

        return 0;
      });

      const result = service.getPeriodProgress(range);

      expect(result.totalDays).toBe(31);
      expect(result.elapsedDays).toBe(1);
    });

    it('should handle single-day range', () => {
      const range = {
        startDate: '2024-01-15T00:00:00.000Z',
        endDate: '2024-01-15T23:59:59.999Z',
      };

      const mockStart = { id: 'start' } as any;
      const mockEnd = { id: 'end' } as any;
      const mockNow = { id: 'now' } as any;

      MOCK_DATE_TIME_UTILS.fromISO.mockImplementation((iso: string) => {
        if (iso === range.startDate) return mockStart;
        if (iso === range.endDate) return mockEnd;

        return {} as any;
      });

      MOCK_DATE_TIME_UTILS.now.mockReturnValue(mockNow);

      // Single day: diffInDays(start, end) = 0, total = 0 + 1 = 1
      // Elapsed: Math.min(0 + 1, 1) = 1
      MOCK_DATE_TIME_UTILS.diffInDays.mockImplementation((s: any, e: any) => {
        if (s.id === 'start' && e.id === 'end') return 0;
        if (s.id === 'start' && e.id === 'now') return 0;

        return 0;
      });

      const result = service.getPeriodProgress(range);

      expect(result.totalDays).toBe(1);
      expect(result.elapsedDays).toBe(1);
    });
  });
});
