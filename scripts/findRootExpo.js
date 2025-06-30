const fs = require('fs');
const junk = ['App.js','App.tsx','index.js','app.json','expo.entry.js'];
console.log('Checking for stale Expo artifacts in root...\n');
junk.forEach(f => { 
  if (fs.existsSync(f)) {
    console.log('DELETE', f); 
  }
});
console.log('\nScan complete.'); 