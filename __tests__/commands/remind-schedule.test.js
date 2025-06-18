const { formatTime } = require('../../src/utils/timeParser');

// remind-schedule.js에서 함수들을 추출
function parseSchedule(scheduleString) {
    const input = scheduleString.trim();
    
    // 매일 + 시간
    const dailyMatch = input.match(/매일[-\s]?(오전|오후)(\d+)시/);
    if (dailyMatch) {
        const period = dailyMatch[1];
        let hour = parseInt(dailyMatch[2]);
        if (period === '오후' && hour !== 12) hour += 12;
        if (period === '오전' && hour === 12) hour = 0;
        
        return {
            type: 'daily',
            hour: hour,
            minute: 0
        };
    }
    
    // 매주 + 요일 + 시간
    const weeklyMatch = input.match(/매주[-\s]?(월요일|화요일|수요일|목요일|금요일|토요일|일요일)[-\s]?(오전|오후)(\d+)시/);
    if (weeklyMatch) {
        const dayName = weeklyMatch[1];
        const period = weeklyMatch[2];
        let hour = parseInt(weeklyMatch[3]);
        if (period === '오후' && hour !== 12) hour += 12;
        if (period === '오전' && hour === 12) hour = 0;
        
        const dayMap = {
            '일요일': 0, '월요일': 1, '화요일': 2, '수요일': 3,
            '목요일': 4, '금요일': 5, '토요일': 6
        };
        
        return {
            type: 'weekly',
            dayOfWeek: dayMap[dayName],
            hour: hour,
            minute: 0
        };
    }
    
    // 매월 + 일 + 시간
    const monthlyMatch = input.match(/매월[-\s]?(\d+)일[-\s]?(오전|오후)(\d+)시/);
    if (monthlyMatch) {
        const date = parseInt(monthlyMatch[1]);
        const period = monthlyMatch[2];
        let hour = parseInt(monthlyMatch[3]);
        if (period === '오후' && hour !== 12) hour += 12;
        if (period === '오전' && hour === 12) hour = 0;
        
        return {
            type: 'monthly',
            date: date,
            hour: hour,
            minute: 0
        };
    }
    
    // 평일 (월~금)
    const weekdayMatch = input.match(/평일[-\s]?(오전|오후)(\d+)시/);
    if (weekdayMatch) {
        const period = weekdayMatch[1];
        let hour = parseInt(weekdayMatch[2]);
        if (period === '오후' && hour !== 12) hour += 12;
        if (period === '오전' && hour === 12) hour = 0;
        
        return {
            type: 'weekdays',
            hour: hour,
            minute: 0
        };
    }
    
    // 주말 (토,일)
    const weekendMatch = input.match(/주말[-\s]?(오전|오후)(\d+)시/);
    if (weekendMatch) {
        const period = weekendMatch[1];
        let hour = parseInt(weekendMatch[2]);
        if (period === '오후' && hour !== 12) hour += 12;
        if (period === '오전' && hour === 12) hour = 0;
        
        return {
            type: 'weekends',
            hour: hour,
            minute: 0
        };
    }
    
    return null;
}

function calculateNextScheduledTime(schedule, currentTime = new Date()) {
    const now = currentTime;
    const nextTime = new Date(now);
    
    switch (schedule.type) {
        case 'daily':
            nextTime.setHours(schedule.hour, schedule.minute, 0, 0);
            if (nextTime <= now) {
                nextTime.setDate(nextTime.getDate() + 1);
            }
            break;
            
        case 'weekly':
            const currentDay = now.getDay();
            const targetDay = schedule.dayOfWeek;
            let daysUntilTarget = targetDay - currentDay;
            
            if (daysUntilTarget < 0) {
                daysUntilTarget += 7;
            } else if (daysUntilTarget === 0) {
                // 같은 요일인 경우 시간 확인
                const tempTime = new Date(now);
                tempTime.setHours(schedule.hour, schedule.minute, 0, 0);
                if (tempTime <= now) {
                    daysUntilTarget = 7;
                }
            }
            
            nextTime.setDate(now.getDate() + daysUntilTarget);
            nextTime.setHours(schedule.hour, schedule.minute, 0, 0);
            break;
            
        case 'monthly':
            nextTime.setDate(schedule.date);
            nextTime.setHours(schedule.hour, schedule.minute, 0, 0);
            
            if (nextTime <= now || schedule.date > new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) {
                nextTime.setMonth(nextTime.getMonth() + 1);
                // 다음 달에 해당 날짜가 없는 경우 마지막 날로 설정
                const lastDayOfMonth = new Date(nextTime.getFullYear(), nextTime.getMonth() + 1, 0).getDate();
                if (schedule.date > lastDayOfMonth) {
                    nextTime.setDate(lastDayOfMonth);
                }
            }
            break;
            
        case 'weekdays':
            nextTime.setHours(schedule.hour, schedule.minute, 0, 0);
            
            // 평일(월~금)이 될 때까지 하루씩 추가
            if (nextTime <= now) {
                nextTime.setDate(nextTime.getDate() + 1);
            }
            
            while (nextTime.getDay() === 0 || nextTime.getDay() === 6) {
                nextTime.setDate(nextTime.getDate() + 1);
            }
            break;
            
        case 'weekends':
            nextTime.setHours(schedule.hour, schedule.minute, 0, 0);
            
            // 주말(토,일)이 될 때까지 하루씩 추가
            if (nextTime <= now) {
                nextTime.setDate(nextTime.getDate() + 1);
            }
            
            while (nextTime.getDay() !== 0 && nextTime.getDay() !== 6) {
                nextTime.setDate(nextTime.getDate() + 1);
            }
            break;
            
        default:
            return null;
    }
    
    return nextTime;
}

