# Exam Attempt Page Component Structure

## Overview
The exam attempt page has been refactored into smaller, reusable components for better maintainability and understanding.

## Component Hierarchy

```
ExamAttemptPage (Main Page)
├── ExamLoadingScreen (Loading state)
├── ExamErrorScreen (Error state)
├── ExamLockedScreen (Locked/Completed state)
├── FullscreenWarning (Warning banner)
├── ExamHeader (Header with timer and controls)
│   └── ExamTimer (Timer component)
├── QuestionNavigation (Sidebar with question list)
└── QuestionContent (Main content area)
    ├── QuestionHeader (Question type and points)
    ├── MCQQuestion (MCQ question component)
    ├── CodingQuestion (Coding question component)
    ├── EssayQuestion (Essay question component)
    └── QuestionNavigationButtons (Previous/Next/Submit buttons)
```

## Components

### 1. ExamLoadingScreen
**Location**: `components/student/exam/ExamLoadingScreen.tsx`

Displays a loading spinner while the exam is being fetched.

**Props**: None

**Usage**:
```tsx
<ExamLoadingScreen />
```

### 2. ExamErrorScreen
**Location**: `components/student/exam/ExamErrorScreen.tsx`

Displays an error message with a button to return to the dashboard.

**Props**:
- `error: string` - Error message to display

**Usage**:
```tsx
<ExamErrorScreen error="Failed to load exam" />
```

### 3. ExamLockedScreen
**Location**: `components/student/exam/ExamLockedScreen.tsx`

Displays a message when the exam is locked (time up or completed).

**Props**:
- `timeRemaining: number` - Time remaining (0 if locked)

**Usage**:
```tsx
<ExamLockedScreen timeRemaining={0} />
```

### 4. FullscreenWarning
**Location**: `components/student/exam/FullscreenWarning.tsx`

Displays a warning banner when the user exits fullscreen mode.

**Props**:
- `warningCount: number` - Number of warnings (1-3)
- `show: boolean` - Whether to show the warning

**Usage**:
```tsx
<FullscreenWarning warningCount={2} show={true} />
```

### 5. ExamHeader
**Location**: `components/student/exam/ExamHeader.tsx`

Displays the exam header with title, question progress, timer, fullscreen button, and submit button.

**Props**:
- `examTitle: string` - Title of the exam
- `currentQuestionIndex: number` - Current question index (0-based)
- `totalQuestions: number` - Total number of questions
- `answeredCount: number` - Number of answered questions
- `durationMins: number` - Exam duration in minutes
- `startedAt: string` - ISO string of when the exam started
- `status: string` - Exam status ('IN_PROGRESS', 'SUBMITTED', etc.)
- `isFullscreen: boolean` - Whether the exam is in fullscreen mode
- `isSubmitting: boolean` - Whether the exam is being submitted
- `onEnterFullscreen: () => void` - Callback to enter fullscreen
- `onSubmitExam: () => void` - Callback to submit the exam
- `onTimeUp: () => void` - Callback when time is up

**Usage**:
```tsx
<ExamHeader
  examTitle="Math Exam"
  currentQuestionIndex={0}
  totalQuestions={10}
  answeredCount={3}
  durationMins={60}
  startedAt="2024-01-01T00:00:00Z"
  status="IN_PROGRESS"
  isFullscreen={true}
  isSubmitting={false}
  onEnterFullscreen={handleEnterFullscreen}
  onSubmitExam={handleSubmitExam}
  onTimeUp={handleTimeUp}
/>
```

### 6. ExamTimer
**Location**: `components/student/exam/ExamTimer.tsx`

Displays and manages the exam timer. Automatically calls `onTimeUp` when time reaches 0.

**Props**:
- `durationMins: number` - Exam duration in minutes
- `startedAt: string` - ISO string of when the exam started
- `onTimeUp: () => void` - Callback when time is up
- `status: string` - Exam status

**Features**:
- Displays time in format: `MM:SS` or `H:MM:SS`
- Changes color based on time remaining:
  - Green: > 10 minutes
  - Yellow: 5-10 minutes
  - Red: < 5 minutes (with pulse animation)
- Automatically updates every second
- Validates duration and start time

**Usage**:
```tsx
<ExamTimer
  durationMins={60}
  startedAt="2024-01-01T00:00:00Z"
  onTimeUp={handleTimeUp}
  status="IN_PROGRESS"
/>
```

