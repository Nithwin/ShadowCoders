# 🛡️ Anti-Cheating Features

## Overview

Comprehensive anti-cheating system implemented to prevent various cheating methods during exams. All features are **100% free** and use native browser APIs.

## ✅ Implemented Features

### 1. **Tab Switching Detection**
- Detects when user switches to another tab
- Detects when window loses focus
- Monitors page visibility changes
- **Action**: Warning count increases, auto-submit after 3 warnings

### 2. **Right-Click Prevention**
- Blocks context menu (right-click)
- Blocks multi-touch gestures on mobile
- **Action**: Warning on right-click attempt

### 3. **Keyboard Shortcut Blocking**
Blocks all common cheating shortcuts:
- `F12` - Developer tools
- `Ctrl+Shift+I` / `Ctrl+Shift+J` - Developer tools
- `Ctrl+Shift+C` - Element inspector
- `Ctrl+Shift+T` - Reopen closed tab
- `Ctrl+T` - New tab
- `Ctrl+W` - Close tab
- `Ctrl+N` - New window
- `Ctrl+Shift+N` - Incognito window
- `Ctrl+U` - View source
- `Ctrl+S` - Save page
- `Ctrl+P` - Print
- `Alt+Tab` - Switch windows
- `PrintScreen` - Screenshot
- `Shift+PrintScreen` - Screenshot

**Action**: Warning on blocked shortcut attempt

### 4. **Copy/Paste Prevention**
- Blocks copy outside input fields
- Blocks paste outside input fields
- Blocks cut outside input fields
- **Allows** copy/paste within exam answer fields (INPUT, TEXTAREA, contenteditable)
- **Action**: Warning on copy/paste attempt outside answer fields

### 5. **Text Selection Prevention**
- Prevents text selection on page content
- Allows selection in answer input fields only
- Blocks drag-to-select
- **Action**: Selection automatically cleared if attempted outside inputs

### 6. **Developer Tools Detection**
- Detects when developer tools are opened
- Monitors window size changes (dev tools change window dimensions)
- Checks every 500ms
- **Action**: Warning when dev tools detected

### 7. **Dual Screen/Monitor Detection**
- Detects window movement to different screen
- Monitors screen position changes
- Detects screen resolution changes
- Checks every 1 second
- **Action**: Warning on screen change detection

### 8. **Print Screen Detection**
- Blocks PrintScreen key
- Blocks Shift+PrintScreen
- Attempts to clear clipboard after print screen
- **Action**: Warning on print screen attempt

### 9. **Link Protection**
- Prevents opening links in new tabs (Ctrl+Click, Shift+Click)
- Blocks image dragging
- **Action**: Warning on blocked link/image drag

### 10. **Iframe Injection Detection**
- Monitors for iframe injection (cheating attempts)
- Automatically removes injected iframes
- Uses MutationObserver for real-time detection
- **Action**: Warning and iframe removal

### 11. **Fullscreen Enforcement**
- Requires fullscreen mode to take exam
- Detects fullscreen exit
- Auto-submit after 3 fullscreen violations
- **Action**: Warning on fullscreen exit, auto-submit after 3 warnings

## ⚠️ Warning System

- **Warning Count**: Tracks violations
- **After 3 Warnings**: Exam is automatically submitted
- **Warning Display**: Shows red warning banner at top of screen
- **Warning Duration**: 3 seconds per warning

## 🎯 What's Allowed

Students can still:
- ✅ Type normally in answer fields
- ✅ Copy/paste within answer fields (for coding questions)
- ✅ Use normal keyboard shortcuts in answer fields
- ✅ Select text in input/textarea fields
- ✅ Use editor features (for coding questions)

## 🚫 What's Blocked

Students cannot:
- ❌ Switch tabs/windows
- ❌ Right-click
- ❌ Use developer tools
- ❌ Copy question text
- ❌ Paste from outside
- ❌ Take screenshots (PrintScreen)
- ❌ Open new tabs/windows
- ❌ View page source
- ❌ Use dual monitors effectively
- ❌ Inject iframes or scripts

## 🔧 Technical Implementation

- **Hook**: `useCheatingPrevention` in `frontend/hooks/useCheatingPrevention.ts`
- **Activation**: Only active when `attempt.status === 'IN_PROGRESS'`
- **Methods**: Event listeners, MutationObserver, window monitoring
- **Performance**: Optimized with refs and cleanup functions

## 📝 Notes

1. **Browser Limitations**: Some features may vary by browser
2. **Mobile Support**: Touch events are also blocked
3. **Accessibility**: Screen readers and assistive technologies still work
4. **Free**: All features use native browser APIs, no paid services

## 🧪 Testing

To test anti-cheating features:
1. Start an exam
2. Try switching tabs → Warning
3. Try right-clicking → Warning
4. Try F12 → Warning
5. Try PrintScreen → Warning
6. After 3 warnings → Auto-submit

---

**All features are active and working!** 🎉

