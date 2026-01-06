# ShadowCoders User Manual

Welcome to **ShadowCoders**, the advanced coding examination platform. This manual guides both **Students** and **Admins** through the key features of the application.

## 🎓 For Students

### 1. Getting Started
- **Login:** Use your credentials to log in.
- **Dashboard:** Your home screen shows:
  - **Upcoming Exams:** Exams scheduled for the future.
  - **Active Exams:** Exams currently in progress that you can join.
  - **Completed Exams:** Your past attempts and scores.

### 2. Taking an Exam
- Click **"Start Exam"** on an active exam.
- **Fullscreen Mode:** The exam requires fullscreen. Do not exit fullscreen or switch tabs, as this may be flagged as suspicious behavior.
- **Coding Interface:**
  - **Problem Description:** Read the question on the left.
  - **Code Editor:** Write your solution in the supported languages (Python, Java, C++, etc.).
  - **Run Code:** Test your solution against sample test cases.
  - **Submit:** Submit your final solution. You will see a "Verdict" (Accepted, Wrong Answer, etc.).

### 3. Using the Local Code Runner (For Fast Execution)
ShadowCoders includes a powerful **Local Runner** that allows you to execute code on your own machine instead of the cloud server. This is faster and works offline if you have the dependencies.
1.  **Download the Bridge:** Get the Local Runner script (link provided by Admin).
2.  **Start the Runner:** Run the script on your computer (`node local-runner.js`).
3.  **Automatic Connection:** The exam page will automatically detect the local runner and switch to "Local Mode" (⚡ icon).
4.  **Enjoy Speed:** Your code compiles and runs instantly!

---

## 🛡️ For Administrators

### 1. Dashboard Overview
The Admin Dashboard gives a high-level view of the system:
- **Stats:** Total students, exams, and recent submission trends.
- **Quick Links:** Create exams, manage users, and view reports.

### 2. Managing Users
- Navigate to the **Users** tab.
- **Add User:** Manually create student or staff accounts.
- **Bulk Import:** (Coming feature) Import students via Excel.
- **Refresh List:** Use the "Refresh" button to reload the user list.

### 3. Creating Exams
- Click **"Create New Exam"**.
- **Details:** Set the Title, Start/End Time, and Instructions.
- **Questions:** You can add questions in two ways:
  - **Manual Entry:** Type the problem, test cases, and hidden cases.
  - **AI Generation:** Click **"Generate with AI"** 🤖. Describe the topic (e.g., "Medium difficulty arrays problem") and the AI will create a complete question for you.

### 4. Monitoring & Results
- **Live Leaderboard:** Watch student progress in real-time.
- **Submissions:** View individual code submissions.
- **Detailed Analytics:**
  - Click on an exam to see per-question stats.
  - **Export:** Use the "Export to Excel" feature to download comprehensive grade reports including question-level breakdowns.
