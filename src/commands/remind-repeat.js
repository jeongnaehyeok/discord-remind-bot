const { SlashCommandBuilder } = require('discord.js');
const { parseTime, isValidTime, formatTime } = require('../utils/timeParser');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remind-repeat')
        .setDescription('주기적으로 반복되는 리마인더를 설정합니다')
        .addStringOption(option =>
            option.setName('interval')
                .setDescription('반복 주기 (예: 30분, 1시간, 1일, 1주)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('반복할 메시지')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('start_time')
                .setDescription('시작 시간 (기본값: 지금 바로 시작)')
                .setRequired(false)),

    async execute(interaction) {
        const intervalString = interaction.options.getString('interval');
        const message = interaction.options.getString('message');
        const startTimeString = interaction.options.getString('start_time') || '1분';
        
        try {
            // 반복 주기 파싱
            const interval = parseInterval(intervalString);
            if (!interval) {
                return await interaction.reply({
                    content: '❌ 반복 주기 형식을 확인해주세요. (예: 30분, 1시간, 1일, 1주)',
                    flags: 64
                });
            }
            
            // 시작 시간 파싱
            const startTime = parseTime(startTimeString);
            if (!isValidTime(startTime)) {
                return await interaction.reply({
                    content: '❌ 시작 시간 형식을 확인해주세요.',
                    flags: 64
                });
            }
            
            // 데이터베이스에 반복 리마인더 저장
            await createRepeatReminder(
                interaction.user.id,
                interaction.channel.id,
                message,
                startTime,
                interval
            );
            
            // 성공 응답
            const formattedTime = formatTime(startTime);
            const intervalText = formatInterval(interval);
            
            await interaction.reply({
                content: `🔄 **${formattedTime}**부터 **${intervalText}**마다 "${message}" 반복 알림이 설정되었습니다!\n⚠️ 반복 리마인더는 수동으로 삭제해야 합니다.`,
                flags: 64
            });
            
        } catch (error) {
            console.error('반복 리마인더 설정 오류:', error);
            await interaction.reply({
                content: '❌ 반복 리마인더 설정 중 오류가 발생했습니다.',
                flags: 64
            });
        }
    },
};

// 반복 주기 파싱 함수
function parseInterval(intervalString) {
    const input = intervalString.trim();
    
    // 분 단위
    const minutesMatch = input.match(/(\d+)분/);
    if (minutesMatch) {
        const minutes = parseInt(minutesMatch[1]);
        return { type: 'minutes', value: minutes };
    }
    
    // 시간 단위
    const hoursMatch = input.match(/(\d+)시간?/);
    if (hoursMatch) {
        const hours = parseInt(hoursMatch[1]);
        return { type: 'hours', value: hours };
    }
    
    // 일 단위
    const daysMatch = input.match(/(\d+)일/);
    if (daysMatch) {
        const days = parseInt(daysMatch[1]);
        return { type: 'days', value: days };
    }
    
    // 주 단위
    const weeksMatch = input.match(/(\d+)주/);
    if (weeksMatch) {
        const weeks = parseInt(weeksMatch[1]);
        return { type: 'weeks', value: weeks };
    }
    
    return null;
}

// 반복 주기 포맷 함수
function formatInterval(interval) {
    switch (interval.type) {
        case 'minutes': return `${interval.value}분`;
        case 'hours': return `${interval.value}시간`;
        case 'days': return `${interval.value}일`;
        case 'weeks': return `${interval.value}주`;
        default: return '알 수 없음';
    }
}

// 반복 리마인더 생성 함수
async function createRepeatReminder(userId, channelId, message, startTime, interval) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO reminders (user_id, channel_id, message, remind_time, repeat_type, repeat_interval)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        // UTC로 변환하여 저장 (9시간 빼기)
        const utcTime = new Date(startTime.getTime() - (9 * 60 * 60 * 1000));
        
        db.db.run(sql, [
            userId,
            channelId,
            message,
            utcTime.toISOString(),
            interval.type,
            interval.value
        ], function(err) {
            if (err) {
                console.error('반복 리마인더 생성 실패:', err.message);
                reject(err);
            } else {
                console.log(`반복 리마인더 생성됨 - ID: ${this.lastID}`);
                resolve({
                    id: this.lastID,
                    userId,
                    channelId,
                    message,
                    startTime,
                    interval
                });
            }
        });
    });
}