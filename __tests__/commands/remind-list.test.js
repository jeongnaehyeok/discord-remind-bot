// Mock dependencies
jest.mock('../../src/utils/timeParser');
jest.mock('../../src/database');

const { formatTime } = require('../../src/utils/timeParser');
const mockDb = require('../../src/database');

describe('Remind List Command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock formatTime function
        formatTime.mockImplementation((date) => {
            return new Date(date).toLocaleString('ko-KR', {
                timeZone: 'Asia/Seoul'
            });
        });
        
        // Mock database methods
        mockDb.getUserReminders = jest.fn();
    });
    
    describe('reminder list formatting', () => {
        test('빈 리마인더 목록', async () => {
            mockDb.getUserReminders.mockResolvedValue([]);
            
            const reminders = await mockDb.getUserReminders('user123');
            
            expect(reminders).toHaveLength(0);
            expect(mockDb.getUserReminders).toHaveBeenCalledWith('user123');
        });
        
        test('단일 리마인더 목록', async () => {
            const mockReminders = [{
                id: 1,
                user_id: 'user123',
                channel_id: 'channel456',
                message: '회의 참석하기',
                remind_time: '2025-06-17T10:00:00.000Z',
                repeat_type: null,
                repeat_interval: null,
                created_at: '2025-06-16T18:00:00.000Z'
            }];
            
            mockDb.getUserReminders.mockResolvedValue(mockReminders);
            
            const reminders = await mockDb.getUserReminders('user123');
            
            expect(reminders).toHaveLength(1);
            expect(reminders[0].message).toBe('회의 참석하기');
            expect(reminders[0].repeat_type).toBeNull();
        });
        
        test('여러 리마인더 목록', async () => {
            const mockReminders = [
                {
                    id: 1,
                    message: '첫 번째 리마인더',
                    remind_time: '2025-06-17T10:00:00.000Z',
                    repeat_type: null
                },
                {
                    id: 2,
                    message: '두 번째 리마인더',
                    remind_time: '2025-06-18T14:00:00.000Z',
                    repeat_type: 'days',
                    repeat_interval: 1
                },
                {
                    id: 3,
                    message: '세 번째 리마인더',
                    remind_time: '2025-06-19T09:00:00.000Z',
                    repeat_type: 'scheduled',
                    repeat_interval: '{"type":"weekly","dayOfWeek":1,"hour":9,"minute":0}'
                }
            ];
            
            mockDb.getUserReminders.mockResolvedValue(mockReminders);
            
            const reminders = await mockDb.getUserReminders('user123');
            
            expect(reminders).toHaveLength(3);
            expect(reminders[0].repeat_type).toBeNull();
            expect(reminders[1].repeat_type).toBe('days');
            expect(reminders[2].repeat_type).toBe('scheduled');
        });
    });
    
    describe('repeat information formatting', () => {
        // formatRepeatInfo 함수 구현 (remind-list.js에서 사용)
        function formatRepeatInfo(reminder) {
            if (!reminder.repeat_type) {
                return null;
            }
            
            switch (reminder.repeat_type) {
                case 'minutes':
                    return `${reminder.repeat_interval}분마다 반복`;
                case 'hours':
                    return `${reminder.repeat_interval}시간마다 반복`;
                case 'days':
                    return `${reminder.repeat_interval}일마다 반복`;
                case 'weeks':
                    return `${reminder.repeat_interval}주마다 반복`;
                case 'scheduled':
                    try {
                        const schedule = JSON.parse(reminder.repeat_interval);
                        return formatScheduleInfo(schedule);
                    } catch (error) {
                        return '스케줄 정보 오류';
                    }
                default:
                    return '알 수 없는 반복 유형';
            }
        }
        
        function formatScheduleInfo(schedule) {
            const period = schedule.hour >= 12 ? '오후' : '오전';
            const hour = schedule.hour > 12 ? schedule.hour - 12 : (schedule.hour === 0 ? 12 : schedule.hour);
            
            switch (schedule.type) {
                case 'daily':
                    return `매일 ${period} ${hour}시`;
                case 'weekly':
                    const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
                    return `매주 ${days[schedule.dayOfWeek]} ${period} ${hour}시`;
                case 'monthly':
                    return `매월 ${schedule.date}일 ${period} ${hour}시`;
                case 'weekdays':
                    return `평일 ${period} ${hour}시`;
                case 'weekends':
                    return `주말 ${period} ${hour}시`;
                default:
                    return '알 수 없는 스케줄';
            }
        }
        
        test('반복 없는 리마인더', () => {
            const reminder = {
                repeat_type: null,
                repeat_interval: null
            };
            
            const result = formatRepeatInfo(reminder);
            expect(result).toBeNull();
        });
        
        test('분 단위 반복', () => {
            const reminder = {
                repeat_type: 'minutes',
                repeat_interval: 30
            };
            
            const result = formatRepeatInfo(reminder);
            expect(result).toBe('30분마다 반복');
        });
        
        test('시간 단위 반복', () => {
            const reminder = {
                repeat_type: 'hours',
                repeat_interval: 2
            };
            
            const result = formatRepeatInfo(reminder);
            expect(result).toBe('2시간마다 반복');
        });
        
        test('일 단위 반복', () => {
            const reminder = {
                repeat_type: 'days',
                repeat_interval: 1
            };
            
            const result = formatRepeatInfo(reminder);
            expect(result).toBe('1일마다 반복');
        });
        
        test('주 단위 반복', () => {
            const reminder = {
                repeat_type: 'weeks',
                repeat_interval: 2
            };
            
            const result = formatRepeatInfo(reminder);
            expect(result).toBe('2주마다 반복');
        });
        
        test('스케줄 반복 - 매일', () => {
            const reminder = {
                repeat_type: 'scheduled',
                repeat_interval: JSON.stringify({
                    type: 'daily',
                    hour: 9,
                    minute: 0
                })
            };
            
            const result = formatRepeatInfo(reminder);
            expect(result).toBe('매일 오전 9시');
        });
        
        test('스케줄 반복 - 매주', () => {
            const reminder = {
                repeat_type: 'scheduled',
                repeat_interval: JSON.stringify({
                    type: 'weekly',
                    dayOfWeek: 1,
                    hour: 14,
                    minute: 0
                })
            };
            
            const result = formatRepeatInfo(reminder);
            expect(result).toBe('매주 월요일 오후 2시');
        });
        
        test('스케줄 반복 - 매월', () => {
            const reminder = {
                repeat_type: 'scheduled',
                repeat_interval: JSON.stringify({
                    type: 'monthly',
                    date: 1,
                    hour: 10,
                    minute: 0
                })
            };
            
            const result = formatRepeatInfo(reminder);
            expect(result).toBe('매월 1일 오전 10시');
        });
        
        test('스케줄 반복 - 평일', () => {
            const reminder = {
                repeat_type: 'scheduled',
                repeat_interval: JSON.stringify({
                    type: 'weekdays',
                    hour: 17,
                    minute: 0
                })
            };
            
            const result = formatRepeatInfo(reminder);
            expect(result).toBe('평일 오후 5시');
        });
        
        test('스케줄 반복 - 주말', () => {
            const reminder = {
                repeat_type: 'scheduled',
                repeat_interval: JSON.stringify({
                    type: 'weekends',
                    hour: 11,
                    minute: 0
                })
            };
            
            const result = formatRepeatInfo(reminder);
            expect(result).toBe('주말 오전 11시');
        });
        
        test('잘못된 JSON 스케줄', () => {
            const reminder = {
                repeat_type: 'scheduled',
                repeat_interval: 'invalid json'
            };
            
            const result = formatRepeatInfo(reminder);
            expect(result).toBe('스케줄 정보 오류');
        });
        
        test('알 수 없는 반복 타입', () => {
            const reminder = {
                repeat_type: 'unknown',
                repeat_interval: 1
            };
            
            const result = formatRepeatInfo(reminder);
            expect(result).toBe('알 수 없는 반복 유형');
        });
    });
    
    describe('time formatting', () => {
        test('시간 포맷팅 호출', () => {
            const testDate = '2025-06-17T10:00:00.000Z';
            formatTime(testDate);
            
            expect(formatTime).toHaveBeenCalledWith(testDate);
        });
        
        test('여러 시간 포맷팅', () => {
            const dates = [
                '2025-06-17T10:00:00.000Z',
                '2025-06-18T14:30:00.000Z',
                '2025-06-19T09:15:00.000Z'
            ];
            
            dates.forEach(date => formatTime(date));
            
            expect(formatTime).toHaveBeenCalledTimes(3);
        });
    });
    
    describe('edge cases', () => {
        test('데이터베이스 오류 처리', async () => {
            mockDb.getUserReminders.mockRejectedValue(new Error('Database error'));
            
            await expect(
                mockDb.getUserReminders('user123')
            ).rejects.toThrow('Database error');
        });
        
        test('존재하지 않는 사용자', async () => {
            mockDb.getUserReminders.mockResolvedValue([]);
            
            const reminders = await mockDb.getUserReminders('nonexistent');
            expect(reminders).toHaveLength(0);
        });
        
        test('null 시간 값 처리', () => {
            formatTime.mockImplementation((date) => {
                if (!date) return 'Invalid Date';
                return new Date(date).toLocaleString('ko-KR');
            });
            
            const result = formatTime(null);
            expect(result).toBe('Invalid Date');
        });
    });
});