const fs = require('fs');
const path = require('path');

function getJsFiles(dir) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
      results = results.concat(getJsFiles(fullPath));
    } else if (entry.name.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('JS files compile without syntax errors', () => {
  const jsFiles = getJsFiles(path.join(__dirname, '..', 'src'));
  jsFiles.forEach(file => {
    test(`${path.relative(path.join(__dirname, '..'), file)} parses correctly`, () => {
      const content = fs.readFileSync(file, 'utf8');
      expect(() => new Function(content)).not.toThrow();
    });
  });
});