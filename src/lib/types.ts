export type UserRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
export type EducationLevel = 'HIGH_SCHOOL' | 'UNIVERSITY';
export type HighSchoolSystem = 'TRADITIONAL' | 'BACCALAUREATE';
export type StudyMode = 'ONLINE' | 'CENTER';
export type StudyLanguage = 'ARABIC' | 'ENGLISH';
export type HighSchoolGrade = 'GRADE_1' | 'GRADE_2' | 'GRADE_3';
export type TraditionalBranch = 'SCIENCE' | 'SCIENCE_BIOLOGY' | 'SCIENCE_MATH' | 'LITERARY';
export type BaccalaureatePath = 'MEDICINE_AND_LIFE_SCIENCES' | 'ENGINEERING_AND_COMPUTER_SCIENCE' | 'BUSINESS' | 'ARTS_AND_HUMANITIES';
export type ContentStatus = 'DRAFT' | 'PUBLISHED';
export type ItemType = 'SESSION' | 'QUIZ';
export type AttemptStatusType = 'PENDING' | 'PASSED' | 'FAILED';
export type OwnershipState = 'ACTIVE' | 'EXPIRED' | 'UNOWNED';
export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'ESSAY' | 'SHORT_ANSWER' | 'READ_ONLY_TEXT' | 'MULTIPLE_CHOICE' | 'MATCHING' | 'ORDERING';
export type SettingType = 'STRING' | 'BOOLEAN' | 'INTEGER' | 'JSON';
export type EntityType = 'chapter' | 'lecture' | 'session' | 'quiz' | 'quiz-question';
export type ExportEntity = 'users' | 'courses' | 'lectures' | 'quiz-attempts' | 'exam-attempts' | 'activation-codes' | 'audit-logs' | 'progress';
export type ExportFormat = 'xlsx' | 'csv' | 'json' | 'pdf';
export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Profile {
  id: string;
  full_name?: string;
  fullName?: string;
  email: string;
  role: UserRole;
  education_level?: EducationLevel | null;
  educationLevel?: EducationLevel | null;
  phone_number?: string | null;
  phoneNumber?: string | null;
  parent_phone_number?: string | null;
  parentPhoneNumber?: string | null;
  
  // --- High School Dimensions ---
  highSchoolSystem?: HighSchoolSystem | null;
  studyMode?: StudyMode | null;
  studyLanguage?: StudyLanguage | null;
  highSchoolGrade?: HighSchoolGrade | null;
  traditionalBranch?: TraditionalBranch | null;
  baccalaureatePath?: BaccalaureatePath | null;

  // --- University Dimensions ---
  university?: string | null;
  faculty?: string | null;
  department?: string | null;
  academicYear?: string | null;

  // --- Computed ---
  isProfileComplete?: boolean;

  device_id?: string | null;
  deviceId?: string | null;
  profilePictureUrl: string | null;
  xp: number;
  streak_days?: number;
  streakDays?: number;
  last_login_date?: string | null;
  lastLoginAt?: string | null;
  is_active?: boolean;
  isActive?: boolean;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    full_name: string;
    profilePictureUrl: string | null;
    xp: number;
    streak_days: number;
    is_active: boolean;
  };
}

export interface Course {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string | null;
  introductoryVideoUrl?: string | null;
  status: ContentStatus;
  audienceType?: EducationLevel;

  // --- Targeting Additions ---
  targetHighSchoolSystem?: HighSchoolSystem | null;
  targetStudyMode?: StudyMode | null;
  targetStudyLanguage?: StudyLanguage | null;
  targetHighSchoolGrade?: HighSchoolGrade | null;
  targetTraditionalBranch?: TraditionalBranch | null;
  targetBaccalaureatePath?: BaccalaureatePath | null;
  targetUniversity?: string | null;
  targetFaculty?: string | null;
  targetDepartment?: string | null;
  targetAcademicYear?: string | null;

  validity_days?: number | null;
  isFree?: boolean;
  createdAt?: string;
  updatedAt?: string;
  instructors?: CourseInstructor[];
  lectures?: { id: string; title: string }[];
}

export interface InstructorInfo {
  id: string;
  fullName: string;
  email?: string;
  profilePictureUrl?: string | null;
}

export interface CourseInstructor {
  instructor: InstructorInfo;
}

export interface Lecture {
  id: string;
  courseId?: string;
  chapterId?: string | null;
  title: string;
  description: string | null;
  sortOrder: number;
  thumbnailUrl?: string | null;
  validityDays?: number | null;
  durationDays?: number | null;
  durationHours?: number | null;
  durationMinutes?: number | null;
  isUnlocked?: boolean;
  isExpired?: boolean;
  isStarted?: boolean;
  isPublished?: boolean;
  warningHours?: number;
  warningMinutes?: number;
  sessions?: Session[];
  quizzes?: Quiz[];
  items?: LectureItem[];
}

