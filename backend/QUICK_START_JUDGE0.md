# Quick Start: Judge0 API Setup

## Fastest Way to Get Started (RapidAPI - Recommended)

### 1. Sign up for RapidAPI (2 minutes)
- Go to [https://rapidapi.com](https://rapidapi.com)
- Sign up for a free account

### 2. Subscribe to Judge0 API (1 minute)
- Visit: [https://rapidapi.com/judge0-official/api/judge0-ce](https://rapidapi.com/judge0-official/api/judge0-ce)
- Click "Subscribe to Test" (Free plan: 50 requests/day)
- Or choose a paid plan for more requests

### 3. Get Your API Key (30 seconds)
- After subscribing, go to the "Code Snippets" tab
- Copy your API key (looks like: `abc123def456ghi789...`)

### 4. Add to Backend .env File (1 minute)
Create or update `backend/.env`:

```env
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_api_key_here
JUDGE0_RAPIDAPI_HOST=judge0-ce.p.rapidapi.com
```

**Replace `your_api_key_here` with your actual RapidAPI key!**

### 5. Restart Backend Server
```bash
cd backend
npm run dev
```

### 6. Test It!
- Create a coding question in an exam
- Start an exam as a student
- Write code and click "Run Code"
- You should see test case results!

---

## Alternative: Free Public API (No API Key Needed)

If you just want to test quickly without signing up:

### Add to `backend/.env`:
```env
JUDGE0_API_URL=https://ce.judge0.com
JUDGE0_API_KEY=
JUDGE0_RAPIDAPI_HOST=
```

**Note:** Leave the API key empty. This has strict rate limits and may not work reliably.

---

## Troubleshooting

### "Code execution failed" error?
1. Check if your API key is correct
2. Verify the `.env` file is in the `backend/` directory
3. Make sure you restarted the server after adding the key
4. Check backend console logs for detailed error messages

### Still not working?
- See the full guide: `JUDGE0_SETUP.md`
- Check Judge0 API status: [https://status.judge0.com](https://status.judge0.com)
- Verify your RapidAPI subscription is active

---

## Production Recommendations

For production use:
- **Self-host Judge0** (best option - unlimited requests)
- **RapidAPI Pro/Ultra plan** (if self-hosting isn't possible)
- **Never use the free public API** in production (unreliable)

See `JUDGE0_SETUP.md` for detailed production setup instructions.

