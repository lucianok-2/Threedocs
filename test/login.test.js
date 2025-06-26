// src/__tests__/login.test.js
import '@testing-library/jest-dom';

// global.fetch, global.alert, window.localStorage, and document.cookie WILL be mocked.
// window.location will NOT be explicitly mocked by the test suite. We'll use JSDOM's default.

global.fetch = jest.fn();
global.alert = jest.fn();

const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; }, // Added for completeness
    clear: () => { store = {}; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, writable: true, configurable: true });

let mockCookieStore = '';
Object.defineProperty(document, 'cookie', {
  get: () => mockCookieStore,
  set: (value) => { mockCookieStore = value; },
  configurable: true
});

describe('Login Functionality', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div>
        <input type='text' id='username' />
        <input type='password' id='password' />
        <button id='login-btn'>Login</button>
      </div>
    `;

    // Reset modules to ensure login.js is loaded fresh for each test,
    // picking up the fresh mocks for fetch, alert, localStorage, cookie.
    jest.resetModules();
    require('../public/login.js');

    // Clear mocks
    fetch.mockClear();
    alert.mockClear();
    mockLocalStorage.clear();
    mockCookieStore = '';
    // No window.location mocks to clear here
  });

  test('should attempt login, call fetch, and store token on success (redirection not asserted)', async () => {
    const emailInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-btn');

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'test-token-123' }),
    });

    emailInput.value = 'test@example.com';
    passwordInput.value = 'password123';
    loginButton.click();

    await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async operations

    expect(fetch).toHaveBeenCalledWith('/auth', expect.objectContaining({
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
    }));
    expect(localStorage.getItem('token')).toBe('test-token-123');
    expect(document.cookie).toBe('token=test-token-123; path=/; max-age=86400; SameSite=Strict');
    expect(alert).not.toHaveBeenCalled();
    // JSDOM will output a 'Not implemented: navigation' console error here, which is expected.
  });

  test('should show an alert on failed login', async () => {
    const emailInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-btn');

    fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Invalid credentials' }),
    });

    emailInput.value = 'wrong@example.com';
    passwordInput.value = 'wrongpassword';
    loginButton.click();

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(fetch).toHaveBeenCalledWith('/auth', expect.objectContaining({
      body: JSON.stringify({ email: 'wrong@example.com', password: 'wrongpassword' }),
    }));
    expect(alert).toHaveBeenCalledWith('Invalid credentials');
    expect(localStorage.getItem('token')).toBeNull();
    expect(mockCookieStore).toBe(''); // Check our mock store
  });

  test('should show a generic error alert on network error', async () => {
    const emailInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const loginButton = document.getElementById('login-btn');

    fetch.mockRejectedValueOnce(new Error('Network failed'));

    emailInput.value = 'test@example.com';
    passwordInput.value = 'password123';
    loginButton.click();

    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(alert).toHaveBeenCalledWith('Error al conectar con el servidor');
    expect(localStorage.getItem('token')).toBeNull();
    expect(mockCookieStore).toBe(''); // Check our mock store
  });
});
