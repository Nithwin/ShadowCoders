# Judge0 API Setup Guide

Judge0 is a code execution service used for running and testing student code submissions. This guide explains how to set up Judge0 for the ShadowCoders exam portal.

## Option 1: RapidAPI Judge0 (Recommended for Production)

### Step 1: Create a RapidAPI Account
1. Go to [https://rapidapi.com](https://rapidapi.com)
2. Sign up for a free account (or log in if you already have one)

### Step 2: Subscribe to Judge0 API
1. Search for "Judge0" on RapidAPI or go to:
   - [Judge0 CE API](https://rapidapi.com/judge0-official/api/judge0-ce)
2. Click on "Judge0 CE" API
3. Click "Subscribe to Test" or choose a plan:
   - **Basic (Free)**: 50 requests/day
   - **Pro**: 500 requests/day ($9.99/month)
   - **Ultra**: 10,000 requests/day ($49.99/month)
4. Select the plan that fits your needs (Basic is good for testing)

### Step 3: Get Your API Key
1. After subscribing, go to the "Code Snippets" or "Security" tab
2. Your API key will be displayed (looks like: `abc123def456...`)
3. Copy this API key

### Step 4: Configure Environment Variables
Add the following to your `backend/.env` file:

```env
# Judge0 Configuration (RapidAPI)
JUDGE0_API_URL=https://judge0-ce.p.rapidapi.com
JUDGE0_API_KEY=your_rapidapi_key_here
JUDGE0_RAPIDAPI_HOST=judge0-ce.p.rapidapi.com
```

**Important:** Replace `your_rapidapi_key_here` with your actual RapidAPI key.

### Step 5: Restart Your Backend Server
After updating the `.env` file, restart your backend server:
```bash
npm run dev
```

## Option 2: Free Public Judge0 API (For Testing Only)

The free public Judge0 API doesn't require an API key but has strict rate limits and may be unreliable.

### Configuration
Add to your `backend/.env` file:

```env
# Judge0 Configuration (Free Public API - Not Recommended for Production)
JUDGE0_API_URL=https://ce.judge0.com
JUDGE0_API_KEY=
JUDGE0_RAPIDAPI_HOST=
```

**Note:** Leave `JUDGE0_API_KEY` empty for the free public API.

**Limitations:**
- Rate limits (very strict)
- May be unavailable at times
- Not suitable for production use

## Option 3: Self-Hosted Judge0 (Best for Production)

For production environments, you can self-host Judge0 on your own server. This gives you full control and no rate limits.

### Prerequisites
- Docker and Docker Compose installed
- Server with at least 2GB RAM

### Setup Instructions

1. **Clone Judge0 Repository**
   ```bash
   git clone https://github.com/judge0/judge0.git
   cd judge0
   ```

2. **Start Judge0 with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Verify Judge0 is Running**
   - Judge0 API will be available at `http://localhost:2358`
   - Health check: `http://localhost:2358/health`

4. **Configure Environment Variables**
   Add to your `backend/.env` file:
   ```env
   # Judge0 Configuration (Self-Hosted)
   JUDGE0_API_URL=http://localhost:2358
   JUDGE0_API_KEY=
   JUDGE0_RAPIDAPI_HOST=
   ```

   **Note:** For self-hosted Judge0, you don't need an API key unless you've configured authentication.

5. **If Judge0 is on a Different Server**
   If Judge0 is running on a different server, replace `localhost` with the server's IP or domain:
   ```env
   JUDGE0_API_URL=http://your-server-ip:2358
   ```

## Supported Languages

The following languages are supported:
- JavaScript (Node.js) - Language ID: 63
- Python 3 - Language ID: 71
- Java - Language ID: 62
- C++ - Language ID: 54
- C - Language ID: 50
- C# - Language ID: 51
- PHP - Language ID: 68
- Ruby - Language ID: 72
- Go - Language ID: 60
- Rust - Language ID: 73
- Swift - Language ID: 83
- Kotlin - Language ID: 78

## Testing the Setup

After configuring Judge0, test it by:

1. **Start your backend server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Test code execution**
   - Create a coding question in an exam
   - Start an exam attempt as a student
   - Write code and click "Run Code"
   - Check if the code executes and test cases run

3. **Check Backend Logs**
   If there are errors, check the backend console for Judge0 API errors.

## Troubleshooting

### Error: "Code execution failed"
- Check if your API key is correct (for RapidAPI)
- Verify Judge0 API URL is correct
- Check if you've exceeded rate limits (for free/public API)
- Verify network connectivity to Judge0 server

### Error: "Code execution timed out"
- Check if Judge0 server is running (for self-hosted)
- Verify API endpoint is accessible
- Check server logs for more details

### Rate Limit Errors
- Upgrade to a higher plan on RapidAPI
- Use self-hosted Judge0 for unlimited requests
- Implement request queuing/caching

## Security Notes

1. **Never commit API keys to version control**
   - Always use `.env` file (which should be in `.gitignore`)
   - Use environment variables in production

2. **API Key Security**
   - Keep your RapidAPI key secret
   - Rotate keys periodically
   - Use different keys for development and production

3. **Self-Hosted Security**
   - Use firewall rules to restrict access
   - Implement authentication if exposed to internet
   - Use HTTPS in production

## Production Recommendations

For production use, we recommend:
1. **Self-hosted Judge0** for unlimited requests and full control
2. **RapidAPI Pro/Ultra plan** if self-hosting is not feasible
3. **Implement request caching** to reduce API calls
4. **Monitor API usage** and set up alerts for rate limits
5. **Use HTTPS** for all API communications

## Additional Resources

- [Judge0 Documentation](https://judge0.com/docs)
- [RapidAPI Judge0](https://rapidapi.com/judge0-official/api/judge0-ce)
- [Judge0 GitHub](https://github.com/judge0/judge0)
- [Judge0 Self-Hosting Guide](https://github.com/judge0/judge0#quick-start)

