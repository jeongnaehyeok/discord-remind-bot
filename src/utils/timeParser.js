function parseTime(timeString) {
    const now = new Date();
    const input = timeString.trim();
    
    // 상대적 시간 패턴
    const minutesMatch = input.match(/(\d+)분/);
    const hoursMatch = input.match(/(\d+)시간/);
    const daysMatch = input.match(/(\d+)일/);
    
    // 절대적 시간 패턴
    const tomorrowMatch = input.match(/내일/);
    const todayMatch = input.match(/오늘/);
    const hourMatch = input.match(/(\d+)시/);
    
    let targetTime = new Date(now);
    
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
        if (hourMatch) {
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
    
    if (todayMatch || hourMatch) {
        if (hourMatch) {
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