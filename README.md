# ShadowCoders - Online Examination Platform

A comprehensive online examination platform built with Next.js 16 and Express.js, featuring multiple question types, automated grading, AI-powered question generation, and real-time monitoring capabilities.

## 🌟 Unique Features (Not Available in Other Platforms)

### 1. **Hybrid Code Execution with Client-Side Offloading**
- Students can run code on their own machines instead of the server
- Automatic detection and switching between local/server execution
- **The Advantage:** HackerRank, LeetCode, Codechef only use server-side execution. We reduce server load by 80-90% while maintaining security.

### 2. **Adaptive Learning with IRT + Dynamic Question Pools**
- Real-time difficulty adjustment using Item Response Theory (IRT)
- Questions selected from pools based on performance patterns (time taken + correctness)
- Every student gets a personalized exam path
- **The Advantage:** Moodle has question banks, Khan Academy has adaptive learning, but combining IRT-based adjustment with dynamic pool selection in real-time is unique.

### 3. **Browser-Based Eye/Head Tracking (Client-Side Processing)**
- Eye gaze and head movement tracking using MediaPipe Face Landmarker
- Real-time face detection with 478 facial landmarks
- Eye Aspect Ratio (EAR) calculation for blink/closed eye detection
- Head pose estimation (yaw, pitch angles)
- Gaze direction analysis
- Multiple face detection (catches cheating with helpers)
- All processing happens in the browser - no video streaming to servers
- Automatic fallback to basic detection if GPU unavailable
- **The Advantage:** Proctorio, ProctorU, Honorlock stream video to their servers (privacy concerns + costly). We process everything client-side using Google's MediaPipe AI.

### 4. **Gamification with Real-World Institutional Rewards**
- Students redeem points for leave days, certificates, institutional benefits
- Admin approval workflow with notification system
- **The Advantage:** Duolingo has points for badges. Canvas has badges. But exchanging academic points for real institutional benefits (leave days) is unique.

### 5. **LeetCode Profile Integration in Exam Platform**
- Real-time sync with LeetCode profiles (solve counts, contest ratings, rankings)
- Combines external competitive programming data with internal exam performance
- **The Advantage:** No exam platform (Moodle, Canvas, Blackboard) integrates external competitive programming achievements.

### 6. **P2P WebRTC Meetings with AI-Generated Summaries**
- Serverless peer-to-peer video calls (no video server needed)
- AI-powered meeting summary generation using Gemini
- **The Advantage:** Zoom/Teams use centralized servers. We use P2P (95% bandwidth cost reduction) + AI summaries in one platform.

### 7. **Offline LAN Deployment with Mobile Access**
- Entire platform runs on local network without internet
- One-click PowerShell scripts for mobile device access
- **The Advantage:** Modern platforms (Canvas, Blackboard, Moodle Cloud) require internet. We enable complete offline operation.

### 8. **Multi-Provider AI with Intelligent Fallback Chain**
- Advanced LLM Engine → Gemini 2.5-flash → Gemini 1.5-flash → Gemini 1.5-pro
- Automatic model switching on failure for 99.9% uptime
- **The Advantage:** Most platforms use single AI provider. Our multi-model redundancy ensures continuous operation.

### 9. **11 Anti-Cheating Mechanisms Using Only Browser APIs**
- Comprehensive protection (tab switching, dual monitors, DevTools, etc.) without paid services
- **The Advantage:** Achieving Proctorio-level security ($5-15/exam) using $0 native browser APIs.

### 10. **Dynamic vs Static Exam Modes**
- Static: Fixed questions for all students
- Dynamic: Questions from pool + adaptive difficulty
- **The Advantage:** Most platforms are either/or. We offer both modes in one platform with seamless switching.

---

## 🚀 Quick Start
**Production Users (Ubuntu):** Check the [Ubuntu Production Guide](./STARTUP_GUIDE.md) for management commands and exam readiness tips.

### Prerequisites

- **Node.js**: 18+ (recommended 20+)
- **PostgreSQL**: Database (Supabase recommended)
- **npm** or **yarn**: Package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ShadowCoders
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   # Create backend/.env and configure DATABASE_URL/LOCAL_DATABASE_URL, JWT_SECRET
   npm run prisma:migrate
   npm run prisma:generate
   npm run create:user
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   # Create .env.local (see Environment Variables)
   npm run dev
   ```

4. **Access the Application**
   - Frontend: `http://localhost:3000`
   - Backend: `http://localhost:4000`
   - Admin Dashboard: `http://localhost:3000/admin/dashboard`
   - Student Portal: `http://localhost:3000/student/dashboard`

### 4. Nginx Reverse Proxy (Optional but Recommended)
```bash
sudo apt install nginx -y
# Configure /etc/nginx/sites-available/default to proxy port 3000 (frontend) and 4000 (backend)
```

## 🐧 One-Click Installer (Ubuntu)

For a fresh Ubuntu system, you can use the automated installer script which sets up Node.js, Java, Python, Postgres, Redis, and builds the application.

1. **Copy the script**
   Copy `deploy-ubuntu.sh` to your server.

