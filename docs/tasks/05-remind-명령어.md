# Task 5: /remind 슬래시 명령어 구현

## 목표
메인 기능인 `/remind [시간] [메시지]` 슬래시 명령어 구현

## 세부 작업

### 5.1 명령어 파일 생성
`src/commands/remind.js` 파일 생성

### 5.2 슬래시 명령어 정의
```javascript
const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
    .setName('remind')
    .setDescription('리마인더를 설정합니다')
    .addStringOption(option =>
        option.setName('time')
            .setDescription('언제 알림을 받을지 (예: 30분, 2시간, 내일 오후 3시)')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('message')
            .setDescription('리마인더 메시지')
            .setRequired(true));
```

### 5.3 명령어 실행 로직
- 시간 파싱 (timeParser 사용)
- 데이터베이스에 리마인더 저장
- 사용자에게 확인 메시지 전송

### 5.4 응답 메시지 구현
```javascript
// 성공 시
interaction.reply(`⏰ ${parsedTime}에 "${message}" 알림이 설정되었습니다!`);

// 실패 시
interaction.reply('❌ 시간 형식을 확인해주세요. (예: 30분, 2시간, 내일 오후 3시)');
```

### 5.5 에러 처리
- 시간 파싱 실패
- 데이터베이스 저장 실패
- 권한 문제

## 완료 조건
- [ ] remind.js 명령어 파일 생성
- [ ] 슬래시 명령어 등록 완료
- [ ] 시간 파싱 연동
- [ ] 데이터베이스 저장 기능
- [ ] 사용자 피드백 메시지

## 예상 소요시간
1시간