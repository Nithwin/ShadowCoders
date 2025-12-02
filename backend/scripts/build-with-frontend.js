// Build frontend (Next.js) and backend (TypeScript) for production
// Usage: node scripts/build-with-frontend.js

const { spawnSync } = require('child_process');
const path = require('path');

function run(cmd, args, cwd) {
  const res = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell: true });
  if (res.status !== 0) {
    process.exit(res.status || 1);
  }
}

const repoRoot = path.resolve(__dirname, '..', '..');
const frontendDir = path.join(repoRoot, 'frontend');
const backendDir = path.join(repoRoot, 'backend');

console.log('\n=== Building Frontend ===');
run('npm', ['ci'], frontendDir);
run('npm', ['run', 'build'], frontendDir);
run('npm', ['run', 'export'], frontendDir);

console.log('\n=== Building Backend ===');
run('npm', ['ci'], backendDir);
run('npm', ['run', 'build'], backendDir);

console.log('\n✅ Build complete. Start with:');
console.log('   NODE_ENV=production node dist/index.js');
