
// Global setup for Jest tests
import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import { prisma } from '../lib/prisma';

// Mock Prisma
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  prisma: mockDeep<PrismaClient>(),
}));

beforeEach(() => {
  mockReset(prisma as unknown as DeepMockProxy<PrismaClient>);
});

// Suppress console logs during tests unless they fail
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

global.console.log = jest.fn();
global.console.error = jest.fn();

afterAll(() => {
  global.console.log = originalConsoleLog;
  global.console.error = originalConsoleError;
});
