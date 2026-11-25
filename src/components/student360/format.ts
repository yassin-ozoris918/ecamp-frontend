/** Shared formatters for the Student 360 page, its print view and CSV export. */

export function formatDateTime(val?: string | Date | null): string {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** Short date + time without seconds, for dense rows. */
export function formatShort(val?: string | Date | null): string {
  if (!val) return '—';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** "3 days ago", "in 5 days", "just now". */
export function formatRelative(val?: string | Date | null): string {
  if (!val) return '—';
  const d = new Date(val).getTime();
  if (isNaN(d)) return '—';
  const diff = d - Date.now();
  const abs = Math.abs(diff);
  const units: [number, string][] = [
    [86400000 * 365, 'year'],
    [86400000 * 30, 'month'],
    [86400000, 'day'],
    [3600000, 'hour'],
    [60000, 'minute'],
  ];
  for (const [ms, name] of units) {
    if (abs >= ms) {
      const n = Math.round(abs / ms);
      const label = `${n} ${name}${n === 1 ? '' : 's'}`;
      return diff < 0 ? `${label} ago` : `in ${label}`;
    }
  }
  return 'just now';
}

export function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return '—';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export function formatAcademicProfile(p: any): string {
  if (!p) return '—';
  if (p.educationLevel === 'HIGH_SCHOOL') {
    const parts = [
      'High School',
      p.highSchoolSystem,
      p.highSchoolGrade,
      p.traditionalBranch,
      p.baccalaureatePath,
      p.studyMode,
      p.studyLanguage,
    ].filter(Boolean);
    return parts.join(' • ');
  }
  const uni = p.academicUniversity?.nameEn || p.academicUniversity?.nameAr || p.otherUniversityName || '';
  const fac = p.academicFaculty?.nameEn || p.academicFaculty?.nameAr || p.otherFacultyName || '';
  const dep = p.academicDepartment?.nameEn || p.academicDepartment?.nameAr || p.otherDepartmentName || '';
  const prog = p.academicProgram?.nameEn || p.academicProgram?.nameAr || p.otherProgramName || '';
  return ['University', uni, fac, dep, prog].filter(Boolean).join(' • ');
}
