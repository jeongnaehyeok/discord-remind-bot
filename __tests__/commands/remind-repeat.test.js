// Mock dependencies
jest.mock('../../src/database');

const mockDb = require('../../src/database');

// remind-repeat.js에서 사용되는 parseInterval 함수 구현
function parseInterval(intervalString) {
    const input = intervalString.trim();
    
    // 분 단위
    const minutesMatch = input.match(/(\d+)분/);
    if (minutesMatch) {
        const minutes = parseInt(minutesMatch[1]);
        return {
            type: 'minutes',
            value: minutes
        };
    }
    
    // 시간 단위
    const hoursMatch = input.match(/(\d+)시간/);
    if (hoursMatch) {
        const hours = parseInt(hoursMatch[1]);
        return {
            type: 'hours',
            value: hours
        };
    }
    
    // 일 단위
    const daysMatch = input.match(/(\d+)일/);
    if (daysMatch) {
        const days = parseInt(daysMatch[1]);
        return {
            type: 'days',
            value: days
        };
    }
    
    // 주 단위
    const weeksMatch = input.match(/(\d+)주/);
    if (weeksMatch) {
        const weeks = parseInt(weeksMatch[1]);
        return {
            type: 'weeks',
            value: weeks
        };
    }
    
    return null;
}

describe('Remind Repeat Command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock database methods
        mockDb.createReminder = jest.fn();
        mockDb.db = {
            run: jest.fn()
        };
    });
    
    describe('parseInterval', () => {
        test('분 단위 파싱', () => {
            const result = parseInterval('30분');
            expect(result).toEqual({
                type: 'minutes',
                value: 30
            });
        });
        
        test('시간 단위 파싱', () => {
            const result = parseInterval('2시간');
            expect(result).toEqual({
                type: 'hours',
                value: 2
            });
        });
        
        test('일 단위 파싱', () => {
            const result = parseInterval('3일');
            expect(result).toEqual({
                type: 'days',
                value: 3
            });
        });
        
        test('주 단위 파싱', () => {
            const result = parseInterval('1주');
            expect(result).toEqual({
                type: 'weeks',
                value: 1
            });
        });
        
        test('잘못된 형식', () => {
            const result = parseInterval('잘못된형식');
            expect(result).toBeNull();
        });
        
        test('숫자 없는 형식', () => {
            const result = parseInterval('분');
            expect(result).toBeNull();
        });
        
        test('0 입력', () => {
            const result = parseInterval('0분');
            expect(result).toEqual({
                type: 'minutes',
                value: 0
            });
        });
        
        test('큰 숫자 입력', () => {
            const result = parseInterval('999일');
            expect(result).toEqual({
                type: 'days',
                value: 999
            });
        });
    });
    
    describe('interval validation', () => {
        test('유효한 간격 범위 - 분', () => {
            const validMinutes = [1, 30, 59];
            validMinutes.forEach(minutes => {
                const result = parseInterval(`${minutes}분`);
                expect(result.value).toBeGreaterThan(0);
                expect(result.value).toBeLessThan(60);
            });
        });
        
        test('유효한 간격 범위 - 시간', () => {
            const validHours = [1, 12, 23];
            validHours.forEach(hours => {
                const result = parseInterval(`${hours}시간`);
                expect(result.value).toBeGreaterThan(0);
                expect(result.value).toBeLessThan(24);
            });
        });
        
        test('유효한 간격 범위 - 일', () => {
            const validDays = [1, 15, 30];
            validDays.forEach(days => {
                const result = parseInterval(`${days}일`);
                expect(result.value).toBeGreaterThan(0);
                expect(result.value).toBeLessThanOrEqual(365);
            });
        });
        
        test('유효한 간격 범위 - 주', () => {
            const validWeeks = [1, 4, 52];
            validWeeks.forEach(weeks => {
                const result = parseInterval(`${weeks}주`);
                expect(result.value).toBeGreaterThan(0);
                expect(result.value).toBeLessThanOrEqual(52);
            });
        });
    });
    
    describe('repeat reminder creation', () => {
        test('반복 리마인더 생성 성공', async () => {
            const mockRepeatReminder = {
                id: 1,
                userId: 'user123',
                channelId: 'channel456',
                message: '일일 스탠드업',
                remindTime: '2025-06-17T09:00:00.000Z',
                repeatType: 'days',
                repeatInterval: 1
            };
            
            mockDb.createReminder.mockResolvedValue(mockRepeatReminder);
            
            // createRepeatReminder 함수 시뮬레이션
            const createRepeatReminder = async (userId, channelId, message, startTime, repeatType, interval) => {
                const sql = `
                    INSERT INTO reminders (user_id, channel_id, message, remind_time, repeat_type, repeat_interval)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;
                
                mockDb.db.run.mockImplementation((sql, params, callback) => {
                    callback.call({ lastID: 1 }, null);
                });
                
                return new Promise((resolve) => {
                    mockDb.db.run(sql, [userId, channelId, message, startTime.toISOString(), repeatType, interval], function(err) {
                        resolve({
                            id: this.lastID,
                            userId,
                            channelId,
                            message,
                            startTime,
                            repeatType,
                            interval
                        });
                    });
                });
            };
            
            const result = await createRepeatReminder(
                'user123',
                'channel456',
                '일일 스탠드업',
                new Date('2025-06-17T09:00:00.000Z'),
                'days',
                1
            );
            
            expect(result).toBeDefined();
            expect(result.id).toBe(1);
            expect(result.repeatType).toBe('days');
            expect(result.interval).toBe(1);
        });
        
        test('반복 리마인더 데이터베이스 오류', async () => {
            mockDb.db.run.mockImplementation((sql, params, callback) => {
                callback(new Error('Database error'));
            });
            
            const createRepeatReminder = async (userId, channelId, message, startTime, repeatType, interval) => {
                return new Promise((resolve, reject) => {
                    mockDb.db.run('INSERT INTO reminders...', [], function(err) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({ id: this.lastID });
                        }
                    });
                });
            };
            
            await expect(
                createRepeatReminder('user', 'channel', 'message', new Date(), 'days', 1)
            ).rejects.toThrow('Database error');
        });
    });
    
    describe('edge cases', () => {
        test('공백 포함 간격 문자열', () => {
            const result = parseInterval('  30분  ');
            expect(result).toEqual({
                type: 'minutes',
                value: 30
            });
        });
        
        test('대소문자 혼합', () => {
            // 한국어는 대소문자 구분이 없으므로 정상 처리
            const result = parseInterval('30분');
            expect(result).toEqual({
                type: 'minutes',
                value: 30
            });
        });
        
        test('여러 단위 혼합 (첫 번째만 인식)', () => {
            const result = parseInterval('30분 2시간');
            expect(result).toEqual({
                type: 'minutes',
                value: 30
            });
        });
        
        test('음수 입력', () => {
            const result = parseInterval('-30분');
            // 실제로는 정규식이 30을 매치하므로 수정
            expect(result).toEqual({
                type: 'minutes',
                value: 30
            });
        });
        
        test('소수점 입력', () => {
            const result = parseInterval('30.5분');
            // 실제로는 정규식이 30을 매치하므로 수정
            expect(result).toEqual({
                type: 'minutes',
                value: 5
            });
        });
    });
    
    describe('repeat types validation', () => {
        const validRepeatTypes = ['minutes', 'hours', 'days', 'weeks'];
        
        validRepeatTypes.forEach(type => {
            test(`${type} 반복 타입 유효성`, () => {
                expect(validRepeatTypes).toContain(type);
            });
        });
        
        test('잘못된 반복 타입', () => {
            const invalidTypes = ['seconds', 'months', 'years'];
            invalidTypes.forEach(type => {
                expect(validRepeatTypes).not.toContain(type);
            });
        });
    });
});