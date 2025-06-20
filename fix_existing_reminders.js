// 기존 리마인더 시간 수정 스크립트
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// 로컬 DB 경로 (테스트용)
const dbPath = './data/reminders.db';

function fixExistingReminders() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('데이터베이스 연결 실패:', err.message);
                reject(err);
                return;
            }
            
            console.log('데이터베이스 연결 성공');
            
            // 기존 리마인더 조회
            db.all("SELECT * FROM reminders", [], (err, rows) => {
                if (err) {
                    console.error('리마인더 조회 실패:', err.message);
                    reject(err);
                    return;
                }
                
                console.log(`총 ${rows.length}개의 리마인더 발견`);
                
                if (rows.length === 0) {
                    console.log('수정할 리마인더가 없습니다.');
                    db.close();
                    resolve();
                    return;
                }
                
                // 각 리마인더를 수정
                let completed = 0;
                rows.forEach(reminder => {
                    const oldTime = new Date(reminder.remind_time);
                    console.log(`ID ${reminder.id}: 기존 시간 - ${oldTime.toISOString()}`);
                    
                    // 잘못 저장된 시간을 원래 KST 의도로 해석하고 UTC로 변환
                    // 기존에 KST + 9시간으로 저장되었다면, 18시간을 빼야 함
                    const correctedUTC = new Date(oldTime.getTime() - (18 * 60 * 60 * 1000));
                    console.log(`ID ${reminder.id}: 수정된 시간 - ${correctedUTC.toISOString()}`);
                    
                    // 업데이트
                    db.run("UPDATE reminders SET remind_time = ? WHERE id = ?", 
                          [correctedUTC.toISOString(), reminder.id], 
                          function(err) {
                        if (err) {
                            console.error(`ID ${reminder.id} 업데이트 실패:`, err.message);
                        } else {
                            console.log(`ID ${reminder.id} 업데이트 완료`);
                        }
                        
                        completed++;
                        if (completed === rows.length) {
                            console.log('모든 리마인더 수정 완료');
                            db.close();
                            resolve();
                        }
                    });
                });
            });
        });
    });
}

// 실행
fixExistingReminders()
    .then(() => {
        console.log('✅ 리마인더 수정 작업 완료');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ 수정 작업 실패:', error);
        process.exit(1);
    });