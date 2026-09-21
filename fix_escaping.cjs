const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'InteractiveQuizClient.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');

fs.writeFileSync(filePath, content);
console.log('Fixed');
