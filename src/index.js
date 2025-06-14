require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const database = require('./database');
const scheduler = require('./scheduler');
const fs = require('fs');
const path = require('path');

// Discord 클라이언트 생성
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 명령어 컬렉션
client.commands = new Collection();

// 명령어 로드
function loadCommands() {
    const commandsPath = path.join(__dirname, 'commands');
    
    // commands 폴더가 존재하는지 확인
    if (!fs.existsSync(commandsPath)) {
        console.log('commands 폴더가 없습니다. 생성합니다.');
        fs.mkdirSync(commandsPath, { recursive: true });
        return;
    }

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                console.log(`명령어 로드됨: ${command.data.name}`);
            } else {
                console.log(`[경고] ${filePath}의 명령어에 필수 "data" 또는 "execute" 속성이 없습니다.`);
            }
        } catch (error) {
            console.error(`명령어 로드 실패 ${filePath}:`, error);
        }
    }
}

// 봇 준비 완료 이벤트
client.once('ready', async () => {
    console.log('┌─────────────────────────────────────┐');
    console.log('│     Discord Reminder Bot 시작!     │');
    console.log('├─────────────────────────────────────┤');
    console.log(`│ 봇 이름: ${client.user.tag.padEnd(23)} │`);
    console.log(`│ 서버 수: ${client.guilds.cache.size.toString().padEnd(23)} │`);
    console.log('└─────────────────────────────────────┘');

    try {
        // 데이터베이스 초기화
        await database.init();
        console.log('✅ 데이터베이스 초기화 완료');

        // 명령어 로드
        loadCommands();
        console.log('✅ 명령어 로드 완료');

        // 슬래시 명령어 등록
        await registerSlashCommands();
        console.log('✅ 슬래시 명령어 등록 완료');

        // 스케줄러 시작
        scheduler.init(client);
        console.log('✅ 스케줄러 시작 완료');

    } catch (error) {
        console.error('❌ 봇 초기화 실패:', error);
        process.exit(1);
    }
});

// 슬래시 명령어 등록
async function registerSlashCommands() {
    const commands = [];
    
    // 로드된 명령어를 배열로 변환
    client.commands.forEach(command => {
        commands.push(command.data.toJSON());
    });

    if (commands.length === 0) {
        console.log('등록할 슬래시 명령어가 없습니다.');
        return;
    }

    try {
        console.log(`${commands.length}개의 슬래시 명령어를 등록 중...`);
        
        // 글로벌 명령어 등록 (모든 서버에 적용, 최대 1시간 소요)
        await client.application.commands.set(commands);
        
        console.log('슬래시 명령어 등록 완료!');
    } catch (error) {
        console.error('슬래시 명령어 등록 실패:', error);
    }
}

// 슬래시 명령어 처리
client.on('interactionCreate', async interaction => {
    // 슬래시 명령어가 아니면 무시
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`명령어를 찾을 수 없습니다: ${interaction.commandName}`);
        return;
    }

    try {
        // 명령어 실행
        await command.execute(interaction);
        console.log(`명령어 실행됨: ${interaction.commandName} (사용자: ${interaction.user.tag})`);
    } catch (error) {
        console.error(`명령어 실행 실패: ${interaction.commandName}`, error);
        
        // 사용자에게 에러 메시지 전송
        const errorMessage = '명령어 실행 중 오류가 발생했습니다.';
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

// 에러 핸들링
client.on('error', error => {
    console.error('Discord 클라이언트 에러:', error);
});

client.on('warn', warn => {
    console.warn('Discord 클라이언트 경고:', warn);
});

// 프로세스 종료 시 정리
process.on('SIGINT', () => {
    console.log('\n봇을 종료합니다...');
    database.close();
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n봇을 종료합니다...');
    database.close();
    client.destroy();
    process.exit(0);
});

// 처리되지 않은 에러 캐치
process.on('unhandledRejection', error => {
    console.error('처리되지 않은 Promise 거부:', error);
});

process.on('uncaughtException', error => {
    console.error('처리되지 않은 예외:', error);
    database.close();
    client.destroy();
    process.exit(1);
});

// 환경변수 확인
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN 환경변수가 설정되지 않았습니다.');
    console.error('   .env 파일을 생성하고 DISCORD_TOKEN을 설정해주세요.');
    process.exit(1);
}

// 봇 로그인
client.login(process.env.DISCORD_TOKEN);

// 글로벌 client 객체 내보내기 (다른 모듈에서 사용할 수 있도록)
module.exports = client;