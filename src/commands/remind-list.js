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
                const remindTime = new Date(reminder.remind_time);
                const formattedTime = formatTime(remindTime);
                
                return {
                    name: `${index + 1}. ${reminder.message}`,
                    value: `⏰ ${formattedTime}\n🆔 ID: ${reminder.id}`,
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