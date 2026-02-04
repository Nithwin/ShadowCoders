/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    verbose: true,
    silent: false,
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
    testMatch: ['**/*.test.ts', '**/*.spec.ts'],
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/**/*.test.ts',
        '!src/__tests__/**',
        '!src/types/**',
        '!src/app.ts',
        '!src/index.ts'
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'json-summary'],
};
