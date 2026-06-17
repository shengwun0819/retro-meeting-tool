import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.(js|jsx|ts|tsx|mjs|cjs)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  reporters: [
    'default',
    ['jest-allure2-reporter', { resultsDir: 'allure-results' }],
  ],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'lib/**/*.ts',
    'components/**/*.tsx',
    '!components/**/*.stories.tsx',
  ],
}

export default config
