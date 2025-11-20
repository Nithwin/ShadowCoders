// Test Java execution
const { executeCodeLocally } = require('./dist/lib/local-executor');

const javaCode = `
public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`;

async function testJava() {
    console.log('Testing Java execution...');
    try {
        const result = await executeCodeLocally(javaCode, 'java', '', 10000);
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

testJava();
