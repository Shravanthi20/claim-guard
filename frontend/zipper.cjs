const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, 'dist');
const outputZip = path.join(__dirname, 'amplify-deploy.zip');

// Use 7-zip if available, otherwise use PowerShell differently
// Walk dist and show structure first
function walkDir(dir, prefix = '') {
  const items = fs.readdirSync(dir);
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      console.log(prefix + item + '/');
      walkDir(fullPath, prefix + '  ');
    } else {
      console.log(prefix + item + ' (' + stat.size + ' bytes)');
    }
  });
}

console.log('dist/ contents:');
walkDir(distDir);
console.log('');

// Use JSZip to create the zip
const JSZip = require('jszip');
const zip = new JSZip();

function addFolderToZip(zip, folderPath, zipPath) {
  const items = fs.readdirSync(folderPath);
  items.forEach(item => {
    const fullPath = path.join(folderPath, item);
    const zipEntry = zipPath ? zipPath + '/' + item : item;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      addFolderToZip(zip, fullPath, zipEntry);
    } else {
      zip.file(zipEntry, fs.readFileSync(fullPath));
    }
  });
}

addFolderToZip(zip, distDir, '');

zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
  .then(content => {
    fs.writeFileSync(outputZip, content);
    console.log('Created:', outputZip, '(' + content.length + ' bytes)');
    
    // List zip contents
    const JSZip2 = require('jszip');
    JSZip2.loadAsync(fs.readFileSync(outputZip)).then(z => {
      console.log('\nZip contents:');
      Object.keys(z.files).forEach(f => console.log(' ', f));
    });
  });
