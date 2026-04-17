import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n/index.js';
import { App } from './App.js';

// ---------------------------------------------------------------------------
// Global error logging — surface unhandled promise rejections & errors with
// proper stringification (fixes "[object Object]" console spam on Android).
// ---------------------------------------------------------------------------
function formatErr(e: unknown): string {
  if (e == null) return 'null';
  if (e instanceof Error) return `${e.name}: ${e.message}\n${e.stack ?? ''}`;
  if (typeof e === 'string') return e;
  try { return JSON.stringify(e, Object.getOwnPropertyNames(e as object)); }
  catch { return String(e); }
}

window.addEventListener('unhandledrejection', (event) => {
  // eslint-disable-next-line no-console
  console.error('[unhandledrejection]', formatErr(event.reason));
});

window.addEventListener('error', (event) => {
  // eslint-disable-next-line no-console
  console.error('[window.error]', event.message, formatErr(event.error));
});

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { error: `${error.message}\n${error.stack}` };
  }
  render() {
    if (this.state.error) {
      return <pre style={{ color: '#ff4444', padding: 20, fontFamily: 'monospace', fontSize: 12, whiteSpace: 'pre-wrap' }}>{this.state.error}</pre>;
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
