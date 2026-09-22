const fs = require('fs');
const dropPath = 'src/components/AcademicDropdowns.tsx';
let dropContent = fs.readFileSync(dropPath, 'utf8');

dropContent = dropContent.replace(/}}<\/label>/g, "}</label>");
dropContent = dropContent.replace(/}}<\/option>/g, "}</option>");

fs.writeFileSync(dropPath, dropContent);
console.log('Fixed double braces');