### 7. QuestionNavigation
**Location**: `components/student/exam/QuestionNavigation.tsx`

Displays a sidebar with a list of questions, progress bar, and question status indicators.

**Props**:
- `questions: Question[]` - Array of questions
- `currentQuestionIndex: number` - Current question index
- `answers: Record<string, any>` - Answers object
- `onQuestionClick: (index: number) => void` - Callback when a question is clicked

**Features**:
- Shows progress bar (answered/total questions)
- Highlights current question
- Shows checkmark for answered questions
- Color coding:
  - Primary: Current question
  - Green: Answered questions
  - Gray: Unanswered questions

**Usage**:
```tsx
<QuestionNavigation
  questions={questions}
  currentQuestionIndex={0}
  answers={answers}
  onQuestionClick={handleQuestionClick}
/>
```

### 8. QuestionHeader
**Location**: `components/student/exam/QuestionHeader.tsx`

Displays the question type and points (for non-coding questions).

**Props**:
- `type: QType` - Question type (MCQ, ESSAY)
- `points: number` - Points for the question

**Usage**:
```tsx
<QuestionHeader type={QType.MCQ} points={10} />
```

### 9. QuestionNavigationButtons
**Location**: `components/student/exam/QuestionNavigationButtons.tsx`

Displays Previous, Next, and Submit buttons for question navigation.

**Props**:
- `currentQuestionIndex: number` - Current question index
- `totalQuestions: number` - Total number of questions
- `isSubmitting: boolean` - Whether the exam is being submitted
- `onPrevious: () => void` - Callback for previous button
- `onNext: () => void` - Callback for next button
- `onSubmit: () => void` - Callback for submit button

**Features**:
- Previous button is disabled on first question
- Shows "Submit Exam" button on last question
- All buttons are disabled when submitting

**Usage**:
```tsx
<QuestionNavigationButtons
  currentQuestionIndex={0}
  totalQuestions={10}
  isSubmitting={false}
  onPrevious={handlePrevious}
  onNext={handleNext}
  onSubmit={handleSubmit}
/>
```

## Main Page: ExamAttemptPage

**Location**: `app/student/attempts/[attemptId]/page.tsx`

### Key Responsibilities

1. **State Management**:
   - Exam attempt data
   - Questions and answers
   - Current question index
   - Loading and error states
   - Fullscreen state
   - Warning count

2. **Data Fetching**:
   - Fetches attempt data from API
   - Fetches questions for the attempt
   - Loads answers from localStorage
   - Saves answers to localStorage

3. **Exam Submission**:
   - Formats answers based on question type
   - Saves all answers to server
   - Submits the attempt
   - Clears localStorage
   - Redirects to dashboard

4. **Fullscreen Management**:
   - Enters fullscreen when exam starts
   - Monitors fullscreen changes
   - Warns user on exit (3 warnings = auto-submit)
   - Re-enters fullscreen after warning

5. **Cheating Prevention**:
   - Prevents context menu
   - Blocks F12 and DevTools shortcuts
   - Monitors tab visibility changes
   - Auto-submits on repeated violations

6. **Answer Management**:
   - Saves answers to localStorage in real-time
   - Loads answers from localStorage on mount
   - Formats answers based on question type
   - Syncs with server responses

### Data Flow

1. **Load Exam**:
   - Fetch attempt from API
   - Load answers from localStorage
   - Merge with server responses
   - Fetch questions for attempt
   - Format answers based on question types

2. **Answer Questions**:
   - User answers question
   - Answer saved to state
   - Answer saved to localStorage
   - Answer formatted based on question type

3. **Submit Exam**:
   - User clicks submit
   - All answers formatted and saved to server
   - Attempt submitted
   - localStorage cleared
   - Redirect to dashboard

## Benefits of Component Structure

1. **Reusability**: Components can be reused in other parts of the application
2. **Maintainability**: Easier to understand and modify individual components
3. **Testability**: Each component can be tested independently
4. **Readability**: Main page is cleaner and easier to understand
5. **Separation of Concerns**: Each component has a single responsibility

## Future Improvements

1. **Custom Hooks**: Extract logic into custom hooks (e.g., `useExamTimer`, `useFullscreen`)
2. **Context API**: Use React Context for shared state (answers, attempt data)
3. **Error Boundaries**: Add error boundaries for better error handling
4. **Accessibility**: Improve keyboard navigation and screen reader support
5. **Performance**: Optimize re-renders with React.memo and useMemo

