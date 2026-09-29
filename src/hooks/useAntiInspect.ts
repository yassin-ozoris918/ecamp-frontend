import { useEffect } from 'react';

/**
 * Anti-inspect hook.
 * - Disables right-click context menu.
 * - Blocks all common DevTools keyboard shortcuts (F12, Ctrl+Shift+I, etc.).
 * - For STUDENT role only: also runs a continuous debugger loop that freezes
 *   the browser tab whenever DevTools is open.
 *
 * ADMIN and INSTRUCTOR roles are excluded from the debugger loop so they
 * can still use DevTools for legitimate platform management work.
 */
export function useAntiInspect(role?: string) {
  useEffect(() => {
    const isStudent = !role || role === 'STUDENT';

    // 1. Disable Right Click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Disable Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        return;
      }

      // Ctrl+Shift+I / Cmd+Option+I  (Inspect)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        return;
      }

      // Ctrl+Shift+J / Cmd+Option+J  (Console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        return;
      }

      // Ctrl+Shift+C / Cmd+Shift+C   (Inspect Element picker)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        return;
      }

      // Ctrl+U / Cmd+U  (View Source)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        return;
      }

      // Ctrl+S / Cmd+S  (Save page)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        return;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // 3. Debugger Loop — Students only.
    // Triggers a JS breakpoint every second. When DevTools is open, the browser
    // halts on the debugger statement, making DevTools essentially unusable.
    // NOTE: Users can click "Deactivate breakpoints" once in DevTools, but the
    // right-click + keyboard blocks combined with the watermark tamper detection
    // already make content theft very difficult.
    let debuggerInterval: ReturnType<typeof setInterval> | undefined;
    if (isStudent) {
      debuggerInterval = setInterval(() => {
        // eslint-disable-next-line no-debugger
        debugger;
      }, 1000);
    }

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      if (debuggerInterval !== undefined) {
        clearInterval(debuggerInterval);
      }
    };
  }, [role]);
}
