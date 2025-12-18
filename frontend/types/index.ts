/**
 * Enums must match the Prisma schema *exactly*
 */
export enum Role {
  STUDENT = 'STUDENT',
  STAFF = 'STAFF',
}

export enum QType {
  MCQ = 'MCQ',
  CODING = 'CODING',
  ESSAY = 'ESSAY',
  SPEAKING = 'SPEAKING',
  LISTENING = 'LISTENING',
  FILL = 'FILL',
  READING = 'READING',
  SQL = 'SQL',
}
// Add other enums as needed...

/**
 * The user object returned from /api/me
 * Note: We make 'password' optional and exclude it.
 * The backend should *never* send the password hash to the frontend.
 */
// LeetCode Stats Interface
export interface LeetCodeStats {
  total: number;
  easy: number;
  medium: number;
  hard: number;
  contest?: {
    attended: number;
    rating: number;
    globalRanking: number;
    topPercentage: number;
    weeklyAttended?: number;
    biweeklyAttended?: number;
    weeklyContests?: Array<{
      title: string;
      date: string;
      rating: number;
      ranking: number;
      problemsSolved: number;
      totalProblems: number;
      finishTimeInSeconds: number;
      q1: number;
      q2: number;
      q3: number;
      q4: number;
    }>;
    biweeklyContests?: Array<{
      title: string;
      date: string;
      rating: number;
      ranking: number;
      problemsSolved: number;
      totalProblems: number;
      finishTimeInSeconds: number;
      q1: number;
      q2: number;
      q3: number;
      q4: number;
    }>;
    latestWeekly?: any;
    latestBiweekly?: any;
  } | null;
  lastUpdated: string;
}

/**
 * The user object returned from /api/me
 * Note: We make 'password' optional and exclude it.
 * The backend should *never* send the password hash to the frontend.
 */
// Data Interface
export interface User {
  id: string;
  reg_no: string | null;
  email: string;
  name: string | null;
  role: Role;
  year: number | null;
  department: string | null;
  section: string | null;
  pictureUrl: string | null;
  leetcodeId: string | null;
  leetcodeStats: LeetCodeStats | null;
  points: number;
  createdAt: string;
  updatedAt: string;
}

// Context Interface
export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  loginWithGoogle: (profile: { email: string; name: string; pictureUrl: string; googleId: string }) => Promise<void>;
  logout: () => void;
  updateUser: (updateData: Partial<User>) => Promise<void>;
}

// You can add other types here as you build pages
// e.g., export interface Exam { ... }
// e.g., export interface Question { ... }

export enum ExamStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
}

// Frontend counterparts to Prisma enums
export enum TimingMode {
  OVERALL_ONLY = 'OVERALL_ONLY',
  PER_SECTION_ONLY = 'PER_SECTION_ONLY',
  BOTH = 'BOTH',
}

export enum SectionLockPolicy {
  NONE = 'NONE',
  LOCK_ON_COMPLETE = 'LOCK_ON_COMPLETE',
  LINEAR_NO_BACKTRACK = 'LINEAR_NO_BACKTRACK',
}

// Full Exam interface for edit page and listings
export interface Exam {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  timingMode: TimingMode;
  durationMins: number;
  sectionLockPolicy: SectionLockPolicy;
  randomizeQuestions: boolean;
  negativeMarkPerWrong: number | null;
  status: ExamStatus;
  maxAttempts?: number | null;
  maxTabSwitches?: number | null;
  allowedLanguages?: string[] | null;
  createdAt: string;
  updatedAt: string;
}