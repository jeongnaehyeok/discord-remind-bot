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
            
            // parsedTime은 이미 로컬(KST) 시간으로 파싱됨
            // UTC로 변환하여 저장 (9시간 빼기)
            const utcTime = new Date(parsedTime.getTime() - (9 * 60 * 60 * 1000));
            
            // 데이터베이스에 리마인더 저장 (UTC)
            await db.createReminder(
                interaction.user.id,
                interaction.channel.id,
                message,
                utcTime.toISOString()
            );
            
            // 성공 응답
            const formattedTime = formatTime(parsedTime);
            await interaction.reply({
                content: `⏰ **${formattedTime}**에 "${message}" 알림이 설정되었습니다!`,
                flags: 64
            });
            
        } catch (error) {
            console.error('리마인더 설정 오류:', error);
            await interaction.reply({
                content: '❌ 리마인더 설정 중 오류가 발생했습니다. 다시 시도해주세요.',
                flags: 64
            });
        }
    },
};