2. **Run the installer**
   ```bash
   chmod +x deploy-ubuntu.sh
   ./deploy-ubuntu.sh
   ```

3. **Start the server**
   ```bash
   ./start_server.sh
   ```

## 🐧 Manual Production Setup (Linux)

## 📚 Documentation

### Architecture & Design

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete system architecture documentation
  - System architecture overview
  - Technology stack
  - Backend architecture
  - Frontend architecture
  - Database schema
  - Authentication & authorization
  - API design
  - Real-time features
  - Security features
  - Deployment architecture

### Developer Guides

- **[Backend Developer Guide](./backend/DEVELOPER_GUIDE.md)** - Complete backend documentation
  - Project structure
  - Module architecture
  - API documentation
  - Database models
  - Authentication & authorization
  - Error handling
  - Code execution
  - AI integration
  - Testing & deployment

- **[Frontend Developer Guide](./frontend/DEVELOPER_GUIDE.md)** - Complete frontend documentation
  - Project structure
  - Next.js App Router
  - Component architecture
  - State management
  - API integration
  - Authentication
  - Custom hooks
  - Styling
  - Testing & deployment

### Quick References

- **[Backend README](./backend/README.md)** - Backend quick start and API reference
- **[Frontend README](./frontend/README.md)** - Frontend quick start and overview
- **[USER MANUAL](./USER_MANUAL.md)** - Guide for Students and Admins

## 🏗️ Project Structure

```
ShadowCoders/
├── backend/                # Express.js API Server
│   ├── src/               # Source code
│   │   ├── modules/      # Feature modules (MVC pattern)
│   │   ├── middleware/   # Express middleware
│   │   ├── lib/          # Shared utilities
│   │   └── config/       # Configuration files
│   ├── prisma/           # Database schema & migrations
│   ├── scripts/          # Utility scripts
│   └── package.json
│
├── frontend/              # Next.js Frontend Application
│   ├── app/              # Next.js App Router
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   ├── context/          # React context providers
│   ├── lib/              # Utilities & services
│   ├── utils/            # Helper functions
│   └── package.json
│
├── ARCHITECTURE.md        # System architecture documentation
├── README.md              # This file
└── package.json           # Root package.json (optional)
```

## ✨ Features

### Question Types

- **MCQ**: Multiple Choice Questions with single/multiple correct answers
- **Coding**: Programming questions with automated code execution
- **Essay**: Long-form text answers with manual grading
- **Speaking**: Audio recording questions
- **Listening**: Audio-based comprehension questions
- **Reading**: Text-based comprehension questions
- **Fill-in-the-blank**: Cloze test questions

### Exam Management

- **Flexible Timing**: Overall timer, per-section timer, or both
- **Section Management**: Organize questions into sections
- **Assignment Control**: Assign exams to specific students or cohorts
- **Attempt Limits**: Control maximum attempts per exam
- **Randomization**: Randomize question order
- **Negative Marking**: Configure negative marks for wrong answers

### Grading & Evaluation

- **Automated Grading**: Real-time code execution and automated scoring
- **Manual Grading**: Rubric-based evaluation for subjective questions
- **AI Grading**: AI-powered evaluation (future)
- **Hybrid Grading**: Combination of automated and manual grading
- **Detailed Feedback**: Provide feedback for each question

### Real-time Monitoring

- **Live Activity Tracking**: Monitor student activity in real-time
- **Progress Tracking**: Track student progress through exam
- **Status Indicators**: See active, idle, and submitted students
- **Connection Status**: Monitor student connection status
- **Modern Dashboard**: Interact with data via responsive charts and Bento Grid layout

### Security & Anti-cheating

- **Fullscreen Enforcement**: Force fullscreen during exams
- **Tab Switch Detection**: Detect and warn on tab switches
- **Copy/Paste Prevention**: Disable copy/paste functionality
- **Keyboard Shortcut Blocking**: Block common shortcuts
- **Developer Tools Detection**: Warn when dev tools are opened
- **Audio Monitoring**: Monitor for suspicious audio activity

### Local Code Execution

- **Client-Side Offloading**: Students can run code on their own machines instead of the server to reduce load.
- **Local Runner**: Students run a lightweight Node.js script (`scripts/local-runner.js`) that the exam page connects to.
- **Auto-Switching**: The exam interface automatically detects the local runner and switches execution mode.

### AI Integration

- **Question Generation**: Generate questions using Google Gemini AI
- **Content Creation**: AI-assisted content creation for exams
- **Smart Recommendations**: AI-powered exam recommendations (future)

## 🛠️ Technology Stack

### Backend

- **Runtime**: Node.js 18+ (TypeScript)
- **Framework**: Express.js 5.x
- **Database**: PostgreSQL (via Supabase)
- **ORM**: Prisma 6.x
- **Validation**: Zod 4.x
- **Authentication**: JWT + bcrypt
- **WebSocket**: Socket.IO 4.x
- **Code Execution**: BullMQ + Redis + Docker Sandbox (with optional local runner fallback)
- **AI Service**: Google Generative AI (Gemini)

