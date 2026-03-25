import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n/index.js';
import { App } from './App.js';

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
