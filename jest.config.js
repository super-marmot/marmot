/** Tests cover the pure modules (agent core + import logic) — no React Native runtime needed. */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src/agent', '<rootDir>/src/lib/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: { module: 'commonjs', jsx: 'react-jsx', types: ['jest', 'node'] } }],
  },
}
