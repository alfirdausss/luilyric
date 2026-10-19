const packager = require('electron-packager');
const path = require('path');

async function build() {
  console.log('Starting packaging...');
  try {
    const appPaths = await packager({
      dir: path.resolve(__dirname, '..'),
      name: 'LuiLyric',
      platform: 'win32',
      arch: 'x64',
      out: path.resolve(__dirname, '../release'),
      overwrite: true,
      asar: false,
      prune: true,
      ignore: [
        /^\/(src|tests|\.git|\.vscode)/,
      ],
    });
    console.log('Packaging successful! Output:', appPaths);
  } catch (err) {
    console.error('Packaging failed with error:', err);
    process.exit(1);
  }
}

build();