describe('parseSchedule', () => {
    test('매주 월요일 오전11시 파싱', () => {
        const result = parseSchedule('매주-월요일-오전11시');
        expect(result).toEqual({
            type: 'weekly',
            dayOfWeek: 1,
            hour: 11,
            minute: 0
        });
    });
    
    test('매주 월요일 오후8시 파싱', () => {
        const result = parseSchedule('매주-월요일-오후8시');
        expect(result).toEqual({
            type: 'weekly',
            dayOfWeek: 1,
            hour: 20,
            minute: 0
        });
    });
    
    test('매일 오전9시 파싱', () => {
        const result = parseSchedule('매일-오전9시');
        expect(result).toEqual({
            type: 'daily',
            hour: 9,
            minute: 0
        });
    });
    
    test('매월 1일 오전10시 파싱', () => {
        const result = parseSchedule('매월-1일-오전10시');
        expect(result).toEqual({
            type: 'monthly',
            date: 1,
            hour: 10,
            minute: 0
        });
    });
    
    test('평일 오후5시 파싱', () => {
        const result = parseSchedule('평일-오후5시');
        expect(result).toEqual({
            type: 'weekdays',
            hour: 17,
            minute: 0
        });
    });
    
    test('잘못된 형식', () => {
        const result = parseSchedule('잘못된형식');
        expect(result).toBeNull();
    });
});

describe('calculateNextScheduledTime', () => {
    // 테스트 기준 시간: 2025년 6월 16일 월요일 오후 6시 36분
    const testCurrentTime = new Date('2025-06-16T18:36:00+09:00');
    
    test('매주 월요일 오전11시 - 이미 지난 시간이므로 다음 주', () => {
        const schedule = {
            type: 'weekly',
            dayOfWeek: 1, // 월요일
            hour: 11,
            minute: 0
        };
        
        const result = calculateNextScheduledTime(schedule, testCurrentTime);
        
        // 다음 주 월요일 오전 11시여야 함
        expect(result.getDay()).toBe(1); // 월요일
        expect(result.getHours()).toBe(11);
        expect(result.getMinutes()).toBe(0);
        expect(result.getDate()).toBe(23); // 2025-06-23
    });
    
    test('매주 월요일 오후8시 - 오늘 같은 날 이후 시간', () => {
        const schedule = {
            type: 'weekly',
            dayOfWeek: 1, // 월요일
            hour: 20,
            minute: 0
        };
        
        const result = calculateNextScheduledTime(schedule, testCurrentTime);
        
        // 오늘 오후 8시여야 함
        expect(result.getDay()).toBe(1); // 월요일
        expect(result.getHours()).toBe(20);
        expect(result.getMinutes()).toBe(0);
        expect(result.getDate()).toBe(16); // 오늘
    });
    
    test('매주 화요일 오전10시', () => {
        const schedule = {
            type: 'weekly',
            dayOfWeek: 2, // 화요일
            hour: 10,
            minute: 0
        };
        
        const result = calculateNextScheduledTime(schedule, testCurrentTime);
        
        // 내일 화요일 오전 10시여야 함
        expect(result.getDay()).toBe(2); // 화요일
        expect(result.getHours()).toBe(10);
        expect(result.getMinutes()).toBe(0);
        expect(result.getDate()).toBe(17); // 2025-06-17
    });
    
    test('매일 오전9시 - 이미 지난 시간이므로 내일', () => {
        const schedule = {
            type: 'daily',
            hour: 9,
            minute: 0
        };
        
        const result = calculateNextScheduledTime(schedule, testCurrentTime);
        
        // 내일 오전 9시여야 함
        expect(result.getHours()).toBe(9);
        expect(result.getMinutes()).toBe(0);
        expect(result.getDate()).toBe(17); // 2025-06-17
    });
    
    test('매일 오후10시 - 오늘 이후 시간', () => {
        const schedule = {
            type: 'daily',
            hour: 22,
            minute: 0
        };
        
        const result = calculateNextScheduledTime(schedule, testCurrentTime);
        
        // 오늘 오후 10시여야 함
        expect(result.getHours()).toBe(22);
        expect(result.getMinutes()).toBe(0);
        expect(result.getDate()).toBe(16); // 오늘
    });
});