const fs = require('fs');

const dropPath = 'src/components/AcademicDropdowns.tsx';
let dropContent = fs.readFileSync(dropPath, 'utf8');

dropContent = dropContent.replace(/placeholder=t\(/g, "placeholder={t(");
dropContent = dropContent.replace(/, '([^']+)'\)/g, ", '$1')}");

fs.writeFileSync(dropPath, dropContent);
console.log('Fixed placeholders');
