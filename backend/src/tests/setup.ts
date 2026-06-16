import { jest, beforeEach } from '@jest/globals';
import { prismaMock } from '../prisma/prismaClient.js';

// Convert all prismaMock placeholder methods into Jest mock functions
for (const modelKey of Object.keys(prismaMock)) {
  const model = (prismaMock as any)[modelKey];
  for (const methodKey of Object.keys(model)) {
    model[methodKey] = jest.fn();
  }
}

export { prismaMock };

// Mock prismaClient.js and assign to global for ESM singleton compatibility
(globalThis as any).prisma = prismaMock;

jest.mock('../prisma/prismaClient.js', () => ({
  __esModule: true,
  prisma: prismaMock,
  prismaMock: prismaMock,
  default: prismaMock,
}));

// Also mock Redis client
jest.mock('../utils/redis.js', () => ({
  __esModule: true,
  getCache: (jest.fn() as any).mockResolvedValue(null),
  setCache: (jest.fn() as any).mockResolvedValue(undefined),
  delCache: (jest.fn() as any).mockResolvedValue(undefined),
  isCacheAvailable: (jest.fn() as any).mockReturnValue(true),
  getRedisClient: (jest.fn() as any).mockReturnValue(null),
}));

// Mock socket broadcasting functions to prevent socket connection errors
jest.mock('../socket/socket.js', () => ({
  __esModule: true,
  initSocket: jest.fn(),
  getIO: jest.fn(),
  sendInAppNotification: jest.fn(),
  broadcastNewReport: jest.fn(),
  broadcastRiskAlert: jest.fn(),
  broadcastIncomingCall: jest.fn(),
  broadcastAnswerCall: jest.fn(),
  broadcastHangupCall: jest.fn(),
}));

// Mock BullMQ background queue tasks to run silently and prevent Redis connection attempts
jest.mock('bullmq', () => ({
  __esModule: true,
  Queue: jest.fn().mockImplementation(() => ({
    add: (jest.fn() as any).mockResolvedValue({ id: 'mock-job-id' }),
  })),
  Worker: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
  })),
}));

// Mock BullMQ background queue tasks to run synchronously or mock
jest.mock('../jobs/worker.js', () => ({
  __esModule: true,
  jobQueue: {
    add: (jest.fn() as any).mockResolvedValue({ id: 'mock-job-id' }),
  },
  recalculatePhoneNumberRisk: (jest.fn() as any).mockResolvedValue(75),
}));


// Clear mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
