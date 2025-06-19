function parseTime(timeString) {
    const now = new Date();
    const input = timeString.trim();
    
    // 상대적 시간 패턴 (절대시간과 구분하기 위해 더 정확한 패턴 사용)
    const minutesMatch = input.match(/^(\d+)분$/);
    const hoursMatch = input.match(/(\d+)시간/);
    const daysMatch = input.match(/(\d+)일/);
    
    // 절대적 시간 패턴
    const tomorrowMatch = input.match(/내일/);
    const todayMatch = input.match(/오늘/);
    const hourMatch = input.match(/(\d+)시/);
    
    // 시간:분 조합 패턴 (예: "2시 50분", "14시 30분")
    const hourMinuteMatch = input.match(/(\d+)시\s*(\d+)분/);
    
    let targetTime = new Date(now);
    
    // 시간:분 조합 처리 (날짜 키워드와 함께 처리)
    if (hourMinuteMatch) {
        let hour = parseInt(hourMinuteMatch[1]);
        let minute = parseInt(hourMinuteMatch[2]);
        
        // 24시간 형식 검증
        if (hour >= 24 || minute >= 60) {
            return null; // 잘못된 시간 형식
        }
        
        targetTime.setHours(hour, minute, 0, 0);
        
        // 날짜 키워드 처리
        if (tomorrowMatch) {
            targetTime.setDate(now.getDate() + 1);
        } else if (todayMatch) {
            // 오늘 지정됨 - 시간 확인 후 필요시 내일로
            if (targetTime <= now) {
                targetTime.setDate(now.getDate() + 1);
            }
        } else {
            // 날짜 키워드 없음 - 이미 지난 시간이면 내일로 설정
            if (targetTime <= now) {
                targetTime.setDate(now.getDate() + 1);
            }
        }
        
        return targetTime;
    }
    
    // 상대적 시간 처리
    if (minutesMatch) {
        const minutes = parseInt(minutesMatch[1]);
        targetTime.setMinutes(now.getMinutes() + minutes);
        return targetTime;
    }
    
    if (hoursMatch) {
        const hours = parseInt(hoursMatch[1]);
        targetTime.setHours(now.getHours() + hours);
        return targetTime;
    }
    
    if (daysMatch) {
        const days = parseInt(daysMatch[1]);
        targetTime.setDate(now.getDate() + days);
        return targetTime;
    }
    
    // 절대적 시간 처리
    if (tomorrowMatch) {
        targetTime.setDate(now.getDate() + 1);
        
        // 내일 + 시간 조합 처리
        if (hourMinuteMatch) {
            let hour = parseInt(hourMinuteMatch[1]);
            let minute = parseInt(hourMinuteMatch[2]);
            
            // 24시간 형식 검증
            if (hour >= 24 || minute >= 60) {
                return null; // 잘못된 시간 형식
            }
            
            targetTime.setHours(hour, minute, 0, 0);
        } else if (hourMatch) {
            let hour = parseInt(hourMatch[1]);
            
            // 24시간 형식 검증
            if (hour >= 24) {
                return null; // 잘못된 시간 형식
            }
            
            targetTime.setHours(hour, 0, 0, 0);
        } else {
            targetTime.setHours(9, 0, 0, 0); // 기본값: 오전 9시
        }
        
        return targetTime;
    }
    
    if (todayMatch || hourMatch || hourMinuteMatch) {
        if (hourMinuteMatch) {
            let hour = parseInt(hourMinuteMatch[1]);
            let minute = parseInt(hourMinuteMatch[2]);
            
            // 24시간 형식 검증
            if (hour >= 24 || minute >= 60) {
                return null; // 잘못된 시간 형식
            }
            
            targetTime.setHours(hour, minute, 0, 0);
            
            // 이미 지난 시간이면 내일로 설정
            if (targetTime <= now) {
                targetTime.setDate(now.getDate() + 1);
            }
            
            return targetTime;
        } else if (hourMatch) {
            let hour = parseInt(hourMatch[1]);
            
            // 24시간 형식 검증
            if (hour >= 24) {
                return null; // 잘못된 시간 형식
            }
            
            targetTime.setHours(hour, 0, 0, 0);
            
            // 이미 지난 시간이면 내일로 설정
            if (targetTime <= now) {
                targetTime.setDate(now.getDate() + 1);
            }
            
            return targetTime;
        }
    }
    
    // 파싱 실패 시 null 반환
    return null;
}

function isValidTime(parsedTime) {
    if (!parsedTime) return false;
    
    const now = new Date();
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    
    // 미래 시간이고 1년 이내인지 확인
    return parsedTime > now && parsedTime < oneYearFromNow;
}

function formatTime(date) {
    const options = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Seoul'
    };
    
    return date.toLocaleDateString('ko-KR', options);
}

module.exports = {
    parseTime,
    isValidTime,
    formatTime
};