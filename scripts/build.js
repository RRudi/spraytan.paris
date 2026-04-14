const fs = require('fs');
const path = require('path');

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const version = 'v' + pkg.version;

const now = new Date();
const buildDate = now.toLocaleDateString('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Europe/Paris'
});

const indexPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

html = html
  .replace(/__BUILD_VERSION__/g, version)
  .replace(/__BUILD_DATE__/g, buildDate);

fs.writeFileSync(indexPath, html, 'utf8');

console.log(`✅ Build terminé : ${version} — ${buildDate}`);
