beforeEach(() => {
    document.body.innerHTML = `
      <button id="login-btn"></button>
      <input id="username">
      <input id="password">
      <select id="property-select"></select>
      <button id="bulk-upload-button"></button>
      <input id="bulk-file-input">
      <button id="process-bulk-files-button"></button>
      <div id="bulk-upload-feedback"></div>
      <button id="cancel-bulk-upload"></button>
      <button id="close-bulk-upload-modal"></button>
    `;
  });
  
  test('client modules load without error', () => {
    const modules = [
      '../src/public/login.js',
      '../src/public/properties.js',
      '../src/public/upload.js',
      '../src/public/js/bulk-upload.js',
      '../src/public/js/dashboard.js',
      '../src/public/js/forgot-password.js',
      '../src/public/js/galery.js',
      '../src/public/js/history.js',
      '../src/public/js/modals.js',
      '../src/public/js/sidebar.js'
    ];
  
    modules.forEach((m) => {
      expect(() => require(m)).not.toThrow();
    });
  });