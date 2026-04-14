const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

try {
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
  const version = 'v' + pkg.version;

  const now = new Date();
  const buildDate = now.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Europe/Paris'
  });

  // Copy all source files to dist/
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true });
  }
  fs.mkdirSync(distDir);

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === 'dist' || entry.name === 'node_modules' || entry.name === '.git') continue;
    const src = path.join(rootDir, entry.name);
    const dest = path.join(distDir, entry.name);
    if (entry.isDirectory()) {
      fs.cpSync(src, dest, { recursive: true });
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  // Inject version and date into dist/index.html
  const indexPath = path.join(distDir, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  html = html
    .replace(/__BUILD_VERSION__/g, version)
    .replace(/__BUILD_DATE__/g, buildDate);
  fs.writeFileSync(indexPath, html, 'utf8');

  console.log(`✅ Build terminé : ${version} — ${buildDate}`);
} catch (err) {
  console.error('❌ Erreur lors du build :', err.message);
  process.exit(1);
}