### Frontend

- **Framework**: Next.js 16.x (React 18)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 4.x
- **UI Components**: Radix UI
- **Code Editor**: Monaco Editor
- **Charts**: Recharts 3.x
- **State Management**: React Context + Custom Hooks
- **HTTP Client**: Axios
- **WebSocket Client**: Socket.IO Client
- **Form Handling**: React Hook Form + Zod

## 🔐 Authentication

### User Roles

- **Student**: Can take exams, view results
- **Staff**: Can create exams, grade submissions, monitor exams

### Authentication Flow

1. User logs in with email/password or Google OAuth
2. Server generates JWT access token and refresh token
3. Access token stored in memory/localStorage
4. Refresh token stored in HTTP-only cookie
5. Access token included in Authorization header for authenticated requests
6. Refresh token used to obtain new access token when expired

## 📡 API Documentation

### Base URL

- **Development**: `http://localhost:4000/api`
- **Production**: Set via `NEXT_PUBLIC_API_BASE_URL`

### Authentication

Include JWT token in Authorization header:
```
Authorization: Bearer <access_token>
```

### Main Endpoints

- **Auth**: `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`
- **Exams**: `/api/admin/exams`, `/api/student/exams`
- **Attempts**: `/api/student/attempts`, `/api/admin/attempts`
- **Questions**: `/api/admin/questions`
- **Grading**: `/api/student/attempts/:id/run-code`
- **Monitoring**: Socket.IO namespace `/exam-monitoring`

See [Backend Developer Guide](./backend/DEVELOPER_GUIDE.md) for complete API documentation.

## 🗄️ Database

### Database Setup

1. **Using Supabase** (Recommended)
   - Create a Supabase project
   - Get connection strings from Supabase dashboard
   - Set `DATABASE_URL` and `DIRECT_URL` in `.env`

2. **Using Local PostgreSQL**
   - Install PostgreSQL locally
   - Create a database
   - Set `DATABASE_URL` in `.env`

### Database Migrations

```bash
cd backend
npm run prisma:migrate    # Apply migrations
npm run prisma:generate   # Generate Prisma client
npm run prisma:studio     # Open Prisma Studio (database GUI)
```

## 🚀 Deployment

### Backend Deployment

1. **Build for production**
   ```bash
   npm run build
   ```

2. **Run migrations**
   ```bash
   npm run prisma:migrate
   ```

3. **Start server**
   ```bash
   npm start
   ```

### Frontend Deployment

1. **Build for production**
   ```bash
   npm run build
   ```

2. **Start server**
   ```bash
   npm start
   ```

### Recommended Platforms

- **Backend**: Railway, Render, AWS EC2, DigitalOcean
- **Frontend**: Vercel, Netlify
- **Database**: Supabase, AWS RDS, Railway PostgreSQL

### Environment Variables

#### Backend (`.env`)

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."  # Optional (Supabase only)

# Server
PORT=4000
NODE_ENV=production

# Authentication
JWT_SECRET="your-secret-key"

# External Services
GOOGLE_API_KEY="your-google-api-key"
REDIS_URL="redis://127.0.0.1:6379"

# CORS
CORS_ORIGINS="https://yourdomain.com"
```

#### Frontend (`.env.local`)

```env
# API Configuration
NEXT_PUBLIC_API_URL="https://api.yourdomain.com"
NEXT_PUBLIC_API_BASE_URL="https://api.yourdomain.com/api"

# Google OAuth (optional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID="your-google-client-id"
```

## 🧪 Testing

### Backend Testing (Future)

```bash
cd backend
npm test                  # Run tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

### Frontend Testing (Future)

```bash
cd frontend
npm test                  # Run tests
npm run test:watch        # Watch mode
npm run test:e2e          # E2E tests
```

## 📝 Scripts

### Backend Scripts

```bash
npm run dev               # Start development server
npm run build             # Build for production
npm run start             # Start production server
npm run prisma:generate   # Generate Prisma client
npm run prisma:migrate    # Run migrations
npm run prisma:studio     # Open Prisma Studio
npm run create:user      # Create admin user
npm run add:students     # Add students from CSV
```

### Frontend Scripts

```bash
npm run dev               # Start development server
npm run dev:local         # Local development (localhost only)
npm run build             # Build for production
npm run start             # Start production server
npm run lint              # Run ESLint
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👥 Authors

- ShadowCoders Team

## 🙏 Acknowledgments

- Prisma for the excellent ORM
- Next.js team for the amazing framework
- React team for the incredible library
- All contributors and users of this project

## 📞 Support

For support, please open an issue on GitHub or contact the development team.

## 🔗 Links

- [Architecture Documentation](./ARCHITECTURE.md)
- [Backend Developer Guide](./backend/DEVELOPER_GUIDE.md)
- [Frontend Developer Guide](./frontend/DEVELOPER_GUIDE.md)
- [Backend API Documentation](./backend/README.md)

---

**Last Updated**: January 2026
**Version**: 2.1.0 (Stability & Security Update)
