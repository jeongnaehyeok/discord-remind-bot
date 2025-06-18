const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

// 테스트용 데이터베이스 클래스
class TestDatabase {
    constructor() {
        this.dbPath = ':memory:'; // 메모리 데이터베이스 사용
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                } else {
                    this.createTables().then(resolve).catch(reject);
                }
            });
        });
    }

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
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async createReminder(userId, channelId, message, remindTime) {
        return new Promise((resolve, reject) => {
            const sql = `
                INSERT INTO reminders (user_id, channel_id, message, remind_time)
                VALUES (?, ?, ?, ?)
            `;

            this.db.run(sql, [userId, channelId, message, remindTime], function(err) {
                if (err) {
                    reject(err);
                } else {
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

    async getUserReminders(userId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM reminders 
                WHERE user_id = ? 
                ORDER BY remind_time ASC
            `;

            this.db.all(sql, [userId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async deleteReminder(id, userId) {
        return new Promise((resolve, reject) => {
            const sql = `
                DELETE FROM reminders 
                WHERE id = ? AND user_id = ?
            `;

            this.db.run(sql, [id, userId], function(err) {
                if (err) {
                    reject(err);
                } else if (this.changes === 0) {
                    reject(new Error('삭제할 리마인더를 찾을 수 없습니다.'));
                } else {
                    resolve(true);
                }
            });
        });
    }

    async getPendingReminders() {
        return new Promise((resolve, reject) => {
            const now = new Date().toISOString();
            const sql = `
                SELECT * FROM reminders 
                WHERE remind_time <= ? 
                ORDER BY remind_time ASC
            `;

            this.db.all(sql, [now], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async markReminderCompleted(id) {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM reminders WHERE id = ?`;

            this.db.run(sql, [id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
            });
        });
    }

    async getReminder(id, userId) {
        return new Promise((resolve, reject) => {
            const sql = `
                SELECT * FROM reminders 
                WHERE id = ? AND user_id = ?
            `;

            this.db.get(sql, [id, userId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

describe('Database', () => {
    let testDb;
    
    beforeEach(async () => {
        testDb = new TestDatabase();
        await testDb.init();
    });
    
    afterEach(async () => {
        if (testDb) {
            testDb.close();
        }
    });
    
    describe('initialization', () => {
        test('데이터베이스 초기화 성공', async () => {
            expect(testDb.db).toBeDefined();
            expect(testDb.db).toBeInstanceOf(sqlite3.Database);
        });
        
        test('테이블 생성 확인', async () => {
            return new Promise((resolve, reject) => {
                testDb.db.get(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='reminders'",
                    (err, row) => {
                        if (err) {
                            reject(err);
                        } else {
                            expect(row).toBeDefined();
                            expect(row.name).toBe('reminders');
                            resolve();
                        }
                    }
                );
            });
        });
    });
    
    describe('createReminder', () => {
        test('리마인더 생성 성공', async () => {
            const testData = {
                userId: 'user123',
                channelId: 'channel456',
                message: '테스트 메시지',
                remindTime: '2025-06-17T10:00:00.000Z'
            };
            
            const result = await testDb.createReminder(
                testData.userId,
                testData.channelId,
                testData.message,
                testData.remindTime
            );
            
            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.userId).toBe(testData.userId);
            expect(result.channelId).toBe(testData.channelId);
            expect(result.message).toBe(testData.message);
            expect(result.remindTime).toBe(testData.remindTime);
        });
        
        test('잘못된 데이터로 리마인더 생성 실패', async () => {
            await expect(
                testDb.createReminder(null, 'channel', 'message', 'invalid-date')
            ).rejects.toThrow();
        });
    });
    
    describe('getUserReminders', () => {
        beforeEach(async () => {
            // 테스트 데이터 추가
            await testDb.createReminder('user1', 'channel1', 'message1', '2025-06-17T10:00:00.000Z');
            await testDb.createReminder('user1', 'channel1', 'message2', '2025-06-18T10:00:00.000Z');
            await testDb.createReminder('user2', 'channel2', 'message3', '2025-06-19T10:00:00.000Z');
        });
        
        test('특정 사용자의 리마인더 조회', async () => {
            const reminders = await testDb.getUserReminders('user1');
            
            expect(reminders).toHaveLength(2);
            expect(reminders[0].message).toBe('message1');
            expect(reminders[1].message).toBe('message2');
            expect(reminders[0].user_id).toBe('user1');
            expect(reminders[1].user_id).toBe('user1');
        });
        
        test('존재하지 않는 사용자의 리마인더 조회', async () => {
            const reminders = await testDb.getUserReminders('nonexistent');
            expect(reminders).toHaveLength(0);
        });
        
        test('리마인더가 시간순으로 정렬되는지 확인', async () => {
            const reminders = await testDb.getUserReminders('user1');
            
            expect(reminders).toHaveLength(2);
            expect(new Date(reminders[0].remind_time).getTime())
                .toBeLessThan(new Date(reminders[1].remind_time).getTime());
        });
    });
    
    describe('deleteReminder', () => {
        let reminderId;
        
        beforeEach(async () => {
            const result = await testDb.createReminder('user1', 'channel1', 'test message', '2025-06-17T10:00:00.000Z');
            reminderId = result.id;
        });
        
        test('리마인더 삭제 성공', async () => {
            const result = await testDb.deleteReminder(reminderId, 'user1');
            expect(result).toBe(true);
            
            // 삭제되었는지 확인
            const reminders = await testDb.getUserReminders('user1');
            expect(reminders).toHaveLength(0);
        });
        
        test('잘못된 사용자로 삭제 시도', async () => {
            await expect(
                testDb.deleteReminder(reminderId, 'wrong-user')
            ).rejects.toThrow('삭제할 리마인더를 찾을 수 없습니다.');
        });
        
        test('존재하지 않는 리마인더 삭제 시도', async () => {
            await expect(
                testDb.deleteReminder(99999, 'user1')
            ).rejects.toThrow('삭제할 리마인더를 찾을 수 없습니다.');
        });
    });
    
    describe('getReminder', () => {
        let reminderId;
        
        beforeEach(async () => {
            const result = await testDb.createReminder('user1', 'channel1', 'test message', '2025-06-17T10:00:00.000Z');
            reminderId = result.id;
        });
        
        test('특정 리마인더 조회 성공', async () => {
            const reminder = await testDb.getReminder(reminderId, 'user1');
            
            expect(reminder).toBeDefined();
            expect(reminder.id).toBe(reminderId);
            expect(reminder.user_id).toBe('user1');
            expect(reminder.message).toBe('test message');
        });
        
        test('잘못된 사용자로 조회', async () => {
            const reminder = await testDb.getReminder(reminderId, 'wrong-user');
            expect(reminder).toBeUndefined();
        });
        
        test('존재하지 않는 리마인더 조회', async () => {
            const reminder = await testDb.getReminder(99999, 'user1');
            expect(reminder).toBeUndefined();
        });
    });
    
    describe('getPendingReminders', () => {
        beforeEach(async () => {
            const now = new Date();
            const pastTime = new Date(now.getTime() - 60000).toISOString(); // 1분 전
            const futureTime = new Date(now.getTime() + 60000).toISOString(); // 1분 후
            
            await testDb.createReminder('user1', 'channel1', 'past message', pastTime);
            await testDb.createReminder('user2', 'channel2', 'future message', futureTime);
        });
        
        test('실행 대기 중인 리마인더만 조회', async () => {
            const pendingReminders = await testDb.getPendingReminders();
            
            expect(pendingReminders).toHaveLength(1);
            expect(pendingReminders[0].message).toBe('past message');
        });
    });
    
    describe('markReminderCompleted', () => {
        let reminderId;
        
        beforeEach(async () => {
            const result = await testDb.createReminder('user1', 'channel1', 'test message', '2025-06-17T10:00:00.000Z');
            reminderId = result.id;
        });
        
        test('리마인더 완료 처리', async () => {
            const result = await testDb.markReminderCompleted(reminderId);
            expect(result).toBe(true);
            
            // 삭제되었는지 확인
            const reminders = await testDb.getUserReminders('user1');
            expect(reminders).toHaveLength(0);
        });
        
        test('존재하지 않는 리마인더 완료 처리', async () => {
            const result = await testDb.markReminderCompleted(99999);
            expect(result).toBe(true); // 에러를 던지지 않고 true 반환
        });
    });
});