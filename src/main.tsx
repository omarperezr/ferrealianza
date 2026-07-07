import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

// After a new deploy, lazy-loaded chunks from the old build may no longer exist
// on the server; the failed dynamic import would otherwise leave the app broken.
// Reload once to pick up the new build (guard against a reload loop).
window.addEventListener("vite:preloadError", (event) => {
  const KEY = "chunk-reload-at";
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last > 10_000) {
    sessionStorage.setItem(KEY, String(Date.now()));
    event.preventDefault();
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(<App />);

// Register the service worker (production only) for offline support.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore registration errors */
    });
  });
}
