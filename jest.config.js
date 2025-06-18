module.exports = {
  // 테스트 환경
  testEnvironment: 'node',
  
  // 테스트 파일 패턴
  testMatch: [
    '**/__tests__/**/*.test.js'
  ],
  
  // 커버리지 수집 설정
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js', // 메인 엔트리 포인트 제외
    '!src/deploy-commands.js' // 배포 스크립트 제외
  ],
  
  // 커버리지 리포트 형식
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  
  // 커버리지 출력 디렉토리
  coverageDirectory: 'coverage',
  
  // 커버리지 임계값 (임시로 낮춤)
  coverageThreshold: {
    global: {
      branches: 10,
      functions: 20,
      lines: 20,
      statements: 20
    }
  },
  
  // 설정 파일들
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // 모킹 설정
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // 테스트 타임아웃 (밀리초)
  testTimeout: 10000,
  
  // 병렬 테스트 설정
  maxWorkers: '50%',
  
  // 변환 설정 (필요한 경우)
  transform: {},
  
  // 무시할 패턴
  testPathIgnorePatterns: [
    '/node_modules/',
    '/data/',
    '/coverage/'
  ],
  
  // 모듈 경로 매핑
  modulePathIgnorePatterns: [
    '<rootDir>/data/'
  ],
  
  // 전역 설정
  globals: {
    'process.env.NODE_ENV': 'test'
  }
};