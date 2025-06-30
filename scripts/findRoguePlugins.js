const glob = require('glob');
const fs = require('fs');

console.log('Scanning for rogue "plugins:" blocks outside mobile/teacher-app...\n');

glob.sync('**/*.{js,ts,jsx,tsx}', { ignore: ['node_modules/**','mobile/teacher-app/**'] })
  .forEach(f => {
    const txt = fs.readFileSync(f,'utf8');
    if (/plugins\s*:/g.test(txt)) {
      console.log(`Found plugins config in: ${f}`);
      // Show the line with plugins
      const lines = txt.split('\n');
      lines.forEach((line, i) => {
        if (/plugins\s*:/g.test(line)) {
          console.log(`  Line ${i+1}: ${line.trim()}`);
        }
      });
      console.log('');
    }
  });

console.log('Scan complete.'); 