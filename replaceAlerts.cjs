const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('alert(')) {
        console.log('Processing: ' + fullPath);
        
        let newContent = content.replace(/alert\((.*?)\)/g, (match, p1) => {
          const lower = p1.toLowerCase();
          if (lower.includes('fail') || lower.includes('error') || lower.includes('must ') || lower.includes('please ') || lower.includes('already ') || lower.includes('incorrect') || lower.includes('not ') || lower.includes('invalid') || lower.includes('first') || lower.includes('unable')) {
            return 'toast.error(' + p1 + ')';
          } else if (lower.includes('success') || lower.includes('saved') || lower.includes('done') || lower.includes('published')) {
            return 'toast.success(' + p1 + ')';
          } else {
            return 'toast.success(' + p1 + ')'; // Default to success if ambiguous
          }
        });
        
        if (!newContent.includes('import toast from \'react-hot-toast\'')) {
          const lines = newContent.split('\n');
          let insertIdx = 0;
          for (let i = 0; i < lines.length; i++) {
             if (lines[i].startsWith('import ')) {
                insertIdx = i;
                break;
             }
          }
          lines.splice(insertIdx, 0, "import toast from 'react-hot-toast';");
          newContent = lines.join('\n');
        }
        
        fs.writeFileSync(fullPath, newContent);
      }
    }
  }
}

processDir(path.join(process.cwd(), 'src'));
console.log('Done replacing alerts!');
