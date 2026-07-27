export type UserRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
export type EducationLevel = 'HIGH_SCHOOL' | 'UNIVERSITY';
export type SessionType = 'SESSION' | 'QUIZ' | 'HOMEWORK';
export type ContentStatus = 'DRAFT' | 'PUBLISHED';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  education_level: EducationLevel | null;
  phone_number: string | null;
  parent_phone_number: string | null;
  device_id: string | null;
  xp: number;
  streak_days: number;
  last_login_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  introductoryVideoUrl?: string | null;
  instructor_id: string;
  status: ContentStatus;
  validity_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface Lecture {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  cover_image_url: string | null;
  durationDays?: number;
  durationHours?: number;
  durationMinutes?: number;
  warningHours?: number;
  warningMinutes?: number;
  created_at: string;
}

export interface LectureItem {
  id: string;
  lecture_id: string;
  type: SessionType;
  title: string;
  sort_order: number;
  video_url: string | null;
  duration_seconds: number | null;
  passGrade?: number;
  description: string | null;
  passing_score: number | null;
  time_limit_minutes: number | null;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  text: string;
  type: string;
  options: string[];
  points: number;
}

export interface QuizAnswer {
  id: string;
  question_id: string;
  answer_text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface ActivationCode {
  id: string;
  code: string;
  course_id: string;
  generated_by: string;
  redeemed_by: string | null;
  redeemed_at: string | null;
  created_at: string;
}

export interface CourseAccess {
  id: string;
  course_id: string;
  student_id: string;
  started_at: string;
  created_at: string;
}

export interface Progress {
  id: string;
  student_id: string;
  item_id: string;
  lecture_id: string;
  completed_at: string;
}

export interface QuizSubmission {
  id: string;
  student_id: string;
  item_id: string;
  score: number;
  passed: boolean;
  submitted_at: string;
}

export interface Badge {
  id: string;
  student_id: string;
  badge_key: string;
  awarded_at: string;
}

export interface LeaderboardEntry {
  id: string;
  full_name: string;
  xp: number;
  streak_days: number;
  rank: number;
}

// Playlist item = a lecture item + its completed status + lock status, computed by the frontend.
export interface PlaylistEntry {
  item: LectureItem;
  isCompleted: boolean;
  isLocked: boolean;
  questions?: QuizQuestion[];
}
