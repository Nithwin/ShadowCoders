# 🛡️ Anti-Cheating & Integrity Systems

## Why Security Matters
In a digital assessment environment, maintaining a level playing field is our top priority. We've built a multi-layered defense system that ensures every student's work is their own, without requiring intrusive or expensive software.

## Core Defense Mechanisms
Our platform uses **11 unique security layers** to monitor and prevent unauthorized assistance:

1.  **Tab & Window Monitoring**: Detects instantly if a student switches to another tab or browser window.
2.  **Focus Tracking**: The system knows if the exam window is no longer the primary focus of the computer.
3.  **Interaction Blocking**: Prevents right-clicking and advanced multi-touch gestures to stop shortcuts to external tools.
4.  **Security Shortcut Guards**: We block over 15 common "cheating" shortcuts (e.g., Inspect Element, View Source, Print Screen).
5.  **Copy/Paste Restrictions**: Content remains protected. Students can only use copy/paste within their own answer fields.
6.  **Advanced DevTools Detection**: Real-time monitoring for the opening of browser developer tools.
7.  **Multi-Display Detection**: Ensures the exam isn't being moved to a secondary, hidden monitor.
8.  **Automated Screenshot Prevention**: Blocks the PrintScreen key and clears the clipboard if a capture is attempted.
9.  **Injection Prevention**: Uses `MutationObservers` to detect and block any attempt to inject malicious scripts into the exam page.
10. **Fullscreen Enforcement**: The exam can only be taken in dedicated fullscreen mode. If a student exits, the system issues a warning.
11. **Smart Text Protection**: Prevents text selection on question prompts to stop automated scraping.

## 💰 Market Comparison & Cost Efficiency

While traditional proctoring services charge high fees per student or per exam, our native approach reduces the overhead to zero.

| Platform | Typical Cost | ShadowCoders |
| :--- | :--- | :--- |
| **Proctorio** | $5 - $15 per exam | **$0** |
| **Respondus LockDown** | $5 - $10 per student/year | **$0** |
| **ProctorU** | $20 - $40 per exam | **$0** |
| **Honorlock** | $10 - $20 per exam | **$0** |
| **ExamSoft** | $70 - $100 per student/year | **$0** |
| **Examity** | $25 - $35 per exam | **$0** |

### The Real Impact
For a standard class of 100 students taking 5 exams per semester:
*   **Commercial Solutions**: Costs range from **$2,500 to $7,500**.
*   **ShadowCoders**: Costs exactly **$0**.

This ensures that high-quality, secure assessment is accessible to every institution, regardless of their budget.


## Intelligent Warning System
We don't just block; we educate. The system includes a progressive warning hierarchy:
*   **Minor Violations**: Real-time banners appear at the top of the screen.
*   **Automatic Submission**: If a student ignores 3 consecutive security warnings (like exiting fullscreen or switching tabs), the exam is **automatically submitted** with the reason logged for the professor.

## The Result
By leveraging native browser power instead of clunky third-party apps, we provide a secure, fail-safe, and private environment that respects student privacy while protecting academic integrity.
