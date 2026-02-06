# 🕵️ Spotting the Bot: Next-Gen AI Detection
**"Using technology to keep writing human."**

## ⚠️ The "ChatGPT" Dilemma
Every teacher knows students are using AI to write. The problem? Traditional plagiarism checkers can't catch it because the AI is "writing" original words every time. 

## 🔬 Our Approach: Looking for the "AI Fingerprint"
Humans aren't robots. We write with a specific rhythm—sometimes we're messy, sometimes we're poetic. AI is always... *consistent*. 

We built a specialized **Python AI Service** that looks for these subtle patterns using two deep-tech metrics:

1.  **Perplexity (The "Pattern" Test)**
    *   AI writes the most likely word every time. It’s safe and predictable.
    *   We measure how "surprised" a model is by the text. If it’s not surprised at all, it was likely written by a machine.

2.  **Burstiness (The "Rhythm" Test)**
    *   Humans write in bursts. We have long, winding sentences followed by short, punchy ones.
    *   AI writes in a flat, even tempo. We detect that "unnatural" smoothness.

## 🛠️ The Architecture
We don't just use a simple script. We have a dedicated Python microservice that uses heavy-duty Machine Learning (`PyTorch` and `Transformers`) to analyze text deeply. It then sends a "Heatmap" back to the teacher, highlighting exactly which parts feel a little too "artificial."


