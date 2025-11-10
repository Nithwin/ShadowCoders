# Local Code Execution Guide

## Overview
The application now supports local code execution as an alternative to Judge0. This allows you to run code directly on your server without relying on external APIs.

## Configuration

### Environment Variable
Add the following to your `.env` file:

```env
# Code execution provider: 'judge0' or 'local'
CODE_EXECUTION_PROVIDER=local
```

- `judge0`: Use Judge0 API (default, requires internet connection)
- `local`: Use local code execution (runs on your server)

## Supported Languages

The local executor supports the following languages:

1. **JavaScript** (Node.js)
   - Command: `node`
   - Extension: `.js`
   - Default timeout: 5 seconds

2. **Python** (Python 3)
   - Command: `python3`
   - Extension: `.py`
   - Default timeout: 5 seconds

3. **Java**
   - Commands: `javac` (compile), `java` (run)
   - Extension: `.java`
   - Default timeout: 10 seconds

4. **C++**
   - Commands: `g++` (compile), executable (run)
   - Extension: `.cpp`
   - Default timeout: 10 seconds

5. **C**
   - Commands: `gcc` (compile), executable (run)
   - Extension: `.c`
   - Default timeout: 10 seconds

## System Requirements

### Required Software
To use local code execution, you need to install the following on your server:

#### For JavaScript:
```bash
# Node.js (v14 or higher)
node --version
```

#### For Python:
```bash
# Python 3
python3 --version
```

#### For Java:
```bash
# Java Development Kit (JDK)
javac -version
java -version
```

#### For C/C++:
```bash
# GCC compiler
gcc --version
g++ --version
```

### Installation Guide

#### Ubuntu/Debian:
```bash
# Update package list
sudo apt update

# Install Node.js
sudo apt install nodejs npm

# Install Python 3
sudo apt install python3

# Install Java
sudo apt install default-jdk

# Install GCC/G++
sudo apt install build-essential
```

#### macOS:
```bash
# Install Homebrew (if not already installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node

# Install Python 3
brew install python3

# Install Java
brew install openjdk

# Install GCC (comes with Xcode Command Line Tools)
xcode-select --install
```

