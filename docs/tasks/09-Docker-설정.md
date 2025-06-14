# Task 9: Docker 설정 및 배포 준비

## 목표
Discord 봇을 Docker 컨테이너로 실행할 수 있도록 설정

## 세부 작업

### 9.1 Dockerfile 생성
```dockerfile
FROM node:18-alpine

WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 소스 코드 복사
COPY src/ ./src/

# 데이터 디렉토리 생성
RUN mkdir -p /app/data

# 봇 실행
CMD ["npm", "start"]
```

### 9.2 .dockerignore 파일 생성
```
node_modules
npm-debug.log
.env
.git
.gitignore
README.md
docs/
```

### 9.3 docker-compose.yml 생성
```yaml
version: '3.8'

services:
  discord-bot:
    build: .
    container_name: discord-reminder-bot
    volumes:
      - ./data:/app/data
    environment:
      - DISCORD_TOKEN=${DISCORD_TOKEN}
    restart: unless-stopped
```

### 9.4 환경변수 관리
- `.env.example` 파일 업데이트
- Docker Secrets 사용 가능하도록 설정
- 환경변수 검증 로직

### 9.5 데이터 영속성
- SQLite 데이터베이스 파일을 호스트에 마운트
- 로그 파일 저장 위치 설정
- 백업 스크립트 (선택사항)

### 9.6 Docker 실행 스크립트
```bash
#!/bin/bash
# start.sh

# 환경변수 파일 확인
if [ ! -f .env ]; then
    echo "환경변수 파일 .env가 없습니다."
    exit 1
fi

# Docker Compose로 실행
docker-compose up -d

echo "Discord 봇이 백그라운드에서 실행 중입니다."
```

### 9.7 헬스체크 구현
```javascript
// src/health.js
const express = require('express');
const app = express();

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

app.listen(3000);
```

### 9.8 로그 관리
- Docker 로그 로테이션 설정
- 구조화된 로그 포맷
- 로그 레벨 설정

## 완료 조건
- [ ] Dockerfile 작성 완료
- [ ] docker-compose.yml 설정
- [ ] 데이터 볼륨 마운트 설정
- [ ] 환경변수 관리 시스템
- [ ] Docker 실행 테스트 완료

## 예상 소요시간
1시간