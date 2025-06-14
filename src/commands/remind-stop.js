const { SlashCommandBuilder } = require('discord.js');
const scheduler = require('../scheduler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remind-stop')
        .setDescription('반복 리마인더를 정지합니다')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('정지할 반복 리마인더의 ID 번호')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const reminderId = interaction.options.getInteger('id');
            const userId = interaction.user.id;
            
            // 해당 ID의 반복 리마인더 확인 및 삭제
            const success = await scheduler.deleteReminderById(reminderId, userId);
            
            if (success) {
                await interaction.reply({
                    content: `🛑 ID ${reminderId}번 반복 리마인더가 정지되었습니다.`,
                    flags: 64
                });
            } else {
                await interaction.reply({
                    content: `❌ ID ${reminderId}번 리마인더를 찾을 수 없습니다.\n/remind-list 명령어로 리마인더 목록을 확인해주세요.`,
                    flags: 64
                });
            }
            
        } catch (error) {
            console.error('반복 리마인더 정지 오류:', error);
            await interaction.reply({
                content: '❌ 반복 리마인더 정지 중 오류가 발생했습니다.',
                flags: 64
            });
        }
    },
};