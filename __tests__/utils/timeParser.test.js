const { parseTime, isValidTime, formatTime } = require('../../src/utils/timeParser');

describe('timeParser', () => {
    describe('parseTime', () => {
        const mockNow = new Date('2025-06-16T18:36:00+09:00'); // 2025년 6월 16일 월요일 오후 6시 36분
        
        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(mockNow);
        });
        
        afterEach(() => {
            jest.useRealTimers();
            jest.restoreAllMocks();
        });
        
        describe('상대적 시간 파싱', () => {
            test('30분 후', () => {
                const result = parseTime('30분');
                expect(result).toBeInstanceOf(Date);
                expect(result.getMinutes()).toBe(6); // 36 + 30 = 66, 66 % 60 = 6
                expect(result.getHours()).toBe(19); // 시간이 올라감
            });
            
            test('2시간 후', () => {
                const result = parseTime('2시간');
                expect(result).toBeInstanceOf(Date);
                expect(result.getHours()).toBe(20); // 18 + 2 = 20
            });
            
            test('3일 후', () => {
                const result = parseTime('3일');
                expect(result).toBeInstanceOf(Date);
                expect(result.getDate()).toBe(19); // 16 + 3 = 19
            });
        });
        
        describe('절대적 시간 파싱', () => {
            test('내일 9시', () => {
                const result = parseTime('내일 9시');
                expect(result).toBeInstanceOf(Date);
                expect(result.getDate()).toBe(17); // 다음 날
                expect(result.getHours()).toBe(9);
                expect(result.getMinutes()).toBe(0);
            });
            
            test('내일 14시', () => {
                const result = parseTime('내일 14시');
                expect(result).toBeInstanceOf(Date);
                expect(result.getDate()).toBe(17);
                expect(result.getHours()).toBe(14);
            });
            
            test('오늘 22시 (미래)', () => {
                const result = parseTime('오늘 22시');
                expect(result).toBeInstanceOf(Date);
                expect(result.getDate()).toBe(16); // 오늘
                expect(result.getHours()).toBe(22);
            });
            
            test('오늘 10시 (과거, 내일로 설정)', () => {
                const result = parseTime('오늘 10시');
                expect(result).toBeInstanceOf(Date);
                expect(result.getDate()).toBe(17); // 내일로 설정
                expect(result.getHours()).toBe(10);
            });
            
            test('0시 (자정)', () => {
                const result = parseTime('0시');
                expect(result).toBeInstanceOf(Date);
                expect(result.getHours()).toBe(0);
            });
            
            test('12시 (정오)', () => {
                const result = parseTime('12시');
                expect(result).toBeInstanceOf(Date);
                expect(result.getHours()).toBe(12);
            });
            
            test('24시 이상 (에러)', () => {
                const result = parseTime('24시');
                expect(result).toBeNull();
            });
            
            test('내일 25시 (에러)', () => {
                const result = parseTime('내일 25시');
                expect(result).toBeNull();
            });
        });
        
        describe('시간과 분 조합 파싱', () => {
            test('오늘 2시 50분', () => {
                const result = parseTime('오늘 2시 50분');
                expect(result).toBeInstanceOf(Date);
                expect(result.getHours()).toBe(2);
                expect(result.getMinutes()).toBe(50);
                expect(result.getDate()).toBe(17); // 과거 시간이므로 내일로 설정
            });
            
            test('내일 14시 30분', () => {
                const result = parseTime('내일 14시 30분');
                expect(result).toBeInstanceOf(Date);
                expect(result.getDate()).toBe(17);
                expect(result.getHours()).toBe(14);
                expect(result.getMinutes()).toBe(30);
            });
            
            test('23시 59분 (미래)', () => {
                const result = parseTime('23시 59분');
                expect(result).toBeInstanceOf(Date);
                expect(result.getDate()).toBe(16); // 오늘
                expect(result.getHours()).toBe(23);
                expect(result.getMinutes()).toBe(59);
            });
            
            test('2시 50분 (단독)', () => {
                const result = parseTime('2시 50분');
                expect(result).toBeInstanceOf(Date);
                expect(result.getHours()).toBe(2);
                expect(result.getMinutes()).toBe(50);
                expect(result.getDate()).toBe(17); // 과거 시간이므로 내일로 설정
            });
        });
        
        describe('잘못된 입력', () => {
            test('빈 문자열', () => {
                const result = parseTime('');
                expect(result).toBeNull();
            });
            
            test('인식할 수 없는 형식', () => {
                const result = parseTime('알 수 없는 시간');
                expect(result).toBeNull();
            });
            
            test('숫자만', () => {
                const result = parseTime('123');
                expect(result).toBeNull();
            });
        });
    });
    
    describe('isValidTime', () => {
        const mockNow = new Date('2025-06-16T18:36:00+09:00');
        
        beforeEach(() => {
            jest.useFakeTimers();
            jest.setSystemTime(mockNow);
        });
        
        afterEach(() => {
            jest.restoreAllMocks();
        });
        
        test('null 입력', () => {
            expect(isValidTime(null)).toBe(false);
        });
        
        test('undefined 입력', () => {
            expect(isValidTime(undefined)).toBe(false);
        });
        
        test('과거 시간', () => {
            const pastTime = new Date('2025-06-16T10:00:00+09:00');
            expect(isValidTime(pastTime)).toBe(false);
        });
        
        test('미래 시간 (유효)', () => {
            const futureTime = new Date('2025-06-17T10:00:00+09:00');
            expect(isValidTime(futureTime)).toBe(true);
        });
        
        test('1년 후 (경계선)', () => {
            const oneYearLater = new Date('2026-06-16T18:36:00+09:00');
            expect(isValidTime(oneYearLater)).toBe(false);
        });
        
        test('1년 내 미래 시간', () => {
            const validFutureTime = new Date('2026-01-01T00:00:00+09:00');
            expect(isValidTime(validFutureTime)).toBe(true);
        });
    });
    
    describe('formatTime', () => {
        test('일반적인 날짜 포맷팅', () => {
            const testDate = new Date('2025-06-16T15:30:00+09:00');
            const result = formatTime(testDate);
            expect(result).toBe('2025년 6월 16일 15:30');
        });
        
        test('오전 시간 포맷팅', () => {
            const testDate = new Date('2025-12-25T09:15:00+09:00');
            const result = formatTime(testDate);
            expect(result).toBe('2025년 12월 25일 09:15');
        });
        
        test('자정 포맷팅', () => {
            const testDate = new Date('2025-01-01T00:00:00+09:00');
            const result = formatTime(testDate);
            expect(result).toBe('2025년 1월 1일 00:00');
        });
        
        test('정오 포맷팅', () => {
            const testDate = new Date('2025-06-16T12:00:00+09:00');
            const result = formatTime(testDate);
            expect(result).toBe('2025년 6월 16일 12:00');
        });
    });
});