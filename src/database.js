const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        // Railway Volume 또는 환경변수로 데이터베이스 경로 설정
        this.dbPath = process.env.DATABASE_PATH || '/app/data/reminders.db';
        this.db = null;
        
        // 데이터 디렉토리가 없으면 생성
        const fs = require('fs');
        const path = require('path');
        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log(`데이터 디렉토리 생성됨: ${dataDir}`);
        }
    }

    // 데이터베이스 초기화
    async init() {
        return new Promise((resolve, reject) => {
            console.log(`데이터베이스 연결 시도: ${this.dbPath}`);
            
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('데이터베이스 연결 실패:', err.message);
                    reject(err);
                } else {
                    console.log(`SQLite 데이터베이스 연결 성공: ${this.dbPath}`);
                    
                    // 기존 데이터 확인
                    this.checkExistingData().then(() => {
                        this.createTables().then(resolve).catch(reject);
                    }).catch(reject);
                }
            });
        });
    }
    
    // 기존 데이터 확인
    async checkExistingData() {
        return new Promise((resolve, reject) => {
            this.db.get("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='reminders'", (err, row) => {
                if (err) {
                    console.log('테이블 확인 중 오류 (정상 - 첫 실행일 수 있음)');
                    resolve();
                } else {
                    if (row && row.count > 0) {
                        // 기존 리마인더 개수 확인
                        this.db.get("SELECT COUNT(*) as count FROM reminders", (err, dataRow) => {
                            if (!err && dataRow) {
                                console.log(`기존 리마인더 데이터 발견: ${dataRow.count}개`);
                            }
                            resolve();
                        });
                    } else {
                        console.log('새로운 데이터베이스 파일 생성');
                        resolve();
                    }
                }
            });
        });
    }

    // 테이블 생성
    async createTables() {
        return new Promise((resolve, reject) => {
            const sql = `
                CREATE TABLE IF NOT EXISTS reminders (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    channel_id TEXT NOT NULL,
                    message TEXT NOT NULL,
                    remind_time DATETIME NOT NULL,
                    repeat_type TEXT DEFAULT NULL,
                    repeat_interval INTEGER DEFAULT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            this.db.run(sql, (err) => {
                if (err) {
                    console.error('테이블 생성 실패:', err.message);
                    reject(err);
                } else {
                    console.log('리마인더 테이블이 생성되었습니다.');
                    resolve();
                }
            });
        });
    }

    // 리마인더 생성
    async createReminder(userId, channelId, message, remindTime) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO reminders (user_id, channel_id, message, remind_time)
                VALUES (?, ?, ?, ?)
            `;

            this.db.run(sql, [userId, channelId, message, remindTime], function(err) {
                if (err) {
                    console.error('리마인더 생성 실패:', err.message);
                    reject(err);
                } else {
                    console.log(`리마인더 생성됨 - ID: ${this.lastID}`);
                    resolve({
                        id: this.lastID,
                        userId,
                        channelId,
                        message,
                        remindTime
                    });
                }
            });
        });
    }

    // 사용자 리마인더 목록 조회
    async getUserReminders(userId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM reminders 
                WHERE user_id = ? 
                ORDER BY remind_time ASC
            `;

            this.db.all(sql, [userId], (err, rows) => {
                if (err) {
                    console.error('리마인더 조회 실패:', err.message);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // 리마인더 삭제
    async deleteReminder(id, userId) {
        return new Promise((resolve, reject) => {
            const sql = `
                DELETE FROM reminders 
                WHERE id = ? AND user_id = ?
            `;

            this.db.run(sql, [id, userId], function(err) {
                if (err) {
                    console.error('리마인더 삭제 실패:', err.message);
                    reject(err);
                } else if (this.changes === 0) {
                    reject(new Error('삭제할 리마인더를 찾을 수 없습니다.'));
                } else {
                    console.log(`리마인더 삭제됨 - ID: ${id}`);
                    resolve(true);
                }
            });
        });
    }

    // 실행 대기 중인 리마인더 조회
    async getPendingReminders() {
        return new Promise((resolve, reject) => {
            // 현재 UTC 시간으로 비교 (DB에 UTC로 저장되어 있음)
            const now = new Date();
            const utcISOString = now.toISOString();
            
            console.log(`리마인더 확인 중... 현재 UTC 시간: ${utcISOString}`);
            const sql = `
                SELECT * FROM reminders 
                WHERE remind_time <= ? 
                ORDER BY remind_time ASC
            `;

            this.db.all(sql, [utcISOString], (err, rows) => {
                if (err) {
                    console.error('대기 중인 리마인더 조회 실패:', err.message);
                    reject(err);
                } else {
                    console.log(`찾은 리마인더: ${rows.length}개`);
                    if (rows.length > 0) {
                        rows.forEach(row => {
                            console.log(`- ID: ${row.id}, UTC 시간: ${row.remind_time}, 메시지: ${row.message}`);
                        });
                    }
                    resolve(rows);
                }
            });
        });
    }

    // 실행 완료된 리마인더 삭제
    async markReminderCompleted(id) {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM reminders WHERE id = ?`;

            this.db.run(sql, [id], function(err) {
                if (err) {
                    console.error('리마인더 완료 처리 실패:', err.message);
                    reject(err);
                } else {
                    console.log(`리마인더 완료 처리됨 - ID: ${id}`);
                    resolve(true);
                }
            });
        });
    }

    // 특정 리마인더 조회 (권한 확인용)
    async getReminder(id, userId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM reminders 
                WHERE id = ? AND user_id = ?
            `;

            this.db.get(sql, [id, userId], (err, row) => {
                if (err) {
                    console.error('리마인더 조회 실패:', err.message);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // 데이터베이스 연결 종료
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('데이터베이스 연결 종료 실패:', err.message);
                } else {
                    console.log('데이터베이스 연결이 종료되었습니다.');
                }
            });
        }
    }
}

// 싱글톤 인스턴스
const database = new Database();

module.exports = database;