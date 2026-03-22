const { execSync } = require('child_process');
execSync('npx ncc build dist/index.js -o dist/bundle --minify', { stdio: 'inherit' });
