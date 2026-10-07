#!/usr/bin/env node

/**
 * 856-FFCI — Empaquetador simple multiplataforma
 * Ejecutar: node scripts/pack.js
 * 
 * Genera: 856-ffci-v3.1.tar.gz (universal)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const NAME = '856-ffci-v3.1';
const OUTPUT = `${NAME}.tar.gz`;

console.log('');
console.log('  ╔══════════════════════════════════════════╗');
console.log('  ║  856-FFCI v3.1 — Empaquetador            ║');
console.log('  ╚══════════════════════════════════════════╝');
console.log('');

// Verificar que estamos en la raíz
if (!fs.existsSync('package.json')) {
  console.error('  [✗] Error: ejecutar desde la raíz del proyecto');
  process.exit(1);
}

// Eliminar output anterior
if (fs.existsSync(OUTPUT)) fs.unlinkSync(OUTPUT);

const platform = os.platform();
let cmd;

// Exclusiones
const excludes = [
  'node_modules', '.git', 'dist', 'build',
  '.env', '.env.*', '*.db', '*.sqlite',
  'datasets', 'cache', 'exports', '*.log'
];

const excludeFlags = excludes.map(e => `--exclude="${e}"`).join(' ');

if (platform === 'win32') {
  // Windows 10+ tiene tar nativo
  cmd = `tar -czf "${OUTPUT}" ${excludeFlags} -C "${path.dirname(process.cwd())}" "${path.basename(process.cwd())}"`;
} else {
  // macOS / Linux
  cmd = `tar -czf "${OUTPUT}" ${excludeFlags} -C "${path.dirname(process.cwd())}" "${path.basename(process.cwd())}"`;
}

console.log(`  [i] Plataforma: ${platform}`);
console.log(`  [i] Output: ${OUTPUT}`);
console.log('');

try {
  execSync(cmd, { stdio: 'inherit' });
  
  const stats = fs.statSync(OUTPUT);
  const sizeKB = (stats.size / 1024).toFixed(1);
  
  console.log('');
  console.log(`  ✓ Paquete creado: ${OUTPUT} (${sizeKB} KB)`);
  console.log('');
  console.log('  Contenido incluido:');
  console.log('    ├── README.md');
  console.log('    ├── .gitignore');
  console.log('    ├── index.html');
  console.log('    ├── package.json');
  console.log('    ├── tsconfig.json');
  console.log('    ├── vite.config.js');
  console.log('    ├── scripts/');
  console.log('    └── src/');
  console.log('        ├── App.tsx');
  console.log('        ├── main.tsx');
  console.log('        ├── index.css');
  console.log('        └── components/ (8 archivos)');
  console.log('');
  console.log('  Excluido: node_modules, dist, .env, *.db');
  console.log('');
  console.log('  Para extraer:');
  console.log(`    tar -xzf ${OUTPUT}`);
  console.log('');
  console.log('  Después de extraer:');
  console.log('    cd 856-ffci-v3.1');
  console.log('    npm install');
  console.log('    npm run dev');
  console.log('');
  
} catch (error) {
  console.error('');
  console.error('  [✗] Error al empaquetar');
  console.error('');
  console.error('  Alternativa manual:');
  if (platform === 'win32') {
    console.error('    PowerShell:');
    console.error('    Compress-Archive -Path "src","index.html","package.json","README.md" -DestinationPath "856-ffci.zip"');
  } else {
    console.error(`    tar -czf ${OUTPUT} --exclude="node_modules" --exclude="dist" .`);
  }
  process.exit(1);
}
