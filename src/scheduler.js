const cron = require('node-cron');
const db = require('./database');

let client;

function init(discordClient) {
    client = discordClient;
    
    // 매 분마다 리마인더 확인
    cron.schedule('* * * * *', async () => {
        await checkReminders();
    });
    
    console.log('✅ 스케줄러 시작됨 (매 분마다 리마인더 확인)');
}

async function checkReminders() {
    try {
        const reminders = await db.getPendingReminders();
        
        if (reminders.length === 0) {
            return;
        }
        
        console.log(`${reminders.length}개의 리마인더를 처리 중...`);
        
        for (const reminder of reminders) {
            await sendReminder(reminder);
            
            // 반복 리마인더인지 확인
            if (reminder.repeat_type && reminder.repeat_interval) {
                await scheduleNextRepeat(reminder);
            } else {
                await db.markReminderCompleted(reminder.id);
            }
        }
        
    } catch (error) {
        console.error('리마인더 확인 중 오류:', error);
    }
}

async function sendReminder(reminder) {
    try {
        const channel = await client.channels.fetch(reminder.channel_id);
        const user = await client.users.fetch(reminder.user_id);
        
        if (!channel) {
            console.error(`채널/스레드를 찾을 수 없습니다: ${reminder.channel_id}`);
            return;
        }
        
        // 스레드인지 확인하고 적절히 처리
        const isThread = channel.isThread && channel.isThread();
        const channelType = isThread ? '스레드' : '채널';
        
        console.log(`${channelType}에 리마인더 전송: ${channel.name || 'Unknown'}`);
        
        const embed = {
            color: 0x0099FF,
            title: '⏰ 리마인더',
            description: reminder.message,
            fields: [
                {
                    name: '요청자',
                    value: `<@${reminder.user_id}>`,
                    inline: true
                },
                {
                    name: '설정 시간',
                    value: new Date(reminder.created_at).toLocaleString('ko-KR', {
                        timeZone: 'Asia/Seoul'
                    }),
                    inline: true
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: 'Discord Reminder Bot'
            }
        };
        
        await channel.send({
            content: `<@${reminder.user_id}>`,
            embeds: [embed]
        });
        
        console.log(`리마인더 전송 완료: ${reminder.message} (사용자: ${user.tag})`);
        
    } catch (error) {
        console.error('리마인더 전송 실패:', error);
        console.error('리마인더 정보:', reminder);
    }
}

// 특정 사용자의 모든 리마인더 조회
async function getUserReminders(userId) {
    try {
        return await db.getUserReminders(userId);
    } catch (error) {
        console.error('사용자 리마인더 조회 실패:', error);
        return [];
    }
}

// ID로 리마인더 삭제
async function deleteReminderById(reminderId, userId) {
    try {
        await db.deleteReminder(reminderId, userId);
        return true;
    } catch (error) {
        console.error('리마인더 삭제 실패:', error);
        return false;
    }
}

// 다음 반복 일정 설정
async function scheduleNextRepeat(reminder) {
    try {
        const currentTime = new Date(reminder.remind_time);
        const nextTime = calculateNextTime(currentTime, reminder.repeat_type, reminder.repeat_interval);
        
        // 다음 실행 시간으로 업데이트
        const sql = `UPDATE reminders SET remind_time = ? WHERE id = ?`;
        db.db.run(sql, [nextTime.toISOString(), reminder.id], (err) => {
            if (err) {
                console.error('반복 리마인더 업데이트 실패:', err.message);
            } else {
                console.log(`반복 리마인더 다음 실행 시간 설정: ${nextTime.toISOString()}`);
            }
        });
        
    } catch (error) {
        console.error('반복 리마인더 스케줄링 오류:', error);
    }
}

// 다음 실행 시간 계산
function calculateNextTime(currentTime, repeatType, interval) {
    const nextTime = new Date(currentTime);
    
    switch (repeatType) {
        case 'minutes':
            nextTime.setMinutes(nextTime.getMinutes() + interval);
            break;
        case 'hours':
            nextTime.setHours(nextTime.getHours() + interval);
            break;
        case 'days':
            nextTime.setDate(nextTime.getDate() + interval);
            break;
        case 'weeks':
            nextTime.setDate(nextTime.getDate() + (interval * 7));
            break;
        default:
            throw new Error(`알 수 없는 반복 타입: ${repeatType}`);
    }
    
    return nextTime;
}

module.exports = {
    init,
    getUserReminders,
    deleteReminderById
};