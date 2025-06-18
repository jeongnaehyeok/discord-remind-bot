const { SlashCommandBuilder } = require('discord.js');
const { formatTime } = require('../utils/timeParser');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remind-schedule')
        .setDescription('특정 시간/요일에 반복되는 리마인더를 설정합니다')
        .addStringOption(option =>
            option.setName('schedule')
                .setDescription('반복 일정 (예: 매일-오전9시, 매주-월요일-오후6시, 매월-1일-오전10시)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('반복할 메시지')
                .setRequired(true)),

    async execute(interaction) {
        const scheduleString = interaction.options.getString('schedule');
        const message = interaction.options.getString('message');
        
        try {
            // 스케줄 파싱
            const schedule = parseSchedule(scheduleString);
            if (!schedule) {
                return await interaction.reply({
                    content: '❌ 스케줄 형식을 확인해주세요.\n\n**사용 가능한 형식:**\n' +
                           '• `매일-오전9시` - 매일 오전 9시\n' +
                           '• `매주-월요일-오후6시` - 매주 월요일 오후 6시\n' +
                           '• `매월-1일-오전10시` - 매월 1일 오전 10시\n' +
                           '• `평일-오후5시` - 평일(월~금) 오후 5시\n' +
                           '• `주말-오전11시` - 주말(토,일) 오전 11시',
                    flags: 64
                });
            }
            
            // 다음 실행 시간 계산
            const nextTime = calculateNextScheduledTime(schedule);
            if (!nextTime) {
                return await interaction.reply({
                    content: '❌ 스케줄 시간 계산에 실패했습니다.',
                    flags: 64
                });
            }
            
            // 데이터베이스에 스케줄 리마인더 저장
            await createScheduledReminder(
                interaction.user.id,
                interaction.channel.id,
                message,
                nextTime,
                schedule
            );
            
            // 성공 응답
            const formattedTime = formatTime(nextTime);
            const scheduleText = formatSchedule(schedule);
            
            await interaction.reply({
                content: `📅 **${scheduleText}**에 "${message}" 스케줄 리마인더가 설정되었습니다!\n⏰ 다음 실행: **${formattedTime}**\n⚠️ 스케줄 리마인더는 수동으로 정지해야 합니다.`,
                flags: 64
            });
            
        } catch (error) {
            console.error('스케줄 리마인더 설정 오류:', error);
            await interaction.reply({
                content: '❌ 스케줄 리마인더 설정 중 오류가 발생했습니다.',
                flags: 64
            });
        }
    },
};

// 스케줄 파싱 함수
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

// 다음 실행 시간 계산
function calculateNextScheduledTime(schedule) {
    const now = new Date();
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

// 스케줄 포맷 함수
function formatSchedule(schedule) {
    switch (schedule.type) {
        case 'daily':
            const dailyPeriod = schedule.hour >= 12 ? '오후' : '오전';
            const dailyHour = schedule.hour > 12 ? schedule.hour - 12 : (schedule.hour === 0 ? 12 : schedule.hour);
            return `매일 ${dailyPeriod} ${dailyHour}시`;
            
        case 'weekly':
            const weeklyPeriod = schedule.hour >= 12 ? '오후' : '오전';
            const weeklyHour = schedule.hour > 12 ? schedule.hour - 12 : (schedule.hour === 0 ? 12 : schedule.hour);
            const days = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
            return `매주 ${days[schedule.dayOfWeek]} ${weeklyPeriod} ${weeklyHour}시`;
            
        case 'monthly':
            const monthlyPeriod = schedule.hour >= 12 ? '오후' : '오전';
            const monthlyHour = schedule.hour > 12 ? schedule.hour - 12 : (schedule.hour === 0 ? 12 : schedule.hour);
            return `매월 ${schedule.date}일 ${monthlyPeriod} ${monthlyHour}시`;
            
        case 'weekdays':
            const weekdaysPeriod = schedule.hour >= 12 ? '오후' : '오전';
            const weekdaysHour = schedule.hour > 12 ? schedule.hour - 12 : (schedule.hour === 0 ? 12 : schedule.hour);
            return `평일 ${weekdaysPeriod} ${weekdaysHour}시`;
            
        case 'weekends':
            const weekendsPeriod = schedule.hour >= 12 ? '오후' : '오전';
            const weekendsHour = schedule.hour > 12 ? schedule.hour - 12 : (schedule.hour === 0 ? 12 : schedule.hour);
            return `주말 ${weekendsPeriod} ${weekendsHour}시`;
            
        default:
            return '알 수 없음';
    }
}

// 스케줄 리마인더 생성 함수
async function createScheduledReminder(userId, channelId, message, nextTime, schedule) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO reminders (user_id, channel_id, message, remind_time, repeat_type, repeat_interval)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        // schedule 객체를 JSON 문자열로 저장
        db.db.run(sql, [
            userId,
            channelId,
            message,
            nextTime.toISOString(),
            'scheduled',
            JSON.stringify(schedule)
        ], function(err) {
            if (err) {
                console.error('스케줄 리마인더 생성 실패:', err.message);
                reject(err);
            } else {
                console.log(`스케줄 리마인더 생성됨 - ID: ${this.lastID}`);
                resolve({
                    id: this.lastID,
                    userId,
                    channelId,
                    message,
                    nextTime,
                    schedule
                });
            }
        });
    });
}