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
}
// Add other enums as needed...

/**
 * The user object returned from /api/me
 * Note: We make 'password' optional and exclude it.
 * The backend should *never* send the password hash to the frontend.
 */
export interface User {
  id: string;
  reg_no: string | null;
  email: string;
  name: string | null;
  pictureUrl: string | null;
  role: Role;
  year: number | null;
  department: string | null;
  section: string | null;
  googleId: string | null;
  createdAt: string; // Dates are transmitted as strings in JSON
  updatedAt: string;
}

/**
 * This will be the shape of our AuthContext
 */
export interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

// You can add other types here as you build pages
// e.g., export interface Exam { ... }
// e.g., export interface Question { ... }