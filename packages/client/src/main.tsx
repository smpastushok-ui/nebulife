import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n/index.js';
import { App } from './App.js';
import { getDeviceTier } from './utils/device-tier.js';
import { LandingPage } from './ui/landing/LandingPage.js';

// ---------------------------------------------------------------------------
// Perf-tier root attribute + global CSS kill-switch
// ---------------------------------------------------------------------------
// Tagging <html data-perf-tier="low|mid|high|ultra"> lets us strip GPU-heavy
// pulsing animations (box-shadow glow, filter, backdrop-filter, full-screen
// blink/flash) without touching every component. Mobile WebViews paint those
// animations as layer-composite changes on every frame, which coincides with
// scene transitions and surfaces as the "white flash" testers reported.
//
// Rule of thumb:
//   - transform / opacity animations stay (GPU-composited cheaply)
//   - box-shadow / filter / backdrop-filter / background animations die
//
// We also hard-force body background to deep-space so any momentarily-
// unmounted React subtree can never flash the default white canvas.
(() => {
  const tier = getDeviceTier();
  document.documentElement.dataset.perfTier = tier;

  // Only inject kill-switch for low/mid tiers. High/ultra keep all effects.
  if (tier !== 'low' && tier !== 'mid') return;

  const css = `
    html, body {
      background: #020510 !important;
      color-scheme: dark;
    }
    /* Nuke React inline-style animations whose keyframes are known to
       animate box-shadow / filter / background-color (= GPU heavy).
       Match by substring of the animation name in the inline style attr. */
    html[data-perf-tier="low"] [style*="Pulse"],
    html[data-perf-tier="mid"] [style*="Pulse"],
    html[data-perf-tier="low"] [style*="pulse"],
    html[data-perf-tier="mid"] [style*="pulse"],
    html[data-perf-tier="low"] [style*="Flash"],
    html[data-perf-tier="mid"] [style*="Flash"],
    html[data-perf-tier="low"] [style*="flash"],
    html[data-perf-tier="mid"] [style*="flash"],
    html[data-perf-tier="low"] [style*="Blink"],
    html[data-perf-tier="mid"] [style*="Blink"],
    html[data-perf-tier="low"] [style*="blink"],
    html[data-perf-tier="mid"] [style*="blink"],
    html[data-perf-tier="low"] [style*="Glow"],
    html[data-perf-tier="mid"] [style*="Glow"],
    html[data-perf-tier="low"] [style*="neon"],
    html[data-perf-tier="mid"] [style*="neon"] {
      animation: none !important;
    }
    /* backdrop-filter blur is the single biggest perf cost for CommandBar
       (blur(12px) over the bottom 48 px of the viewport). The WebView
       re-rasterizes the blurred region on every React re-render — which
       is the main reason the terminal button "відкривається з ривком"
       on mid/low Androids. Disable for both tiers; the bar still reads
       because background is rgba(5,10,20,0.92) = 92 % opaque. */
    html[data-perf-tier="low"] *,
    html[data-perf-tier="mid"] * {
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
    }
    /* Slim down transition: "all" on low-end causes every property change
       (opacity, color, transform) to be tracked by the compositor. On
       weak WebViews this piles up during tab-open animations. */
    html[data-perf-tier="low"] *,
    html[data-perf-tier="mid"] * {
      transition-duration: 120ms !important;
    }
  `;
  const style = document.createElement('style');
  style.dataset.perfOverrides = 'true';
  style.textContent = css;
  document.head.appendChild(style);
})();

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

function shouldRenderGame(pathname: string, search: string): boolean {
  // Capacitor native shell (Android/iOS AAB/IPA) loads the app from
  // capacitor://localhost — pathname there is '/' and there are no query
  // params. The landing page is web-only; native users must always see the
  // game directly. Detect by Capacitor global injected by the runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cap = (window as any).Capacitor;
  if (cap && (cap.isNativePlatform?.() || cap.platform === 'android' || cap.platform === 'ios')) {
    return true;
  }
  if (pathname === '/play' || pathname.startsWith('/play/')) return true;
  const params = new URLSearchParams(search);
  return params.get('play') === '1';
}

function RootRouter() {
  const [routeKey, setRouteKey] = React.useState(() => `${window.location.pathname}${window.location.search}`);

  React.useEffect(() => {
    const onPopstate = () => setRouteKey(`${window.location.pathname}${window.location.search}`);
    window.addEventListener('popstate', onPopstate);
    return () => window.removeEventListener('popstate', onPopstate);
  }, []);

  if (shouldRenderGame(window.location.pathname, window.location.search)) {
    return <App key={`app:${routeKey}`} />;
  }
  return <LandingPage />;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <RootRouter />
  </ErrorBoundary>,
);
