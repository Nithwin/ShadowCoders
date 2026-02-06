# 🛠️ ShadowCoders Technical Deep-Dive
**"How it Works Under the Hood"**



---

## 👁️ 1. Biometric AI Proctoring (Edge Computing)

### **Q: What models are you using for tracking?**
*   **Base Framework**: Google’s **MediaPipe** (`tasks-vision`).
*   **Specific Model**: `face_landmarker.task` (quantized `float16` version for speed).
*   **Pipeline**: We use a **WebAssembly (WASM)** and **WebGL (GPU)** accelerated pipeline running directly in the browser.

### **Q: How do you detect if someone is looking away?**
We don't just "guess." We use 3D geometry from 478 landmarks:
1.  **Head Pose (Yaw/Pitch)**: We calculate the relative position of the **Nose Tip** (Landmark 1) against the **Eye Centers** (Landmarks 468, 473). If the "Yaw" angle exceeds 35°, the head is turned.
2.  **EAR (Eye Aspect Ratio)**: We measure the vertical-to-horizontal distance of the eyelid. 
    *   **Formula**: `(v1 + v2) / (2 * h)`
    *   **Blink vs. Cheat**: If EAR stays below **0.18** for more than **1000ms**, it's flagged as a violation (eyes closed/looking down).
3.  **Gaze Deviation**: We monitor the iris displacement relative to the eye socket coordinates.

---

## 🤖 2. Local AI & LLMs (The Brain)

### **Q: Why Ollama? Why not just use OpenAI API?**
*   **Cost**: $0.00 vs. $0.10/student.
*   **Privacy**: Student answers (which might contain names or sensitive code) stay on your server.
*   **Offline Mode**: ShadowCoders can run on a local LAN during an internet outage. OpenAI cannot.

### **Q: How do you handle 100 students hitting the AI at once?**
We built **ShadowQueue**:
*   **Concurrency Control**: We limit the AI to process **1 essay at a time** (or up to your CPU cores) to prevent the CPU from melting.
*   **Job Persistence**: Every request is saved in **Postgres**. If the server crashes, the queue resumes precisely where it stopped.

---

## ⚡ 3. The Backend Architecture

### **Q: What is your stack and why?**
*   **Frontend**: `Next.js` (React). Chosen for SSR and SEO-ready dashboards.
*   **Backend**: `Node.js` with `Express`. Handles high-concurrency real-time events.
*   **Database**: `PostgreSQL` with `Prisma ORM`. Relational data is critical for linking Exams -> Attempts -> Responses -> Violations.
*   **Queue**: Custom persistent logic (built with Node.js & Prisma) instead of Redis to keep infrastructure simple and cost-effective.

---

## 🛡️ 4. Security & Anti-Cheating

### **Q: How do you prevent Tab Switching?**
We use the **Page Visibility API** and **Window Focus Events**. If a student loses focus for even 1 second, it's logged with a timestamp in the database.

### **Q: Can someone just Inspect Element and delete the tracker?**
Even if they hide the UI, the **Backend ShadowQueue** knows the tracking events stopped sending. The server-side logger will flag the "Missing Heartbeat" or lack of tracking events during a submission.

---

## 🗄️ 4. The Database: Scaling with Integrity

### **Q: How many tables are in your project?**
ShadowCoders uses **26 relational database tables** to manage the entire ecosystem.

### **Q: What are the most important tables?**
1.  **Exam & Question**: The core of the assessment logic.
2.  **Attempt & Response**: Tracks exactly what every student submitted and when.
3.  **ProctoringEvent**: Stores the "AI-detected" violations (Eye tracking, Head movement).
4.  **GradingJob**: The "ShadowQueue" backbone that tracks AI tasks.
5.  **User & PointsHistory**: Powers the gamification XP and rewards system.

---

## 🏁 Technical Stats (Bonus)
*   **Total Code**: 54,000+ Lines.
*   **AI Confidence**: 95% detection accuracy for face/head pose.
*   **Scalability**: Supports 10,000+ concurrent students for MCQ; 1,000+ for AI grading (depending on hardware).


