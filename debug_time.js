// 시간 디버깅 스크립트
const { parseTime, formatTime } = require('./src/utils/timeParser');

function debugTimeConversion() {
    console.log('=== 시간 변환 디버깅 ===');
    
    const testInputs = ['15시 50분', '19일 15시 50분', '내일 15시 50분'];
    
    testInputs.forEach(input => {
        console.log(`\n입력: "${input}"`);
        
        const parsed = parseTime(input);
        if (parsed) {
            console.log('파싱 결과 (로컬):', parsed.toString());
            console.log('파싱 결과 (ISO):', parsed.toISOString());
            
            // UTC 변환 (저장용)
            const utcForDB = new Date(parsed.getTime() - (9 * 60 * 60 * 1000));
            console.log('DB 저장용 UTC:', utcForDB.toISOString());
            
            // 다시 KST로 변환 (표시용)
            const kstForDisplay = new Date(utcForDB.getTime() + (9 * 60 * 60 * 1000));
            console.log('표시용 KST:', formatTime(kstForDisplay));
        } else {
            console.log('파싱 실패');
        }
    });
    
    console.log('\n=== 현재 시간 정보 ===');
    const now = new Date();
    console.log('현재 로컬:', now.toString());
    console.log('현재 UTC:', now.toISOString());
    console.log('시간대 오프셋:', now.getTimezoneOffset(), '분');
}

debugTimeConversion();