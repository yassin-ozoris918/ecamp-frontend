const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/InstructorDashboard.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Remove New Course buttons
content = content.replace(/<button onClick=\{\(\) => setCreateCourseOpen\(true\)\}.*?<\/button>/gs, '');
content = content.replace(/<button onClick=\{\(\) => setCreateOpen\(true\)\}.*?<\/button>/gs, '');
content = content.replace(/action=\{[\s\S]*?Create Course[\s\S]*?<\/button>\s*\}/g, 'action={null}');
content = content.replace(/action=\{[\s\S]*?New Course[\s\S]*?<\/button>\s*\}/g, 'action={null}');

// Remove Delete Course buttons
content = content.replace(/<button onClick=\{async \(e\) => \{[\s\S]*?<Trash2 className="w-4 h-4" \/>\s*<\/button>/gs, '');

// Change route from /instructor/course/ to /instructor/courses/
content = content.replace(/\/instructor\/course\//g, '/instructor/courses/');

fs.writeFileSync(filePath, content, 'utf8');
console.log('InstructorDashboard.tsx cleaned.');
