# Extension Detection System

A modular, comprehensive browser extension detection system for exam proctoring.

## Architecture

The system is split into focused modules for better maintainability:

### Core Modules

- **`types.ts`** - TypeScript interfaces and type definitions
- **`constants.ts`** - Extension IDs, patterns, and detection keywords
- **`index.ts`** - Main orchestrator that combines all detection methods

### Detection Modules

- **`dom-scanner.ts`** - Scans DOM for injected elements, iframes, and shadow DOMs
- **`memory-scanner.ts`** - Recursively scans browser memory for extension IDs
- **`resource-checker.ts`** - Probes for accessible extension resources
- **`advanced-detectors.ts`** - Sophisticated checks (CSP violations, DevTools, stack traces)

## Usage

```typescript
import { detectBrowserExtensions, detectBrowserExtensionsAsync } from '@/utils/extension-detection';

// Synchronous detection (fast, immediate)
const result = detectBrowserExtensions();

// Asynchronous detection (thorough, includes resource probing)
const asyncResult = await detectBrowserExtensionsAsync();
```

## Detection Methods

### ID-Agnostic Methods (Work for ANY extension)
1. **DOM Element Scanning** - Detects injected divs, iframes, shadow DOMs
2. **CSP Violation Monitoring** - Listens for security policy violations
3. **DevTools Detection** - Checks window dimensions for open developer tools
4. **Stack Trace Analysis** - Analyzes error stacks for extension URLs
5. **Resource Timing API** - Checks network timeline for extension requests
6. **Stylesheet Injection** - Scans for extension-injected CSS
7. **chrome.management API** - Direct query for all installed extensions

### ID-Based Methods (Targets known extensions)
1. **Memory Scanning** - Finds 32-char extension IDs in browser memory
2. **Resource Probing** - Attempts to load known extension resources
3. **DOM Attribute Scanning** - Looks for extension-specific attributes

## Adding New Detection Methods

1. Create a new function in the appropriate module (or create a new module)
2. Import and call it in `index.ts` orchestrator
3. Update this README with the new method

## Why Modular?

- **Maintainability**: Each module has a single responsibility
- **Testability**: Individual methods can be tested in isolation
- **Readability**: Smaller files are easier to understand
- **Extensibility**: New detection methods can be added without touching existing code
