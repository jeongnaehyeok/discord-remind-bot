# Task 7: /remind-list 명령어 구현

## 목표
사용자가 설정한 리마인더 목록을 조회할 수 있는 명령어 구현

## 세부 작업

### 7.1 명령어 파일 생성
`src/commands/remind-list.js` 파일 생성

### 7.2 슬래시 명령어 정의
```javascript
const data = new SlashCommandBuilder()
    .setName('remind-list')
    .setDescription('설정된 리마인더 목록을 확인합니다');
```

### 7.3 리마인더 목록 조회
- 사용자 ID로 개인 리마인더 조회
- 시간 순으로 정렬
- 최대 10개까지 표시

### 7.4 Embed 메시지 구현
```javascript
const { EmbedBuilder } = require('discord.js');

const embed = new EmbedBuilder()
    .setTitle('📋 내 리마인더 목록')
    .setColor(0x0099FF)
    .setTimestamp();

// 각 리마인더를 필드로 추가
embed.addFields({
    name: `${index + 1}. ${formatTime(reminder.remind_time)}`,
    value: reminder.message,
    inline: false
});
```

### 7.5 시간 포맷팅
```javascript
function formatTime(datetime) {
    // "2024-01-15 14:30" -> "1월 15일 오후 2시 30분"
    // 상대적 시간도 표시 ("3시간 후")
}
```

### 7.6 빈 목록 처리
- 리마인더가 없는 경우 안내 메시지
- 첫 리마인더 설정 가이드

### 7.7 페이지네이션 (선택사항)
- 리마인더가 많은 경우 페이지 분할
- 이전/다음 버튼

## 완료 조건
- [ ] remind-list.js 명령어 파일 생성
- [ ] 데이터베이스 조회 기능
- [ ] Embed 메시지 구현
- [ ] 시간 포맷팅 함수
- [ ] 빈 목록 처리

## 예상 소요시간
45분