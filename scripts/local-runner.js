const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const os = require('os');

const PORT = 3005;

// Enable CORS
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'OPTIONS, POST, GET',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, headers);
    res.end(JSON.stringify({ status: 'ok', version: '1.0.0' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/execute') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { code, language, input, timeLimit } = JSON.parse(body);
        const result = await executeCode(code, language, input, timeLimit || 5000);
        res.writeHead(200, headers);
        res.end(JSON.stringify(result));
      } catch (err) {
        res.writeHead(500, headers);
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, headers);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// --- Execution Logic (Simplified from Backend) ---

const LANGUAGE_CONFIGS = {
  javascript: { extension: 'js', command: 'node', run: (f) => `node "${f}"` },
  python: { extension: 'py', command: 'python', run: (f) => `python "${f}"` },
  java: { extension: 'java', command: 'javac', run: (f, dir) => `java -cp "${dir}" Main` },
  cpp: { extension: 'cpp', command: 'g++', run: (f) => process.platform === 'win32' ? `"${f.replace('.cpp', '.exe')}"` : `"${f.replace('.cpp', '.out')}"` },
  c: { extension: 'c', command: 'gcc', run: (f) => process.platform === 'win32' ? `"${f.replace('.c', '.exe')}"` : `"${f.replace('.c', '.out')}"` }
};

const execAsync = (cmd, opts) => new Promise((resolve, reject) => {
  exec(cmd, opts, (err, stdout, stderr) => resolve({ err, stdout, stderr }));
});

async function executeCode(code, language, input, timeoutMs) {
  const config = LANGUAGE_CONFIGS[language.toLowerCase()];
  if (!config) return { error: `Unsupported language: ${language}` };

  const tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'local-run-'));
  const fileName = language === 'java' ? 'Main.java' : `code.${config.extension}`;
  const filePath = path.join(tempDir, fileName);

  try {
    await fs.promises.writeFile(filePath, code);

    // Compile
    if (language === 'java') {
      const { err, stderr } = await execAsync(`javac "${filePath}"`, { cwd: tempDir });
      if (err) return { status: { id: 6, description: 'Compilation Error' }, error: stderr || err.message };
    } else if (language === 'cpp' || language === 'c') {
      const out = process.platform === 'win32' ? filePath.replace(/\.(cpp|c)$/, '.exe') : filePath.replace(/\.(cpp|c)$/, '.out');
      const { err, stderr } = await execAsync(`${config.command} "${filePath}" -o "${out}"`, { cwd: tempDir });
      if (err) return { status: { id: 6, description: 'Compilation Error' }, error: stderr || err.message };
    }

    // Run
    const runCmd = config.run(filePath, tempDir);
    const result = await executeWithTimeout(runCmd, input || '', tempDir, timeoutMs);
    
    return {
      output: result.stdout,
      error: result.stderr,
      status: result.timedOut ? { id: 5, description: 'Time Limit Exceeded' } : (result.error ? { id: 7, description: 'Runtime Error' } : { id: 3, description: 'Accepted' }),
      time: 0, 
      memory: 0
    };

  } finally {
    // Cleanup 
    setTimeout(() => fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {}), 500);
  }
}

function executeWithTimeout(command, input, cwd, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd, shell: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill(); } catch(e) {}
      resolve({ stdout: stdout.trim(), stderr: stderr.trim() || 'Time Limit Exceeded', timedOut: true });
    }, timeoutMs);

    child.stdout.on('data', d => stdout += d.toString());
    child.stderr.on('data', d => stderr += d.toString());
    
    if (input) {
      try { child.stdin.write(input + '\n'); child.stdin.end(); } catch(e) {}
    } else {
        child.stdin.end();
    }

    child.on('close', code => {
      clearTimeout(timer);
      if (!timedOut) resolve({ stdout: stdout.trim(), stderr: stderr.trim(), error: code !== 0 ? `Exit code ${code}` : null, timedOut: false });
    });
    
    child.on('error', err => {
        clearTimeout(timer);
        resolve({ stdout: stdout.trim(), stderr: err.message, error: err.message, timedOut: false });
    });
  });
}

server.listen(PORT, () => {
  console.log(`Local Execution Runner listening on port ${PORT}`);
  console.log(`Keep this window open while taking the exam to enable local execution.`);
});
