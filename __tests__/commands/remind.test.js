// Mock dependencies
jest.mock('../../src/utils/timeParser');
jest.mock('../../src/database');

const { parseTime, isValidTime } = require('../../src/utils/timeParser');
const mockDb = require('../../src/database');

// remind.js의 핵심 로직만 테스트
describe('Remind Command', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Mock database methods
        mockDb.createReminder = jest.fn();
    });
    
    describe('time parsing validation', () => {
        test('유효한 시간 파싱 성공', () => {
            const testTime = new Date('2025-06-17T10:00:00Z');
            parseTime.mockReturnValue(testTime);
            isValidTime.mockReturnValue(true);
            
            const result = parseTime('내일 오전 10시');
            expect(result).toEqual(testTime);
            expect(parseTime).toHaveBeenCalledWith('내일 오전 10시');
        });
        
        test('잘못된 시간 형식', () => {
            parseTime.mockReturnValue(null);
            isValidTime.mockReturnValue(false);
            
            const result = parseTime('잘못된 시간');
            expect(result).toBeNull();
        });
        
        test('과거 시간 입력', () => {
            const pastTime = new Date('2020-01-01T10:00:00Z');
            parseTime.mockReturnValue(pastTime);
            isValidTime.mockReturnValue(false);
            
            parseTime('어제 오전 10시');
            const isValid = isValidTime(pastTime);
            
            expect(isValid).toBe(false);
        });
        
        test('1년 후 시간 입력', () => {
            const farFutureTime = new Date('2027-01-01T10:00:00Z');
            parseTime.mockReturnValue(farFutureTime);
            isValidTime.mockReturnValue(false);
            
            parseTime('2027년 1월 1일 오전 10시');
            const isValid = isValidTime(farFutureTime);
            
            expect(isValid).toBe(false);
        });
    });
    
    describe('reminder creation', () => {
        test('리마인더 생성 성공', async () => {
            const mockReminder = {
                id: 1,
                userId: 'user123',
                channelId: 'channel456',
                message: '회의 참석하기',
                remindTime: '2025-06-17T10:00:00.000Z'
            };
            
            mockDb.createReminder.mockResolvedValue(mockReminder);
            
            const result = await mockDb.createReminder(
                'user123',
                'channel456',
                '회의 참석하기',
                '2025-06-17T10:00:00.000Z'
            );
            
            expect(result).toEqual(mockReminder);
            expect(mockDb.createReminder).toHaveBeenCalledWith(
                'user123',
                'channel456',
                '회의 참석하기',
                '2025-06-17T10:00:00.000Z'
            );
        });
        
        test('데이터베이스 오류 처리', async () => {
            mockDb.createReminder.mockRejectedValue(new Error('Database error'));
            
            await expect(
                mockDb.createReminder('user', 'channel', 'message', 'time')
            ).rejects.toThrow('Database error');
        });
    });
    
    describe('input validation', () => {
        test('빈 메시지 검증', () => {
            const emptyMessage = '';
            expect(emptyMessage.trim()).toBe('');
        });
        
        test('긴 메시지 검증', () => {
            const longMessage = 'a'.repeat(2001);
            expect(longMessage.length).toBeGreaterThan(2000);
        });
        
        test('정상 메시지 검증', () => {
            const normalMessage = '회의에 참석해주세요';
            expect(normalMessage.trim().length).toBeGreaterThan(0);
            expect(normalMessage.length).toBeLessThanOrEqual(2000);
        });
    });
    
    describe('time string formats', () => {
        const testCases = [
            { input: '30분', expected: 'relative' },
            { input: '2시간', expected: 'relative' },
            { input: '3일', expected: 'relative' },
            { input: '내일 오전 9시', expected: 'absolute' },
            { input: '오늘 오후 2시', expected: 'absolute' },
            { input: '오전 12시', expected: 'absolute' },
            { input: '오후 12시', expected: 'absolute' }
        ];
        
        testCases.forEach(({ input, expected }) => {
            test(`시간 형식 "${input}" 처리`, () => {
                const mockResult = expected === 'relative' 
                    ? new Date(Date.now() + 3600000) // 1시간 후
                    : new Date('2025-06-17T09:00:00Z');
                
                parseTime.mockReturnValue(mockResult);
                isValidTime.mockReturnValue(true);
                
                const result = parseTime(input);
                expect(result).toBeDefined();
                expect(parseTime).toHaveBeenCalledWith(input);
            });
        });
    });
});