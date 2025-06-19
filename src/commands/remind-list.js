const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { formatTime } = require('../utils/timeParser');
const scheduler = require('../scheduler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remind-list')
        .setDescription('내 리마인더 목록을 확인합니다'),

    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const reminders = await scheduler.getUserReminders(userId);
            
            if (reminders.length === 0) {
                return await interaction.reply({
                    content: '📝 설정된 리마인더가 없습니다.',
                    flags: 64
                });
            }
            
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle('📝 내 리마인더 목록')
                .setFooter({ text: `총 ${reminders.length}개의 리마인더` })
                .setTimestamp();
            
            const fields = reminders.map((reminder, index) => {
                // DB에서 가져온 시간은 이미 KST로 저장되어 있으므로 그대로 파싱
                const remindTime = new Date(reminder.remind_time);
                // KST 시간이므로 9시간을 빼서 로컬 시간으로 변환
                const localTime = new Date(remindTime.getTime() - (9 * 60 * 60 * 1000));
                const formattedTime = formatTime(localTime);
                
                let value = `⏰ ${formattedTime}\n🆔 ID: ${reminder.id}`;
                
                // 반복 리마인더인지 확인
                if (reminder.repeat_type && reminder.repeat_interval) {
                    const repeatText = formatRepeatInfo(reminder.repeat_type, reminder.repeat_interval);
                    value += `\n🔄 반복: ${repeatText}`;
                }
                
                return {
                    name: `${index + 1}. ${reminder.message}`,
                    value: value,
                    inline: false
                };
            });
            
            // Discord embed 필드 제한 (25개)을 고려
            if (fields.length > 25) {
                embed.addFields(fields.slice(0, 25));
                embed.setDescription(`⚠️ 리마인더가 많아 처음 25개만 표시됩니다.`);
            } else {
                embed.addFields(fields);
            }
            
            await interaction.reply({
                embeds: [embed],
                flags: 64
            });
            
        } catch (error) {
            console.error('리마인더 목록 조회 오류:', error);
            await interaction.reply({
                content: '❌ 리마인더 목록을 조회하는 중 오류가 발생했습니다.',
                flags: 64
            });
        }
    },
};

// 반복 정보 포맷 함수
function formatRepeatInfo(repeatType, interval) {
    switch (repeatType) {
        case 'minutes': return `${interval}분마다`;
        case 'hours': return `${interval}시간마다`;
        case 'days': return `${interval}일마다`;
        case 'weeks': return `${interval}주마다`;
        case 'scheduled': 
            try {
                const schedule = JSON.parse(interval);
                return formatScheduleInfo(schedule);
            } catch (error) {
                return '스케줄 오류';
            }
        default: return '알 수 없음';
    }
}

// 스케줄 정보 포맷 함수
function formatScheduleInfo(schedule) {
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
            return '알 수 없는 스케줄';
    }
}