import { createRoot } from "react-dom/client";
import { BrandBoardApp } from "./components/BrandBoardApp";
import "./styles/tokens.css";
import "./index.css";

// PWA service worker registration with iframe / preview guard.
// In a preview iframe, service workers cause stale-content issues, so we
// unregister any existing SWs there. In production they activate normally.
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com") ||
  window.location.hostname.includes("lovable.app");

if (isPreviewHost || isInIframe) {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  }
} else if ("serviceWorker" in navigator && import.meta.env.PROD) {
  // Dynamic import so the vite-plugin-pwa virtual module never loads in preview.
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      registerSW({ immediate: true });
    })
    .catch(() => {
      /* noop */
    });
}

// Dev-only verification seed: `?seed=<name>` loads /public/seed-<name>.json into
// the draft key so a full multi-page kit can be inspected without hand-entry.
// Dead code in production (DEV-gated) and never bundled into a release.
if (import.meta.env.DEV) {
  const seed = new URLSearchParams(window.location.search).get("seed");
  if (seed) {
    // Synchronous XHR keeps this before the first render with no async plumbing.
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", `${import.meta.env.BASE_URL}${seed}`, false);
      xhr.send(null);
      if (xhr.status === 200) localStorage.setItem("brand-board-draft", xhr.responseText);
    } catch {
      /* ignore seed failures */
    }
  }
}

createRoot(document.getElementById("root")!).render(<BrandBoardApp />);
