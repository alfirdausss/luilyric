const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const electronDist = path.join(rootDir, 'node_modules/electron/dist');
const releaseDir = path.join(rootDir, 'release/LuiLyric');
const appDir = path.join(releaseDir, 'resources/app');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const file of fs.readdirSync(src)) {
      copyRecursive(path.join(src, file), path.join(dest, file));
    }
  } else {
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    try {
      fs.copyFileSync(src, dest);
    } catch (err) {
      if (err.code === 'EBUSY' && fs.existsSync(dest)) {
        console.warn(`[Skip locked file] ${dest} sedang aktif digunakan.`);
      } else {
        throw err;
      }
    }
  }
}

async function packageApp() {
  console.log('=== [LuiLyric] Memulai Pembuatan Portable Executable ===');

  // 1. Siapkan folder release
  if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(releaseDir, { recursive: true });
  }

  // Bersihkan resources/app lama jika ada
  if (fs.existsSync(appDir)) {
    console.log('[1/5] Membersihkan resources/app sebelumnya...');
    try {
      fs.rmSync(appDir, { recursive: true, force: true });
    } catch (e) {
      console.warn('Peringatan saat membersihkan appDir lama:', e.message);
    }
  }
  fs.mkdirSync(appDir, { recursive: true });

  // 2. Salin seluruh runtime Electron jika belum ada
  console.log('[2/5] Menyalin Electron Runtime & DLL dependencies...');
  for (const item of fs.readdirSync(electronDist)) {
    if (item === 'resources') continue; // kita buat resources sendiri
    if (item === 'electron.exe') {
      const targetExe = path.join(releaseDir, 'LuiLyric.exe');
      if (!fs.existsSync(targetExe)) {
        copyRecursive(path.join(electronDist, item), targetExe);
      }
      continue;
    }
    const dest = path.join(releaseDir, item);
    if (!fs.existsSync(dest)) {
      copyRecursive(path.join(electronDist, item), dest);
    }
  }

  // 3. Buat direktori resources/app
  console.log('[3/5] Menyiapkan paket aplikasi (dist, dist-electron, native NDI)...');
  fs.mkdirSync(appDir, { recursive: true });

  // Salin bundle frontend (dist)
  copyRecursive(path.join(rootDir, 'dist'), path.join(appDir, 'dist'));

  // Salin bundle backend electron (dist-electron)
  copyRecursive(path.join(rootDir, 'dist-electron'), path.join(appDir, 'dist-electron'));

  // Salin native NDI sender
  copyRecursive(
    path.join(rootDir, 'native/ndi/LuiLyricNdiSender.exe'),
    path.join(appDir, 'native/ndi/LuiLyricNdiSender.exe')
  );

  // Buat package.json khusus untuk release app
  const appPackageJson = {
    name: 'luilyric',
    version: '1.0.0',
    main: 'dist-electron/main.js',
    dependencies: {
      'ws': '^8.22.0',
      'qrcode': '^1.5.4',
      'lucide-react': '^0.454.0'
    }
  };
  fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify(appPackageJson, null, 2));

  // 4. Install dependensi produksi di dalam resources/app
  console.log('[4/5] Menginstal modul runtime produksi (ws, qrcode)...');
  const { execSync } = require('child_process');
  execSync('npm install --omit=dev', { cwd: appDir, stdio: 'inherit' });

  // 5. Buat starter batch script di root agar praktis
  console.log('[5/5] Membuat launcher shortcut di root...');
    const launcherBatContent = `@echo off\r\ncd /d "%~dp0release\\LuiLyric"\r\nstart "" "LuiLyric.exe"\r\nexit\r\n`;
    fs.writeFileSync(path.join(rootDir, 'LuiLyric.bat'), launcherBatContent);

  console.log('\n======================================================');
  console.log('  SUKSES! Portable Windows Executable siap digunakan:');
  console.log('  - Exe Langsung : release\\LuiLyric\\LuiLyric.exe');
  console.log('  - Launcher Cepat: LuiLyric.bat (di folder root)');
  console.log('======================================================\n');
}

packageApp().catch(err => {
  console.error('Fatal error saat packaging:', err);
  process.exit(1);
});