export interface Session {
  id: string;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  duration: number;
  sortOrder: number;
  orderIndex: number;
}

export interface Quiz {
  id: string;
  title: string;
  description?: string | null;
  passGrade: number;
  maxAttempts: number;
  timeLimit: number | null;
  sortOrder: number;
  orderIndex: number;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  text: string;
  type: QuestionType;
  options?: string[];
  points: number;
  orderIndex?: number;
  version?: 'A' | 'B';
  correctOptionIndex?: number;
  referenceAnswer?: string;
  matchOptions?: { left: string; right: string }[];
  correctOrder?: string[];
}

export interface PlaylistItem {
  id: string;
  type: ItemType;
  title: string;
  description?: string | null;
  orderIndex: number;
  isCompleted: boolean;
  isLocked: boolean;
  video_url: string | null;
  duration: number;
  timeLimit: number | null;
  passGrade: number;
  maxAttempts: number;
  attemptsCount: number;
  isExhausted: boolean;
  highestScore: number;
  fileUrl: string | null;
  attachmentType: string;
  passing_score?: number;
  time_limit_minutes?: number;
}

export interface ActivationCode {
  id: string;
  code: string;
  status: string;
  targetType: 'LECTURE' | 'COURSE';
  educationLevel: 'HIGH_SCHOOL' | 'UNIVERSITY';
  redeemedAt: string | null;
  studentId: string | null;
  redeemedLectureId: string | null;
  redeemedCourseId: string | null;
  createdAt: string;
  courseTitle?: string;
  lectureTitle?: string;
  redeemerName?: string | null;
  isRedeemed?: boolean;
  isCopied: boolean;
}

export interface LeaderboardEntry {
  id: string;
  full_name: string;
  xp: number;
  streak_days: number;
  rank: number;
  profilePictureUrl?: string | null;
}

export interface Chapter {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  lectures: Lecture[];
}

// --- Builder types (GET /courses/:id/builder) ---

export interface BuilderData {
  course: {
    id: string;
    title: string;
    description: string | null;
    status: ContentStatus;
    thumbnailUrl?: string | null;
    introductoryVideoUrl?: string | null;
    audienceType?: EducationLevel;
    validity_days?: number | null;
    isFree?: boolean;
    instructors?: CourseInstructor[];
  };
  chapters: BuilderChapter[];
  unassignedLectures: BuilderLecture[];
}

export interface BuilderChapter {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  lectures: BuilderLecture[];
}

export interface BuilderLecture {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  chapterId: string | null;
  isPublished?: boolean;
  items: BuilderItem[];
}

export type LectureItem = PlaylistItem;

export interface BuilderItem {
  id: string;
  type: ItemType;
  title: string;
  description?: string | null;
  sortOrder: number;
  orderIndex: number;
  isPublished?: boolean;
  duration?: number;
  videoUrl?: string | null;
  passGrade?: number;
  maxAttempts?: number;
  timeLimit?: number | null;
  questionsCount?: number;
}

// --- Admin types ---

export interface PaginationResponse<T> {
  items: T[];
  total: number;
  skip: number;
  take: number;
}

export interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalInstructors: number;
  totalAdmin: number;
  activeUsers: number;
  suspendedUsers: number;
  totalCourses: number;
  publishedCourses: number;
  totalCodesGenerated: number;
  totalCodesRedeemed: number;
  totalLectureAccess: number;
  totalCertificates: number;
  dailyActiveUsers: number;
}

export interface ProfileUpdateRequest {
  id: string;
  studentId: string;
  requestedFullName: string | null;
  requestedPhoneNumber: string | null;
  requestedParentPhone: string | null;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  student?: {
    fullName: string;
    email: string;
    phoneNumber: string | null;
    parentPhoneNumber: string | null;
  };
}

export interface UserListItem {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  educationLevel: EducationLevel | null;
  xp: number;
  streakDays: number;
  createdAt: string;
  lastLoginAt: string | null;
  phoneNumber: string | null;
  deviceId?: string | null;
  profilePictureUrl?: string | null;
  highSchoolSystem?: HighSchoolSystem | null;
  studyMode?: StudyMode | null;
  studyLanguage?: StudyLanguage | null;
  highSchoolGrade?: HighSchoolGrade | null;
  traditionalBranch?: TraditionalBranch | null;
  baccalaureatePath?: BaccalaureatePath | null;
  university?: string | null;
  faculty?: string | null;
  department?: string | null;
  academicYear?: string | null;
}

export interface AdminUserDetail extends UserListItem {
  parentPhoneNumber: string | null;
  profilePictureUrl: string | null;
  lastLoginAt: string | null;
  _count: {
    accessedLectures: number;
    quizAttempts: number;
    examAttempts: number;
    deviceSessions: number;
    certificates: number;
  };
}

