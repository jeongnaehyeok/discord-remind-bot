# Discord Reminder Bot

간단한 디스코드 리마인더 봇

## 기능

- `/remind [시간] [메시지]` - 리마인더 설정
- `/remind-list` - 내 리마인더 목록 확인
- `/remind-delete [번호]` - 리마인더 삭제

## Discord 봇 설정

1. [Discord Developer Portal](https://discord.com/developers/applications)에서 새 애플리케이션 생성
2. 'Bot' 섹션에서 봇 생성 및 토큰 복사
3. 'OAuth2 > URL Generator'에서 다음 권한 선택:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Send Messages`, `Use Slash Commands`
   2147485696
4. 생성된 URL로 봇을 서버에 초대

## 설치 및 실행

1. 의존성 설치
```bash
npm install
```

2. 환경변수 설정
```bash
cp .env.example .env
# .env 파일의 DISCORD_TOKEN에 실제 봇 토큰 입력
```

3. 봇 실행
```bash
npm start
```

개발 모드:
```bash
npm run dev
```

## 지원하는 시간 형식

- `30분`, `2시간`, `3일`
- `내일`, `오늘`
- `오후 3시`, `오전 9시`
- `내일 오후 2시`