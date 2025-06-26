process.env.FIREBASE_ADMIN_KEY = JSON.stringify({
    project_id: 'test',
    private_key: 'key',
    client_email: 'test@test.com'
  });
  
  jest.mock('firebase-admin', () => {
    return {
      credential: { cert: jest.fn() },
      initializeApp: jest.fn(),
      firestore: jest.fn(() => ({ collection: jest.fn() })),
      storage: jest.fn(() => ({})),
      auth: jest.fn(() => ({ verifyIdToken: jest.fn() }))
    };
  });