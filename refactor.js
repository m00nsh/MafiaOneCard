const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'apps', 'frontend');
if (!fs.existsSync(targetDir)) {
    console.log('Creating target dir...');
    fs.mkdirSync(targetDir, { recursive: true });
}

const filesToMove = ['src', 'guidelines', 'index.html', 'package.json', 'vite.config.ts', 'postcss.config.mjs', 'README.md', 'ATTRIBUTIONS.md'];

filesToMove.forEach(file => {
    const oldPath = path.join(__dirname, file);
    const newPath = path.join(targetDir, file);
    if (fs.existsSync(oldPath)) {
        console.log(`Moving ${file} to ${newPath}...`);
        try {
            fs.renameSync(oldPath, newPath);
            console.log(`Successfully moved ${file}`);
        } catch (e) {
            console.error(`Failed to move ${file}: ${e.message}`);
        }
    } else {
        console.log(`Skipping ${file} (not found)`);
    }
});
