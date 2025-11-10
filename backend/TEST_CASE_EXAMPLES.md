# Test Case Format Examples for AI Generation

This document shows the correct format for test cases in coding questions.

## Input/Output Format

Test cases use **standard input (stdin)** and **standard output (stdout)** format.

### Example 1: Simple Addition

**Problem:** Read two integers and print their sum.

**Test Cases:**
```json
{
  "input": "5\n10",
  "expectedOutput": "15",
  "isHidden": false,
  "timeoutMs": 2000
}
```

**Note:** In JSON, use `\n` for newlines (not actual newlines).

### Example 2: Array Maximum

**Problem:** Read n, then n integers, print the maximum.

**Test Cases:**
```json
{
  "input": "5\n1 5 3 9 2",
  "expectedOutput": "9",
  "isHidden": false,
  "timeoutMs": 2000
}
```

### Example 3: String Reversal

**Problem:** Read a string and print it reversed.

**Test Cases:**
```json
{
  "input": "hello",
  "expectedOutput": "olleh",
  "isHidden": false,
  "timeoutMs": 2000
}
```

### Example 4: Multiple Lines Input/Output

**Problem:** Read n lines, print each line reversed.

**Test Cases:**
```json
{
  "input": "3\nhello\nworld\ntest",
  "expectedOutput": "olleh\ndlrow\ntset",
  "isHidden": false,
  "timeoutMs": 2000
}
```

## Common Formats

### Single Integer
- Input: `"5"`
- Output: `"10"`

### Two Integers (separate lines)
- Input: `"5\n10"`
- Output: `"15"`

### Two Integers (same line)
- Input: `"5 10"`
- Output: `"15"`

### Array of Numbers
- Input: `"5\n1 2 3 4 5"` (first number is count, then array)
- Output: `"15"` (sum)

### String
- Input: `"hello world"`
- Output: `"dlrow olleh"`

### Multiple Test Cases Example

For a "Find Maximum" problem:

```json
{
  "testcases": [
    {
      "input": "5\n1 5 3 9 2",
      "expectedOutput": "9",
      "isHidden": false,
      "timeoutMs": 2000
    },
    {
      "input": "3\n-1 -5 -3",
      "expectedOutput": "-1",
      "isHidden": false,
      "timeoutMs": 2000
    },
    {
      "input": "1\n42",
      "expectedOutput": "42",
      "isHidden": true,
      "timeoutMs": 2000
    },
    {
      "input": "10\n1 2 3 4 5 6 7 8 9 10",
      "expectedOutput": "10",
      "isHidden": true,
      "timeoutMs": 2000
    },
    {
      "input": "2\n100 -100",
      "expectedOutput": "100",
      "isHidden": true,
      "timeoutMs": 2000
    },
    {
      "input": "4\n0 0 0 0",
      "expectedOutput": "0",
      "isHidden": true,
      "timeoutMs": 2000
    },
    {
      "input": "6\n-10 -5 -20 -1 -15 -3",
      "expectedOutput": "-1",
      "isHidden": true,
      "timeoutMs": 2000
    }
  ]
}
```

## ❌ BAD Examples (DO NOT USE)

```json
// BAD: Using descriptive format
{
  "input": "num1=5, num2=10",
  "expectedOutput": "The sum is 15"
}

// BAD: Using JSON objects
{
  "input": "{\"a\": 5, \"b\": 10}",
  "expectedOutput": "{\"result\": 15}"
}

// BAD: Too verbose output
{
  "input": "5\n10",
  "expectedOutput": "The answer is 15"
}

// BAD: Wrong format
{
  "input": "5, 10",
  "expectedOutput": "15.0"
}
```

## ✅ GOOD Examples

```json
// GOOD: Simple and correct
{
  "input": "5\n10",
  "expectedOutput": "15"
}

// GOOD: Array input
{
  "input": "5\n1 2 3 4 5",
  "expectedOutput": "15"
}

// GOOD: String input
{
  "input": "hello",
  "expectedOutput": "olleh"
}
```

## Key Points

1. **Input** = What the program reads from stdin
2. **ExpectedOutput** = What the program prints to stdout
3. Use `\n` for newlines in JSON strings
4. Keep it simple - no extra formatting or descriptions
5. Test cases must be executable and valid
6. Cover edge cases (empty, negative, zero, large inputs)

