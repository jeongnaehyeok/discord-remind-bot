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
            console.error(`채널/스레드 삭제됨: ${reminder.channel_id}`);
            await handleDeletedChannel(reminder);
            return;
        }
        
        // 스레드인지 확인하고 상태 체크
        const isThread = channel.isThread && channel.isThread();
        const channelType = isThread ? '스레드' : '채널';
        
        // 스레드 특별 처리
        if (isThread) {
            const threadStatus = await checkThreadStatus(channel);
            if (!threadStatus.canSend) {
                console.warn(`스레드 접근 불가: ${channel.name} (${threadStatus.reason})`);
                await handleInaccessibleThread(reminder, threadStatus);
                return;
            }
        }
        
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
        // Discord API 오류 코드별 처리
        if (error.code === 10003 || error.code === 10004) {
            // 10003: Unknown Channel, 10004: Unknown Guild
            console.error(`채널/길드 삭제됨: ${reminder.channel_id}`);
            await handleDeletedChannel(reminder);
        } else if (error.code === 50001 || error.code === 50013) {
            // 50001: Missing Access, 50013: Missing Permissions
            console.error(`권한 없음: ${reminder.channel_id}`);
            await handlePermissionError(reminder, error.code);
        } else {
            console.error('리마인더 전송 실패:', error);
            console.error('리마인더 정보:', reminder);
        }
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
        case 'scheduled':
            // interval은 JSON 문자열로 저장된 스케줄 정보
            const schedule = JSON.parse(interval);
            return calculateNextScheduledTime(schedule);
        default:
            throw new Error(`알 수 없는 반복 타입: ${repeatType}`);
    }
    
    return nextTime;
}

// 스케줄 기반 다음 실행 시간 계산
function calculateNextScheduledTime(schedule) {
    const now = new Date();
    const nextTime = new Date();
    
    switch (schedule.type) {
        case 'daily':
            nextTime.setHours(schedule.hour, schedule.minute, 0, 0);
            nextTime.setDate(nextTime.getDate() + 1); // 다음 날로 설정
            break;
            
        case 'weekly':
            const currentDay = now.getDay();
            const targetDay = schedule.dayOfWeek;
            let daysUntilTarget = targetDay - currentDay;
            
            if (daysUntilTarget <= 0) {
                daysUntilTarget += 7;
            }
            
            nextTime.setDate(now.getDate() + daysUntilTarget);
            nextTime.setHours(schedule.hour, schedule.minute, 0, 0);
            break;
            
        case 'monthly':
            nextTime.setMonth(nextTime.getMonth() + 1);
            nextTime.setDate(schedule.date);
            nextTime.setHours(schedule.hour, schedule.minute, 0, 0);
            
            // 다음 달에 해당 날짜가 없는 경우 마지막 날로 설정
            const lastDayOfMonth = new Date(nextTime.getFullYear(), nextTime.getMonth() + 1, 0).getDate();
            if (schedule.date > lastDayOfMonth) {
                nextTime.setDate(lastDayOfMonth);
            }
            break;
            
        case 'weekdays':
            nextTime.setHours(schedule.hour, schedule.minute, 0, 0);
            nextTime.setDate(nextTime.getDate() + 1);
            
            // 다음 평일까지 이동
            while (nextTime.getDay() === 0 || nextTime.getDay() === 6) {
                nextTime.setDate(nextTime.getDate() + 1);
            }
            break;
            
        case 'weekends':
            nextTime.setHours(schedule.hour, schedule.minute, 0, 0);
            nextTime.setDate(nextTime.getDate() + 1);
            
            // 다음 주말까지 이동
            while (nextTime.getDay() !== 0 && nextTime.getDay() !== 6) {
                nextTime.setDate(nextTime.getDate() + 1);
            }
            break;
            
        default:
            return null;
    }
    
    return nextTime;
}

// 스레드 상태 확인 함수
async function checkThreadStatus(thread) {
    try {
        // 스레드가 보관되었는지 확인
        if (thread.archived) {
            return {
                canSend: false,
                reason: 'archived',
                action: 'unarchive_or_delete'
            };
        }
        
        // 스레드가 잠겨있는지 확인
        if (thread.locked) {
            return {
                canSend: false,
                reason: 'locked',
                action: 'wait_or_delete'
            };
        }
        
        // 봇이 스레드에 메시지를 보낼 권한이 있는지 확인
        const permissions = thread.permissionsFor(client.user);
        if (!permissions || !permissions.has('SendMessages')) {
            return {
                canSend: false,
                reason: 'no_permission',
                action: 'delete'
            };
        }
        
        return {
            canSend: true,
            reason: 'ok'
        };
        
    } catch (error) {
        console.error('스레드 상태 확인 실패:', error);
        return {
            canSend: false,
            reason: 'error',
            action: 'delete'
        };
    }
}

// 삭제된 채널/스레드 처리
async function handleDeletedChannel(reminder) {
    try {
        // 리마인더 삭제
        await db.markReminderCompleted(reminder.id);
        console.log(`삭제된 채널의 리마인더 제거됨: ID ${reminder.id}`);
        
        // 사용자에게 알림
        await notifyUserChannelDeleted(reminder, '채널/스레드가 삭제됨');
        
    } catch (error) {
        console.error('삭제된 채널 처리 실패:', error);
    }
}

