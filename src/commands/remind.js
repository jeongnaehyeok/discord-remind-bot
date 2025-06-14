const { SlashCommandBuilder } = require('discord.js');
const { parseTime, isValidTime, formatTime } = require('../utils/timeParser');
const db = require('../database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remind')
        .setDescription('리마인더를 설정합니다')
        .addStringOption(option =>
            option.setName('time')
                .setDescription('언제 알림을 받을지 (예: 30분, 2시간, 내일 오후 3시)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('message')
                .setDescription('리마인더 메시지')
                .setRequired(true)),

    async execute(interaction) {
        const timeString = interaction.options.getString('time');
        const message = interaction.options.getString('message');
        
        try {
            // 시간 파싱
            const parsedTime = parseTime(timeString);
            
            if (!isValidTime(parsedTime)) {
                return await interaction.reply({
                    content: '❌ 시간 형식을 확인해주세요. (예: 30분, 2시간, 내일 오후 3시)',
                    flags: 64 // EPHEMERAL flag
                });
            }
            
            // 데이터베이스에 리마인더 저장
            await db.createReminder(
                interaction.user.id,
                interaction.channel.id,
                message,
                parsedTime.toISOString()
            );
            
            // 성공 응답
            const formattedTime = formatTime(parsedTime);
            await interaction.reply({
                content: `⏰ **${formattedTime}**에 "${message}" 알림이 설정되었습니다!`,
                ephemeral: true
            });
            
        } catch (error) {
            console.error('리마인더 설정 오류:', error);
            await interaction.reply({
                content: '❌ 리마인더 설정 중 오류가 발생했습니다. 다시 시도해주세요.',
                ephemeral: true
            });
        }
    },
};