export interface GetUsersParams {
  search?: string;
  role?: UserRole;
  educationLevel?: EducationLevel;
  isActive?: boolean;
  dateFrom?: string;
  dateTo?: string;
  includeDeleted?: boolean;
  sortBy?: 'createdAt' | 'fullName' | 'email' | 'role' | 'educationLevel';
  sortOrder?: 'asc' | 'desc';
  skip?: number;
  take?: number;
}

// --- Audit log types ---

export interface AuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details: string | null;
  createdAt: string;
  userId: string | null;
  user: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface SystemAuditLogEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  details: string | null;
  createdAt: string;
  actorId: string | null;
  actor: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

// --- Device / History types ---

export interface DeviceSessionInfo {
  id: string;
  studentId: string;
  deviceFingerprint: string;
  action: string;
  ipAddress: string | null;
  browser: string | null;
  createdAt: string;
}

// --- Progress types ---

export interface CourseProgressItem {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  instructorName: string;
  progressPct: number;
  isFree?: boolean;
}

export interface StudentLectureInfo {
  lectureId: string;
  lectureTitle: string;
  courseTitle: string;
  activatedAt: string;
  expiresAt: string | null;
}

export interface StudentQuizAttemptInfo {
  quizId: string;
  quizTitle: string | null;
  score: number;
  status: string;
  passGrade: number | null;
  submittedAt: string | null;
  earnedPoints: number;
  totalPoints: number;
}

export interface StudentExamAttemptInfo {
  examId: string;
  examTitle: string | null;
  score: number | null;
  status: string;
  passGrade: number | null;
  submittedAt: string | null;
  earnedPoints: number;
  totalPoints: number;
}

export interface StudentProgressFull {
  lectures: StudentLectureInfo[];
  quizAttempts: StudentQuizAttemptInfo[];
  examAttempts: StudentExamAttemptInfo[];
}

// --- Exam types ---

export interface CourseExamItem {
  id: string;
  title: string;
  description: string | null;
  timeLimit: number | null;
  maxAttempts: number;
  passingScore: number;
  isPublished: boolean;
  chapterId?: string | null;
  questions: ExamQuestion[];
  _count: { attempts: number };
}

export interface ExamQuestion {
  id: string;
  examId: string;
  text: string;
  type: QuestionType;
  points: number;
  options?: string[];
  correctOptionIndex?: number;
  answers?: ExamAnswer[];
  referenceAnswer?: string;
  matchOptions?: { left: string; right: string }[];
  correctOrder?: string[];
}

export interface ExamAnswer {
  id: string;
  text: string;
  isCorrect: boolean;
}

// --- Certificate types ---

export interface CertificateItem {
  id: string;
  issuedAt: string;
  pdfUrl: string | null;
  student?: {
    id: string;
    fullName: string;
    email: string;
  };
  course?: Course;
}

// --- At-risk types ---

export interface AtRiskStudent {
  id: string;
  fullName: string;
  email: string;
  lastLoginAt: string | null;
  xp: number;
}

// --- Settings types ---

export interface SystemSetting {
  key: string;
  value: string;
  type: SettingType;
  description: string | null;
}

export interface SettingsMap {
  [key: string]: any;
  platform_name?: string;
  platform_logo?: string;
  contact_email?: string;
  maintenance_mode?: boolean;
  jwt_lifetime_minutes?: number;
  refresh_lifetime_days?: number;
  password_min_length?: number;
  password_require_special?: boolean;
  max_upload_size_mb?: number;
  allowed_file_types?: string[];
  default_max_attempts?: number;
  default_pass_grade?: number;
  default_duration_minutes?: number;
  enable_ai?: boolean;
  enable_notifications?: boolean;
  enable_certificates?: boolean;
  allow_registration?: boolean;
}

// --- Export types ---

export interface ExportRequest {
  entity: ExportEntity;
  format: ExportFormat;
  filters?: Record<string, any>;
}

// --- Reorder types ---

export interface ReorderItem {
  id: string;
  orderIndex: number;
}

export interface ReorderPayload {
  entityType: EntityType;
  parentId: string;
  items: ReorderItem[];
}

// --- Media types ---

export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  storageKey: string;
  thumbnail: string | null;
  altText: string | null;
  uploadedById: string;
  uploadedAt: string;
}

// --- Notification types ---

export interface NotificationLog {
  id: string;
  recipientId: string | null;
  recipientPhone: string | null;
  recipientEmail: string | null;
  eventCategory: string;
  channelType: string;
  deliveryStatus: string;
  messageContent: string;
  dispatchedAt: string;
  completedAt: string | null;
  failureReason: string | null;
  retryCount: number;
}

// --- AI / Quiz types ---

export interface GeneratedQuestion {
  text: string;
  type: QuestionType;
  points: number;
  options: string[];
  correctOptionIndex: number;
  answers?: { text: string; isCorrect: boolean }[];
}

export interface LocalQuestion {
  text: string;
  type: QuestionType;
  points: number;
  options: string[];
  correctAnswerIndex: number;
}
