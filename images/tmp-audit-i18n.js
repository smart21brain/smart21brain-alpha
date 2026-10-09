const fs = require('fs');
const path = require('path');
const root = __dirname;
const jsCode = fs.readFileSync(path.join(root, 'js', 'i18n.js'), 'utf8');
const keys = new Set([...jsCode.matchAll(/\b([A-Za-z0-9_]+)\s*:/g)].map((m) => m[1]));
let count = 0;
const missing = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.vscode') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full);
    } else if (entry.name.endsWith('.html')) {
      const html = fs.readFileSync(full, 'utf8');
      const matches = [...html.matchAll(/data-i18n(?:-html|-placeholder)?="([^"]+)"/g)];
      for (const match of matches) {
        count += 1;
        const key = match[1];
        if (!keys.has(key)) missing.push(path.relative(root, full) + ' :: ' + key);
      }
    }
  }
}

walk(root);
console.log('HTML data-i18n hooks checked: ' + count);
console.log('Translation keys defined: ' + keys.size);
console.log('Missing keys: ' + missing.length);
for (const item of missing.slice(0, 50)) {
  console.log(item);
}
