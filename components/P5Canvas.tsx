
import React, { useEffect, useRef, useCallback } from 'react';

interface P5CanvasProps {
  code: string;
  showBorder?: boolean;
  onScriptError?: () => void;
}

const P5Canvas: React.FC<P5CanvasProps> = ({ code, showBorder = false, onScriptError }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const errorTimeoutRef = useRef<number | null>(null);

  const cleanupTimeout = useCallback(() => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Basic security check: ensure the message comes from our iframe
      if (event.source !== iframeRef.current?.contentWindow) return;

      if (event.data === 'p5-error') {
        console.error("p5.js runtime error detected from iframe.");
        cleanupTimeout();
        onScriptError?.();
      } else if (event.data === 'p5-success') {
        // Script initialized successfully, cancel the watchdog timer.
        cleanupTimeout();
      }
    };

    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      cleanupTimeout(); // Cleanup on unmount
    };
  }, [onScriptError, cleanupTimeout]);


  useEffect(() => {
    if (!iframeRef.current) return;
    const iframe = iframeRef.current;

    // Always clean up the previous timer when code changes.
    cleanupTimeout();
    
    if (!code) {
      iframe.srcdoc = `<html><body style="margin:0; background-color:#000;"></body></html>`;
      return;
    }

    // Set a watchdog timer. If 'p5-success' isn't received in time, assume an error.
    // This catches syntax errors or scripts that hang and never create a canvas.
    errorTimeoutRef.current = window.setTimeout(() => {
        console.warn("p5.js initialization timeout. Assuming a syntax or fatal error.");
        onScriptError?.();
    }, 2500); // 2.5 seconds should be plenty of time.

    const borderStyles = showBorder 
        ? `border: 1px solid #404040; box-sizing: border-box;` // neutral-700
        : '';
    
    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <style>
            html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background-color: #000; }
            main { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
            canvas { width: auto !important; height: auto !important; max-width: 100%; max-height: 100%; aspect-ratio: 1 / 1; ${borderStyles} }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/p5@1.9.2/lib/p5.js"><\/script>
          <script src="https://cdn.jsdelivr.net/npm/p5@1.9.2/lib/addons/p5.sound.min.js"><\/script>
        </head>
        <body>
          <script>
            // 1. Catch runtime errors
            window.onerror = function() {
              window.parent.postMessage('p5-error', '*');
              return true; // Suppress default browser error console
            };

            // 2. Detect successful canvas creation
            const observer = new MutationObserver((mutationsList) => {
              for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                  for (const node of mutation.addedNodes) {
                    // A canvas being added to the body is our success signal
                    if (node.tagName === 'CANVAS') {
                      window.parent.postMessage('p5-success', '*');
                      observer.disconnect(); // We're done
                      return;
                    }
                  }
                }
              }
            });
            observer.observe(document.body, { childList: true, subtree: true });

            // 3. Execute the user-provided code
            try {
              ${code}
            } catch (e) {
              // Re-throwing will be caught by window.onerror
              throw e;
            }
          <\/script>
        </body>
      </html>
    `;
    
    iframe.srcdoc = html;

  }, [code, showBorder, onScriptError, cleanupTimeout]);

  // The iframe is positioned absolutely to fill its parent container in GamePanel.
  // The CSS inside the iframe's srcdoc then handle the scaling of the canvas itself.
  return (
    <iframe
      ref={iframeRef}
      title="p5.js sketch"
      sandbox="allow-scripts"
      className="absolute inset-0 w-full h-full border-none bg-black"
    />
  );
};

export default P5Canvas;
