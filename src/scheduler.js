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
            await db.markReminderCompleted(reminder.id);
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

module.exports = {
    init,
    getUserReminders,
    deleteReminderById
};