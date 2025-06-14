# Node.js 18 이미지 사용
FROM node:18-alpine

# 작업 디렉토리 설정
WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 소스 코드 복사
COPY src/ ./src/

# 데이터 디렉토리 생성
RUN mkdir -p data

# 포트 노출 (봇은 포트가 필요없지만 헬스체크용)
EXPOSE 3000

# 봇 실행
CMD ["npm", "start"]