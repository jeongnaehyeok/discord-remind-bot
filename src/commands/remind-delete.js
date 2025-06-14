const { SlashCommandBuilder } = require('discord.js');
const scheduler = require('../scheduler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remind-delete')
        .setDescription('리마인더를 삭제합니다')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('삭제할 리마인더의 ID 번호')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const reminderId = interaction.options.getInteger('id');
            const userId = interaction.user.id;
            
            // 해당 ID의 리마인더가 사용자 소유인지 확인하고 삭제
            const success = await scheduler.deleteReminderById(reminderId, userId);
            
            if (success) {
                await interaction.reply({
                    content: `✅ ID ${reminderId}번 리마인더가 삭제되었습니다.`,
                    ephemeral: true
                });
            } else {
                await interaction.reply({
                    content: `❌ ID ${reminderId}번 리마인더를 찾을 수 없습니다.\n/remind-list 명령어로 리마인더 목록을 확인해주세요.`,
                    ephemeral: true
                });
            }
            
        } catch (error) {
            console.error('리마인더 삭제 오류:', error);
            await interaction.reply({
                content: '❌ 리마인더 삭제 중 오류가 발생했습니다.',
                ephemeral: true
            });
        }
    },
};