const modules = [
    '../src/app',
    '../src/firebase',
    '../src/models/document',
    '../src/routes/admin',
    '../src/routes/auth',
    '../src/routes/documents',
    '../src/routes/history',
    '../src/routes/properties'
  ];
  
  describe('server modules load', () => {
    modules.forEach((m) => {
      test(`${m} loads without error`, () => {
        expect(() => require(m)).not.toThrow();
      });
    });
  });