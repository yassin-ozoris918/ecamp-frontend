const fs = require('fs');

const dropPath = 'src/components/AcademicDropdowns.tsx';
let dropContent = fs.readFileSync(dropPath, 'utf8');

dropContent = dropContent.replace(
  "const { t } = useTranslation();",
  "const { t, i18n } = useTranslation();\n  const lang = i18n.language || 'en';"
);

dropContent = dropContent.replace(/>{u.nameAr}<\/option>/g, ">{lang === 'en' ? u.nameEn : u.nameAr}</option>");
dropContent = dropContent.replace(/>{f.nameAr}<\/option>/g, ">{lang === 'en' ? f.nameEn : f.nameAr}</option>");
dropContent = dropContent.replace(/>{d.nameAr}<\/option>/g, ">{lang === 'en' ? d.nameEn : d.nameAr}</option>");
dropContent = dropContent.replace(/>{p.nameAr}<\/option>/g, ">{lang === 'en' ? p.nameEn : p.nameAr}</option>");

fs.writeFileSync(dropPath, dropContent);
console.log('Fixed AcademicDropdowns for i18n display');
