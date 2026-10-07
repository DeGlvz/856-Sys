#!/usr/bin/env node

/**
 * 856-FFCI — Script de empaquetado ZIP
 * Ejecutar: node scripts/create-zip.js
 * 
 * Genera: 856-ffci-v3.1.zip en la raíz del proyecto
 * Excluye: node_modules, dist, .env, archivos sensibles
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PROJECT_NAME = '856-ffci-v3.1';
const ZIP_NAME = `${PROJECT_NAME}.zip`;

// Archivos/carpetas a excluir
const EXCLUDES = [
  'node_modules',
  'dist',
  'build',
  '.git',
  '.env*',
  '*.db',
  '*.sqlite',
  '*.sqlite3',
  'datasets',
  'cache',
  'exports',
  '*.log',
  'list_sources.yaml'
];

console.log('╔════════════════════════════════════════════════════════╗');
console.log('║  856-FFCI v3.1 — Generador de paquete ZIP             ║');
console.log('╚════════════════════════════════════════════════════════╝');
console.log('');

// Detectar sistema operativo
const platform = os.platform();
console.log(`[i] Sistema detectado: ${platform}`);
console.log(`[i] Directorio: ${process.cwd()}`);
console.log('');

// Verificar que estamos en la raíz del proyecto
if (!fs.existsSync(path.join(process.cwd(), 'package.json'))) {
  console.error('[✗] Error: Ejecutar desde la raíz del proyecto (donde está package.json)');
  process.exit(1);
}

// Eliminar ZIP anterior si existe
if (fs.existsSync(ZIP_NAME)) {
  fs.unlinkSync(ZIP_NAME);
  console.log(`[i] ZIP anterior eliminado: ${ZIP_NAME}`);
}

let command;

if (platform === 'win32') {
  // Windows: usar PowerShell
  console.log('[i] Usando PowerShell para comprimir...');
  
  // Construir exclusiones para PowerShell
  const excludeArgs = EXCLUDES.map(e => `-Exclude "${e}"`).join(' ');
  
  // PowerShell no soporta exclusión recursiva fácilmente, usamos un approach diferente
  // Creamos un script temporal de PowerShell
  const psScript = `
$source = "${process.cwd()}"
$dest = "${path.join(process.cwd(), ZIP_NAME)}"
$tempDir = "${path.join(os.tmpdir(), PROJECT_NAME)}"

# Limpiar temp
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copiar archivos excluyendo patrones
Get-ChildItem -Path $source -Recurse | Where-Object {
  $relPath = $_.FullName.Substring($source.Length + 1)
  $exclude = $false
  foreach ($pattern in @(${EXCLUDES.map(e => `"${e}"`).join(',')})) {
    if ($relPath -like "*$pattern*") { $exclude = $true; break }
  }
  -not $exclude
} | ForEach-Object {
  if (-not $_.PSIsContainer) {
    $destPath = Join-Path $tempDir $_.FullName.Substring($source.Length + 1)
    $destDir = Split-Path $destPath -Parent
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    Copy-Item $_.FullName $destPath
  }
}

# Comprimir
if (Test-Path $dest) { Remove-Item $dest -Force }
Compress-Archive -Path $tempDir -DestinationPath $dest

# Limpiar temp
Remove-Item $tempDir -Recurse -Force

Write-Host "ZIP creado: $dest"
`;
  
  const psScriptPath = path.join(os.tmpdir(), 'create-zip.ps1');
  fs.writeFileSync(psScriptPath, psScript);
  
  command = `powershell -ExecutionPolicy Bypass -File "${psScriptPath}"`;
  
} else {
  // macOS / Linux: usar zip nativo
  console.log('[i] Usando comando zip nativo...');
  
  const excludeArgs = EXCLUDES.map(e => `-x "**/${e}/*" "**/${e}"`).join(' ');
  command = `zip -r "${ZIP_NAME}" . ${excludeArgs}`;
}

try {
  console.log('[i] Ejecutando compresión...');
  console.log('');
  
  execSync(command, { stdio: 'inherit', cwd: process.cwd() });
  
  console.log('');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log(`║  ✓ ZIP creado exitosamente: ${ZIP_NAME.padEnd(26)}║`);
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log('');
  
  // Mostrar tamaño
  const stats = fs.statSync(ZIP_NAME);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`[i] Tamaño: ${sizeMB} MB`);
  console.log('');
  console.log('[i] Próximos pasos:');
  console.log('    1. Subir a GitHub:');
  console.log('       git init');
  console.log('       git add .');
  console.log('       git commit -m "856-FFCI v3.1"');
  console.log('       git remote add origin https://github.com/USER/856-ffci.git');
  console.log('       git push -u origin main');
  console.log('');
  console.log('    2. O desplegar en GitHub Pages:');
  console.log('       npm install -D gh-pages');
  console.log('       npm run deploy');
  
} catch (error) {
  console.error('');
  console.error('[✗] Error al crear el ZIP:');
  console.error(error.message);
  console.error('');
  console.error('[i] Alternativa manual:');
  if (platform === 'win32') {
    console.error('    PowerShell: Compress-Archive -Path "." -DestinationPath "856-ffci.zip"');
  } else {
    console.error('    Terminal: zip -r 856-ffci.zip . -x "node_modules/*" "dist/*"');
  }
  process.exit(1);
}
