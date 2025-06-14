const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('봇의 응답 시간을 확인합니다'),
    
    async execute(interaction) {
        const sent = await interaction.reply({ 
            content: 'Pong! 🏓', 
            fetchReply: true 
        });
        
        const timeDiff = sent.createdTimestamp - interaction.createdTimestamp;
        
        await interaction.editReply(
            `🏓 Pong!\n` +
            `📶 지연시간: ${timeDiff}ms\n` +
            `💓 API 지연시간: ${Math.round(interaction.client.ws.ping)}ms`
        );
    },
};