// 접근 불가능한 스레드 처리
async function handleInaccessibleThread(reminder, threadStatus) {
    try {
        if (threadStatus.action === 'delete') {
            // 권한 없음 -> 리마인더 삭제
            await db.markReminderCompleted(reminder.id);
            console.log(`접근 불가 스레드의 리마인더 제거됨: ID ${reminder.id}`);
            await notifyUserChannelDeleted(reminder, `스레드 ${threadStatus.reason}`);
            
        } else if (threadStatus.action === 'unarchive_or_delete') {
            // 보관된 스레드 -> 사용자에게 알림 후 3일 후 삭제 예약
            await scheduleReminderForDeletion(reminder, 3); // 3일 후 삭제
            await notifyUserArchivedThread(reminder);
            
        } else if (threadStatus.action === 'wait_or_delete') {
            // 잠긴 스레드 -> 1일 후 다시 확인
            await scheduleReminderForDeletion(reminder, 1); // 1일 후 삭제
            await notifyUserLockedThread(reminder);
        }
        
    } catch (error) {
        console.error('접근 불가 스레드 처리 실패:', error);
    }
}

// 권한 오류 처리
async function handlePermissionError(reminder, errorCode) {
    try {
        const errorMessage = errorCode === 50001 ? '접근 권한 없음' : '메시지 전송 권한 없음';
        
        // 일시적 권한 문제일 수 있으므로 3회까지 재시도
        const retryCount = reminder.retry_count || 0;
        
        if (retryCount < 3) {
            // 재시도 카운트 증가 후 1시간 후 재시도
            await scheduleRetry(reminder, retryCount + 1);
            console.log(`권한 오류 재시도 예약: ID ${reminder.id}, 시도 ${retryCount + 1}/3`);
        } else {
            // 3회 실패 시 리마인더 삭제
            await db.markReminderCompleted(reminder.id);
            console.log(`권한 오류로 리마인더 제거됨: ID ${reminder.id}`);
            await notifyUserChannelDeleted(reminder, errorMessage);
        }
        
    } catch (error) {
        console.error('권한 오류 처리 실패:', error);
    }
}

// 사용자에게 채널 삭제 알림
async function notifyUserChannelDeleted(reminder, reason) {
    try {
        const user = await client.users.fetch(reminder.user_id);
        
        const embed = {
            color: 0xFF6B6B,
            title: '⚠️ 리마인더 자동 제거됨',
            description: `설정하신 리마인더가 자동으로 제거되었습니다.`,
            fields: [
                {
                    name: '제거 이유',
                    value: reason,
                    inline: false
                },
                {
                    name: '리마인더 내용',
                    value: reminder.message,
                    inline: false
                },
                {
                    name: '원래 채널 ID',
                    value: reminder.channel_id,
                    inline: true
                }
            ],
            timestamp: new Date().toISOString(),
            footer: {
                text: '새로운 리마인더를 설정하려면 /remind 명령어를 사용하세요'
            }
        };
        
        await user.send({ embeds: [embed] });
        console.log(`사용자 알림 전송 완료: ${user.tag}`);
        
    } catch (error) {
        console.error('사용자 알림 실패:', error);
    }
}

// 보관된 스레드 알림
async function notifyUserArchivedThread(reminder) {
    try {
        const user = await client.users.fetch(reminder.user_id);
        
        const embed = {
            color: 0xFFA500,
            title: '📁 스레드 보관으로 인한 알림',
            description: `리마인더가 설정된 스레드가 보관되었습니다. 3일 후 자동으로 리마인더가 제거됩니다.`,
            fields: [
                {
                    name: '리마인더 내용',
                    value: reminder.message,
                    inline: false
                },
                {
                    name: '스레드 ID',
                    value: reminder.channel_id,
                    inline: true
                },
                {
                    name: '해결 방법',
                    value: '스레드를 다시 활성화하거나 새 채널에서 리마인더를 다시 설정하세요',
                    inline: false
                }
            ]
        };
        
        await user.send({ embeds: [embed] });
        
    } catch (error) {
        console.error('보관된 스레드 알림 실패:', error);
    }
}

// 잠긴 스레드 알림
async function notifyUserLockedThread(reminder) {
    try {
        const user = await client.users.fetch(reminder.user_id);
        
        const embed = {
            color: 0x808080,
            title: '🔒 스레드 잠금으로 인한 알림',
            description: `리마인더가 설정된 스레드가 잠겨있습니다. 1일 후 자동으로 리마인더가 제거됩니다.`,
            fields: [
                {
                    name: '리마인더 내용',
                    value: reminder.message,
                    inline: false
                }
            ]
        };
        
        await user.send({ embeds: [embed] });
        
    } catch (error) {
        console.error('잠긴 스레드 알림 실패:', error);
    }
}

// 재시도 스케줄링 (미구현 - 추후 개발)
async function scheduleRetry(reminder, retryCount) {
    // TODO: 재시도 로직 구현
    console.log(`재시도 예약: ID ${reminder.id}, 횟수 ${retryCount}`);
}

// 삭제 예약 (미구현 - 추후 개발)
async function scheduleReminderForDeletion(reminder, daysLater) {
    // TODO: 지연 삭제 로직 구현
    console.log(`삭제 예약: ID ${reminder.id}, ${daysLater}일 후`);
}

module.exports = {
    init,
    getUserReminders,
    deleteReminderById
};