#### Windows:
1. **Node.js**: Download from [nodejs.org](https://nodejs.org/)
2. **Python**: Download from [python.org](https://www.python.org/)
3. **Java**: Download JDK from [oracle.com](https://www.oracle.com/java/technologies/downloads/)
4. **GCC**: Install MinGW-w64 or use Visual Studio Build Tools

## Security Considerations

⚠️ **IMPORTANT**: Local code execution runs code directly on your server. This poses security risks:

### Risks:
1. **File System Access**: Code can read/write files in temporary directories
2. **Network Access**: Code can make network requests
3. **Resource Exhaustion**: Malicious code can consume CPU/memory
4. **System Calls**: Code can execute system commands

### Current Safety Measures:
1. **Timeouts**: Each execution has a timeout (default 5-10 seconds)
2. **Temporary Directories**: Code runs in isolated temporary directories
3. **Cleanup**: Temporary files are automatically deleted after execution
4. **Process Isolation**: Each execution runs in a separate process

### Recommended Security Improvements:

#### 1. Docker Containerization (Recommended)
Run code execution in Docker containers for better isolation:

```typescript
// Example: Use Docker to run code in isolated containers
const dockerCommand = `docker run --rm --memory=128m --cpu-quota=50000 --timeout=5s ...`;
```

#### 2. User Isolation
Run code execution as a non-privileged user:

```bash
# Create a dedicated user for code execution
sudo useradd -r -s /bin/false codeexec

# Run processes as this user
```

#### 3. Resource Limits
Use `ulimit` or `systemd` to set resource limits:

```bash
# Set memory limit
ulimit -v 131072  # 128 MB

# Set CPU time limit
ulimit -t 10  # 10 seconds
```

#### 4. Network Restrictions
Block network access for code execution:

```bash
# Use firewall rules or network namespaces
iptables -A OUTPUT -m owner --uid-owner codeexec -j DROP
```

#### 5. File System Restrictions
Use `chroot` or mount points to restrict file system access:

```bash
# Create a restricted directory
mkdir -p /var/codeexec/jail

# Mount as read-only
mount --bind /var/codeexec/jail /var/codeexec/jail
mount -o remount,ro /var/codeexec/jail
```

## Usage

### Switching Providers

1. **Using Judge0** (default):
   ```env
   CODE_EXECUTION_PROVIDER=judge0
   ```

2. **Using Local Execution**:
   ```env
   CODE_EXECUTION_PROVIDER=local
   ```

### API Endpoint
The API endpoint remains the same regardless of the provider:

```
POST /api/student/attempts/:attemptId/run-code
```

### Request Body
```json
{
  "questionId": "question-id",
  "code": "console.log('Hello, World!');",
  "language": "javascript"
}
```

### Response
```json
{
  "passed": 2,
  "total": 3,
  "testResults": [
    {
      "input": "5\n10",
      "expectedOutput": "15",
      "actualOutput": "15",
      "passed": true,
      "status": "Accepted"
    }
  ],
  "message": "2/3 test cases passed"
}
```

## Testing

### Test Local Execution

1. **Set environment variable**:
   ```env
   CODE_EXECUTION_PROVIDER=local
   ```

2. **Restart your server**:
   ```bash
   npm run dev
   ```

3. **Test with a simple code**:
   ```javascript
   // JavaScript
   console.log("Hello, World!");
   ```

   ```python
   # Python
   print("Hello, World!")
   ```

### Verify Installation

Test each language:

```bash
# JavaScript
node --version
echo "console.log('test');" > test.js
node test.js

# Python
python3 --version
echo "print('test')" > test.py
python3 test.py

# Java
javac -version
echo "public class Test { public static void main(String[] args) { System.out.println(\"test\"); } }" > Test.java
javac Test.java
java Test

# C++
g++ --version
echo '#include <iostream>
int main() { std::cout << "test" << std::endl; return 0; }' > test.cpp
g++ test.cpp -o test
./test
```

## Troubleshooting

### Code Not Executing

1. **Check if language is installed**:
   ```bash
   # Verify installation
   node --version
   python3 --version
   javac -version
   g++ --version
   ```

2. **Check file permissions**:
   ```bash
   # Ensure temp directory is writable
   ls -la /tmp
   ```

3. **Check server logs**:
   ```bash
   # Look for error messages
   tail -f logs/app.log
   ```

### Timeout Issues

1. **Increase timeout**:
   ```typescript
   // In test case definition
   timeoutMs: 10000  // 10 seconds
   ```

2. **Optimize code**:
   - Remove infinite loops
   - Optimize algorithms
   - Reduce I/O operations

### Compilation Errors

1. **Check syntax**:
   - Verify code syntax for the language
   - Check for missing imports
   - Verify class names match file names (Java)

2. **Check compiler output**:
   - Review `compileOutput` in response
   - Fix compilation errors
   - Re-test

### Runtime Errors

1. **Check error messages**:
   - Review `stderr` in response
   - Fix runtime errors
   - Handle edge cases

2. **Test locally**:
   - Run code manually on server
   - Verify inputs/outputs
   - Check for missing dependencies

## Performance

### Comparison: Judge0 vs Local

| Feature | Judge0 | Local |
|---------|--------|-------|
| Setup | Requires API key | Requires software installation |
| Speed | Network latency | No network latency |
| Reliability | Depends on API | Depends on server |
| Security | Sandboxed | Requires manual sandboxing |
| Cost | Free tier limited | Free (server resources) |
| Languages | Many | Limited to installed |

### Recommendations

- **Development**: Use local execution for faster testing
- **Production**: Use Judge0 for better security and reliability
- **Hybrid**: Use local for development, Judge0 for production

## Future Improvements

1. **Docker Integration**: Run code in Docker containers
2. **More Languages**: Add support for more languages (Go, Rust, etc.)
3. **Resource Monitoring**: Monitor CPU/memory usage
4. **Queue System**: Implement a queue for code execution
5. **Caching**: Cache compilation results for compiled languages
6. **Sandboxing**: Improve sandboxing with namespaces and cgroups

## Support

For issues or questions:
1. Check server logs
2. Verify software installation
3. Test code manually
4. Review error messages
5. Check system resources

