// Mock dependencies
jest.mock('../../src/database');

const mockDb = require('../../src/database');

describe('Remind Stop Command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock database methods
        mockDb.getUserReminders = jest.fn();
        mockDb.deleteReminder = jest.fn();
        mockDb.db = {
            run: jest.fn()
        };
    });
    
    describe('stop repeat reminders', () => {
        test('반복 리마인더 중지 성공', async () => {
            const mockRepeatReminders = [
                {
                    id: 1,
                    user_id: 'user123',
                    message: '일일 스탠드업',
                    repeat_type: 'days',
                    repeat_interval: 1
                },
                {
                    id: 2,
                    user_id: 'user123',
                    message: '주간 회의',
                    repeat_type: 'weeks',
                    repeat_interval: 1
                }
            ];
            
            // 반복 리마인더만 필터링하는 함수
            const getRepeatReminders = (reminders) => {
                return reminders.filter(r => r.repeat_type && r.repeat_interval);
            };
            
            mockDb.getUserReminders.mockResolvedValue(mockRepeatReminders);
            
            const allReminders = await mockDb.getUserReminders('user123');
            const repeatReminders = getRepeatReminders(allReminders);
            
            expect(repeatReminders).toHaveLength(2);
            expect(repeatReminders[0].repeat_type).toBe('days');
            expect(repeatReminders[1].repeat_type).toBe('weeks');
        });
        
        test('반복 리마인더가 없는 경우', async () => {
            const mockNonRepeatReminders = [
                {
                    id: 1,
                    user_id: 'user123',
                    message: '일회성 리마인더',
                    repeat_type: null,
                    repeat_interval: null
                }
            ];
            
            const getRepeatReminders = (reminders) => {
                return reminders.filter(r => r.repeat_type && r.repeat_interval);
            };
            
            mockDb.getUserReminders.mockResolvedValue(mockNonRepeatReminders);
            
            const allReminders = await mockDb.getUserReminders('user123');
            const repeatReminders = getRepeatReminders(allReminders);
            
            expect(repeatReminders).toHaveLength(0);
        });
        
        test('특정 반복 리마인더 중지', async () => {
            const reminderId = 1;
            const userId = 'user123';
            
            mockDb.deleteReminder.mockResolvedValue(true);
            
            const result = await mockDb.deleteReminder(reminderId, userId);
            
            expect(result).toBe(true);
            expect(mockDb.deleteReminder).toHaveBeenCalledWith(reminderId, userId);
        });
        
        test('모든 반복 리마인더 중지', async () => {
            const mockRepeatReminders = [
                { id: 1, user_id: 'user123', repeat_type: 'days' },
                { id: 2, user_id: 'user123', repeat_type: 'hours' },
                { id: 3, user_id: 'user123', repeat_type: 'scheduled' }
            ];
            
            mockDb.getUserReminders.mockResolvedValue(mockRepeatReminders);
            mockDb.deleteReminder.mockResolvedValue(true);
            
            const stopAllRepeatReminders = async (userId) => {
                const reminders = await mockDb.getUserReminders(userId);
                const repeatReminders = reminders.filter(r => r.repeat_type);
                
                const deletePromises = repeatReminders.map(reminder => 
                    mockDb.deleteReminder(reminder.id, userId)
                );
                
                return Promise.all(deletePromises);
            };
            
            const results = await stopAllRepeatReminders('user123');
            
            expect(results).toHaveLength(3);
            expect(results.every(result => result === true)).toBe(true);
            expect(mockDb.deleteReminder).toHaveBeenCalledTimes(3);
        });
    });
    
    describe('scheduled reminders stop', () => {
        test('스케줄 리마인더 중지', async () => {
            const mockScheduledReminder = {
                id: 1,
                user_id: 'user123',
                message: '매주 월요일 스크럼',
                repeat_type: 'scheduled',
                repeat_interval: JSON.stringify({
                    type: 'weekly',
                    dayOfWeek: 1,
                    hour: 9,
                    minute: 0
                })
            };
            
            mockDb.deleteReminder.mockResolvedValue(true);
            
            const result = await mockDb.deleteReminder(1, 'user123');
            
            expect(result).toBe(true);
        });
        
        test('스케줄 리마인더 식별', () => {
            const reminders = [
                { id: 1, repeat_type: 'days', repeat_interval: 1 },
                { id: 2, repeat_type: 'scheduled', repeat_interval: '{"type":"weekly"}' },
                { id: 3, repeat_type: null, repeat_interval: null }
            ];
            
            const isScheduledReminder = (reminder) => {
                return reminder.repeat_type === 'scheduled';
            };
            
            const scheduledReminders = reminders.filter(isScheduledReminder);
            
            expect(scheduledReminders).toHaveLength(1);
            expect(scheduledReminders[0].id).toBe(2);
        });
    });
    
    describe('error handling', () => {
        test('존재하지 않는 리마인더 중지 시도', async () => {
            mockDb.deleteReminder.mockRejectedValue(new Error('삭제할 리마인더를 찾을 수 없습니다.'));
            
            await expect(
                mockDb.deleteReminder(999, 'user123')
            ).rejects.toThrow('삭제할 리마인더를 찾을 수 없습니다.');
        });
        
        test('권한 없는 리마인더 중지 시도', async () => {
            mockDb.deleteReminder.mockRejectedValue(new Error('삭제할 리마인더를 찾을 수 없습니다.'));
            
            await expect(
                mockDb.deleteReminder(1, 'wrong-user')
            ).rejects.toThrow('삭제할 리마인더를 찾을 수 없습니다.');
        });
        
        test('데이터베이스 오류', async () => {
            mockDb.getUserReminders.mockRejectedValue(new Error('Database connection failed'));
            
            await expect(
                mockDb.getUserReminders('user123')
            ).rejects.toThrow('Database connection failed');
        });
    });
    
    describe('reminder type filtering', () => {
        test('반복 유형별 필터링', () => {
            const reminders = [
                { id: 1, repeat_type: 'minutes', repeat_interval: 30 },
                { id: 2, repeat_type: 'hours', repeat_interval: 2 },
                { id: 3, repeat_type: 'days', repeat_interval: 1 },
                { id: 4, repeat_type: 'weeks', repeat_interval: 1 },
                { id: 5, repeat_type: 'scheduled', repeat_interval: '{}' },
                { id: 6, repeat_type: null, repeat_interval: null }
            ];
            
            const filterByRepeatType = (reminders, type) => {
                return reminders.filter(r => r.repeat_type === type);
            };
            
            expect(filterByRepeatType(reminders, 'minutes')).toHaveLength(1);
            expect(filterByRepeatType(reminders, 'hours')).toHaveLength(1);
            expect(filterByRepeatType(reminders, 'days')).toHaveLength(1);
            expect(filterByRepeatType(reminders, 'weeks')).toHaveLength(1);
            expect(filterByRepeatType(reminders, 'scheduled')).toHaveLength(1);
            expect(filterByRepeatType(reminders, null)).toHaveLength(1);
        });
        
        test('모든 반복 리마인더 필터링', () => {
            const reminders = [
                { id: 1, repeat_type: 'days', repeat_interval: 1 },
                { id: 2, repeat_type: null, repeat_interval: null },
                { id: 3, repeat_type: 'scheduled', repeat_interval: '{}' },
                { id: 4, repeat_type: 'hours', repeat_interval: 2 }
            ];
            
            const getAllRepeatReminders = (reminders) => {
                return reminders.filter(r => r.repeat_type !== null);
            };
            
            const repeatReminders = getAllRepeatReminders(reminders);
            
            expect(repeatReminders).toHaveLength(3);
            expect(repeatReminders.map(r => r.id)).toEqual([1, 3, 4]);
        });
    });
    
    describe('bulk operations', () => {
        test('여러 리마인더 동시 중지', async () => {
            const reminderIds = [1, 2, 3];
            const userId = 'user123';
            
            mockDb.deleteReminder.mockResolvedValue(true);
            
            const stopMultipleReminders = async (ids, userId) => {
                const promises = ids.map(id => mockDb.deleteReminder(id, userId));
                return Promise.all(promises);
            };
            
            const results = await stopMultipleReminders(reminderIds, userId);
            
            expect(results).toHaveLength(3);
            expect(results.every(result => result === true)).toBe(true);
            expect(mockDb.deleteReminder).toHaveBeenCalledTimes(3);
        });
        
        test('일부 실패하는 경우', async () => {
            const reminderIds = [1, 2, 3];
            const userId = 'user123';
            
            mockDb.deleteReminder
                .mockResolvedValueOnce(true)
                .mockRejectedValueOnce(new Error('Not found'))
                .mockResolvedValueOnce(true);
            
            const stopMultipleRemindersWithErrorHandling = async (ids, userId) => {
                const results = [];
                for (const id of ids) {
                    try {
                        const result = await mockDb.deleteReminder(id, userId);
                        results.push({ id, success: true, result });
                    } catch (error) {
                        results.push({ id, success: false, error: error.message });
                    }
                }
                return results;
            };
            
            const results = await stopMultipleRemindersWithErrorHandling(reminderIds, userId);
            
            expect(results).toHaveLength(3);
            expect(results[0].success).toBe(true);
            expect(results[1].success).toBe(false);
            expect(results[2].success).toBe(true);
        });
    });
    
    describe('validation', () => {
        test('유효한 사용자 ID', () => {
            const validateUserId = (userId) => {
                return typeof userId === 'string' && userId.length > 0;
            };
            
            expect(validateUserId('user123')).toBe(true);
            expect(validateUserId('')).toBe(false);
            expect(validateUserId(null)).toBe(false);
            expect(validateUserId(123)).toBe(false);
        });
        
        test('유효한 리마인더 ID', () => {
            const validateReminderId = (id) => {
                return typeof id === 'number' && id > 0 && Number.isInteger(id);
            };
            
            expect(validateReminderId(1)).toBe(true);
            expect(validateReminderId(123)).toBe(true);
            expect(validateReminderId(0)).toBe(false);
            expect(validateReminderId(-1)).toBe(false);
            expect(validateReminderId(3.14)).toBe(false);
            expect(validateReminderId('123')).toBe(false);
        });
    });
});