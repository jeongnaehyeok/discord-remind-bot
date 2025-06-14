# Task 8: /remind-delete 명령어 구현

## 목표
사용자가 설정한 리마인더를 삭제할 수 있는 명령어 구현

## 세부 작업

### 8.1 명령어 파일 생성
`src/commands/remind-delete.js` 파일 생성

### 8.2 슬래시 명령어 정의
```javascript
const data = new SlashCommandBuilder()
    .setName('remind-delete')
    .setDescription('리마인더를 삭제합니다')
    .addIntegerOption(option =>
        option.setName('number')
            .setDescription('삭제할 리마인더 번호 (/remind-list에서 확인)')
            .setRequired(true)
            .setMinValue(1));
```

### 8.3 리마인더 삭제 로직
- 사용자 리마인더 목록 조회
- 번호로 특정 리마인더 선택
- 권한 확인 (본인 리마인더만 삭제 가능)
- 데이터베이스에서 삭제

### 8.4 번호 기반 삭제 시스템
```javascript
// remind-list에서 보여주는 순서와 동일한 번호 사용
const reminders = await getUserReminders(userId);
const targetReminder = reminders[number - 1]; // 1-based -> 0-based
```

### 8.5 확인 메시지
```javascript
// 삭제 전 확인
const confirmEmbed = new EmbedBuilder()
    .setTitle('🗑️ 리마인더 삭제 확인')
    .setDescription(`정말로 이 리마인더를 삭제하시겠습니까?\n\n**${reminder.message}**\n${formatTime(reminder.remind_time)}`)
    .setColor(0xFF0000);
```

### 8.6 버튼 인터랙션
```javascript
const { ButtonBuilder, ActionRowBuilder } = require('discord.js');

const confirmButton = new ButtonBuilder()
    .setCustomId('confirm_delete')
    .setLabel('삭제')
    .setStyle(ButtonStyle.Danger);

const cancelButton = new ButtonBuilder()
    .setCustomId('cancel_delete')
    .setLabel('취소')
    .setStyle(ButtonStyle.Secondary);
```

### 8.7 에러 처리
- 잘못된 번호 입력
- 존재하지 않는 리마인더
- 권한 없는 리마인더 삭제 시도

## 완료 조건
- [ ] remind-delete.js 명령어 파일 생성
- [ ] 번호 기반 삭제 시스템
- [ ] 권한 확인 로직
- [ ] 확인 버튼 인터랙션
- [ ] 에러 처리 및 피드백

## 예상 소요시간
1시간