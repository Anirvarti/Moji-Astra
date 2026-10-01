// Filter out informational stdout/stderr logs from TensorFlow Lite / MediaPipe
// Emscripten redirects stdout/stderr to console.error, producing false-positive errors like:
// "INFO: Created TensorFlow Lite XNNPACK delegate for CPU."
const originalConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('INFO: Created TensorFlow Lite') ||
      args[0].includes('TensorFlow Lite XNNPACK delegate') ||
      args[0].startsWith('INFO:'))
  ) {
    console.info(...args);
    return;
  }
  originalConsoleError.apply(console, args);
};

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
