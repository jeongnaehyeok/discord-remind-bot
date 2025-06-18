// Jest 전역 설정 파일

// 테스트 환경 변수 설정
process.env.NODE_ENV = 'test';
process.env.DATABASE_PATH = ':memory:'; // 메모리 데이터베이스 사용

// 콘솔 로그 억제 (필요한 경우)
if (process.env.SUPPRESS_LOGS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  };
}

// 전역 테스트 유틸리티
global.testUtils = {
  // 시간 관련 유틸리티
  mockDate: (dateString) => {
    const mockDate = new Date(dateString);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    return mockDate;
  },
  
  // 랜덤 문자열 생성
  randomString: (length = 10) => {
    return Math.random().toString(36).substring(2, length + 2);
  },
  
  // 랜덤 사용자 ID 생성
  randomUserId: () => {
    return `user_${Math.random().toString(36).substring(2, 10)}`;
  },
  
  // 랜덤 채널 ID 생성
  randomChannelId: () => {
    return `channel_${Math.random().toString(36).substring(2, 10)}`;
  },
  
  // 테스트용 리마인더 데이터 생성
  createMockReminder: (overrides = {}) => {
    return {
      id: Math.floor(Math.random() * 1000) + 1,
      user_id: global.testUtils.randomUserId(),
      channel_id: global.testUtils.randomChannelId(),
      message: '테스트 리마인더',
      remind_time: new Date(Date.now() + 3600000).toISOString(), // 1시간 후
      repeat_type: null,
      repeat_interval: null,
      created_at: new Date().toISOString(),
      ...overrides
    };
  },
  
  // 테스트용 반복 리마인더 데이터 생성
  createMockRepeatReminder: (type = 'days', interval = 1, overrides = {}) => {
    return global.testUtils.createMockReminder({
      repeat_type: type,
      repeat_interval: interval,
      ...overrides
    });
  },
  
  // 테스트용 스케줄 리마인더 데이터 생성
  createMockScheduledReminder: (schedule, overrides = {}) => {
    return global.testUtils.createMockReminder({
      repeat_type: 'scheduled',
      repeat_interval: JSON.stringify(schedule),
      ...overrides
    });
  }
};

// 테스트 시작 전 실행
beforeAll(async () => {
  // 전역 설정이 필요한 경우 여기에 추가
});

// 각 테스트 전 실행
beforeEach(() => {
  // 각 테스트마다 초기화가 필요한 경우 여기에 추가
  jest.clearAllTimers();
});

// 각 테스트 후 실행
afterEach(() => {
  // 테스트 후 정리가 필요한 경우 여기에 추가
  jest.restoreAllMocks();
  jest.useRealTimers();
});

// 모든 테스트 종료 후 실행
afterAll(async () => {
  // 전역 정리가 필요한 경우 여기에 추가
});