// Test Java execution locally
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const javaCode = `import java.util.Scanner;
class Main{
  public static void main(String args[]){
    Scanner input = new Scanner(System.in);
    String s = input.nextLine();
    boolean flag = true;
    for(int i = 0; i < s.length()/2; i++){
      if(s.charAt(i) != s.charAt(s.length() - i - 1)){
        flag = false; 
        break;
      }
    }
    System.out.print((flag ? "YES" : "NO"));
  }
}`;

const testInput = "racecar";

// Create temp directory
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-java-'));
console.log('Temp directory:', tempDir);

try {
  // Write Java file
  const filePath = path.join(tempDir, 'Main.java');
  fs.writeFileSync(filePath, javaCode);
  console.log('File written:', filePath);
  
  // Compile
  console.log('\n=== COMPILING ===');
  const compileCmd = `javac "${filePath}"`;
  console.log('Command:', compileCmd);
  try {
    const compileOutput = execSync(compileCmd, { cwd: tempDir, encoding: 'utf8' });
    console.log('Compile output:', compileOutput || '(no output - success)');
  } catch (err) {
    console.error('Compile error:', err.stderr || err.message);
    process.exit(1);
  }
  
  // Check if .class file was created
  const classFile = path.join(tempDir, 'Main.class');
  if (fs.existsSync(classFile)) {
    console.log('✓ Main.class file created');
  } else {
    console.error('✗ Main.class file NOT created');
  }
  
  // Run with input
  console.log('\n=== RUNNING ===');
  const runCmd = `java -cp "${tempDir}" Main`;
  console.log('Command:', runCmd);
  console.log('Input:', testInput);
  
  try {
    const output = execSync(runCmd, { 
      cwd: tempDir, 
      encoding: 'utf8',
      input: testInput + '\n',
      shell: 'cmd.exe'
    });
    console.log('Output:', output);
    console.log('Expected: YES');
  } catch (err) {
    console.error('Runtime error:', err.stderr || err.message);
    console.error('stdout:', err.stdout);
  }
  
} finally {
  // Cleanup
  setTimeout(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
      console.log('\n✓ Cleaned up temp directory');
    } catch (err) {
      console.error('Cleanup error:', err.message);
    }
  }, 1000);
}
