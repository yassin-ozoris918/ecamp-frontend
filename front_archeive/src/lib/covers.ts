// Stable gradient covers for courses/lectures. Keyed by id; falls back to a default.

export interface Cover {
  gradient: string;
}

const PALETTE: Cover[] = [
  { gradient: 'linear-gradient(135deg, #0891b2 0%, #155e75 100%)' },
  { gradient: 'linear-gradient(135deg, #0e7490 0%, #164e63 100%)' },
  { gradient: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)' },
  { gradient: 'linear-gradient(135deg, #b45309 0%, #78350f 100%)' },
  { gradient: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)' },
  { gradient: 'linear-gradient(135deg, #db2777 0%, #831843 100%)' },
  { gradient: 'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)' },
  { gradient: 'linear-gradient(135deg, #16a34a 0%, #14532d 100%)' },
];

function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export const COURSE_COVERS: Record<string, Cover> = {
  default: PALETTE[0],
};

export function coverFor(id: string | undefined | null): Cover {
  if (!id) return PALETTE[0];
  if (COURSE_COVERS[id]) return COURSE_COVERS[id];
  return PALETTE[hash(id) % PALETTE.length];
}
