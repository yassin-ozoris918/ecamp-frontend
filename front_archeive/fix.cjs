const fs = require('fs');
const path = require('path');
const dir = 'c:/LMS/lms-frontend/src/components';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
files.forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  if (content.includes("import { useAuth } from '../lib/auth';")) {
    content = content.replace("import { useAuth } from '../lib/auth';", "import { useAuth } from '../lib/authContext';");
    fs.writeFileSync(p, content);
    console.log(`Fixed ${f}`);
  }
});
