const fs = require('fs');
const path = require('path');

// 1. Update AcademicDropdowns.tsx
const dropPath = 'src/components/AcademicDropdowns.tsx';
let dropContent = fs.readFileSync(dropPath, 'utf8');

if (!dropContent.includes("useTranslation")) {
  dropContent = dropContent.replace(
    "import { api } from '../lib/api';",
    "import { api } from '../lib/api';\nimport { useTranslation } from 'react-i18next';"
  );
  
  dropContent = dropContent.replace(
    "export function AcademicDropdowns({",
    "export function AcademicDropdowns({\n"
  );
  
  dropContent = dropContent.replace(
    "}: AcademicDropdownsProps) {",
    "}: AcademicDropdownsProps) {\n  const { t } = useTranslation();\n"
  );
  
  // Replace labels
  dropContent = dropContent.replace(/>University<\/label>/g, ">{t('auth.university', 'University')}</label>");
  dropContent = dropContent.replace(/>Faculty<\/label>/g, ">{t('auth.faculty', 'Faculty')}</label>");
  dropContent = dropContent.replace(/>Department<\/label>/g, ">{t('auth.department', 'Department')}</label>");
  dropContent = dropContent.replace(/>Program<\/label>/g, ">{t('auth.program', 'Program')}</label>");
  dropContent = dropContent.replace(/>Faculty Name<\/label>/g, ">{t('auth.facultyName', 'Faculty Name')}</label>");
  dropContent = dropContent.replace(/>Department Name<\/label>/g, ">{t('auth.departmentName', 'Department Name')}</label>");
  dropContent = dropContent.replace(/>Program Name<\/label>/g, ">{t('auth.programName', 'Program Name')}</label>");
  
  // Replace options
  dropContent = dropContent.replace(/>Select University\.\.\.<\/option>/g, ">{t('auth.selectUniversity', 'Select University...')}</option>");
  dropContent = dropContent.replace(/>Select Faculty\.\.\.<\/option>/g, ">{t('auth.selectFaculty', 'Select Faculty...')}</option>");
  dropContent = dropContent.replace(/>Select Department\.\.\.<\/option>/g, ">{t('auth.selectDepartment', 'Select Department...')}</option>");
  dropContent = dropContent.replace(/>Select Program\.\.\.<\/option>/g, ">{t('auth.selectProgram', 'Select Program...')}</option>");
  
  // Replace placeholders
  dropContent = dropContent.replace(/"Enter University Name"/g, "t('auth.enterUniversityName', 'Enter University Name')");
  dropContent = dropContent.replace(/"Enter Faculty Name"/g, "t('auth.enterFacultyName', 'Enter Faculty Name')");
  dropContent = dropContent.replace(/"Enter Department Name"/g, "t('auth.enterDepartmentName', 'Enter Department Name')");
  dropContent = dropContent.replace(/"Enter Program Name"/g, "t('auth.enterProgramName', 'Enter Program Name')");
  
  dropContent = dropContent.replace(/"Enter Faculty Name \(Optional\)"/g, "t('auth.optionalFacultyName', 'Enter Faculty Name (Optional)')");
  dropContent = dropContent.replace(/"Enter Department Name \(Optional\)"/g, "t('auth.optionalDepartmentName', 'Enter Department Name (Optional)')");
  dropContent = dropContent.replace(/"Enter Program Name \(Optional\)"/g, "t('auth.optionalProgramName', 'Enter Program Name (Optional)')");

  fs.writeFileSync(dropPath, dropContent);
  console.log('Updated AcademicDropdowns.tsx');
}

// 2. Update locales
const enPath = 'src/locales/en.json';
const arPath = 'src/locales/ar.json';

let enJson = JSON.parse(fs.readFileSync(enPath, 'utf8'));
let arJson = JSON.parse(fs.readFileSync(arPath, 'utf8'));

const enKeys = {
    "program": "Program",
    "facultyName": "Faculty Name",
    "departmentName": "Department Name",
    "programName": "Program Name",
    "selectUniversity": "Select University...",
    "selectFaculty": "Select Faculty...",
    "selectDepartment": "Select Department...",
    "selectProgram": "Select Program...",
    "enterUniversityName": "Enter University Name",
    "enterFacultyName": "Enter Faculty Name",
    "enterDepartmentName": "Enter Department Name",
    "enterProgramName": "Enter Program Name",
    "optionalFacultyName": "Enter Faculty Name (Optional)",
    "optionalDepartmentName": "Enter Department Name (Optional)",
    "optionalProgramName": "Enter Program Name (Optional)"
};

const arKeys = {
    "program": "البرنامج",
    "facultyName": "اسم الكلية",
    "departmentName": "اسم القسم",
    "programName": "اسم البرنامج",
    "selectUniversity": "اختر الجامعة...",
    "selectFaculty": "اختر الكلية...",
    "selectDepartment": "اختر القسم...",
    "selectProgram": "اختر البرنامج...",
    "enterUniversityName": "أدخل اسم الجامعة",
    "enterFacultyName": "أدخل اسم الكلية",
    "enterDepartmentName": "أدخل اسم القسم",
    "enterProgramName": "أدخل اسم البرنامج",
    "optionalFacultyName": "أدخل اسم الكلية (اختياري)",
    "optionalDepartmentName": "أدخل اسم القسم (اختياري)",
    "optionalProgramName": "أدخل اسم البرنامج (اختياري)"
};

for (const [k, v] of Object.entries(enKeys)) {
  enJson.auth[k] = v;
}
for (const [k, v] of Object.entries(arKeys)) {
  arJson.auth[k] = v;
}

fs.writeFileSync(enPath, JSON.stringify(enJson, null, 2));
fs.writeFileSync(arPath, JSON.stringify(arJson, null, 2));
console.log('Updated locales');
