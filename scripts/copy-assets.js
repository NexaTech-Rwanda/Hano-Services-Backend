const fs = require('fs');
const path = require('path');

function ensureDir(dir) {
     fs.mkdirSync(dir, { recursive: true });
}

function copyFile(src, dest) {
     ensureDir(path.dirname(dest));
     fs.copyFileSync(src, dest);
     console.log(`Copied: ${src} -> ${dest}`);
}

function main() {
     const root = process.cwd();

     const assets = [{
          src: path.join(root, 'src', 'database', 'schema.sql'),
          dest: path.join(root, 'dist', 'database', 'schema.sql'),
     }];

     for (const a of assets) {
          if (!fs.existsSync(a.src)) {
               console.warn(`Skipping missing asset: ${a.src}`);
               continue;
          }
          copyFile(a.src, a.dest);
     }
}

main();
