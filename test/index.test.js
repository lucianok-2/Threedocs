
jest.mock('../src/app', () => ({
  use: jest.fn(),
  listen: jest.fn(() => ({ on: jest.fn() }))
}));

jest.mock('../src/routes/auth', () => jest.fn());
jest.mock('../src/routes/properties', () => jest.fn());
jest.mock('../src/routes/documents', () => jest.fn());
jest.mock('../src/routes/history', () => jest.fn());

test('index starts server', () => {
  const app = require('../src/app');
  require('../src/index');
  expect(app.listen).toHaveBeenCalled();
});