module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['@swc/jest', { jsc: { target: 'es2022', parser: { syntax: 'typescript' } } }],
  },
};
