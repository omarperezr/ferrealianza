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

// Last-resort net for errors the React ErrorBoundary can't catch (crash before
// mount, uncaught errors/promise rejections that leave the page blank): if the
// page ends up empty, show a visible error screen instead of a blank page.
function showFatalError(message: string) {
  const root = document.getElementById("root");
  // Only take over if the app is effectively blank; otherwise the UI (and the
  // ErrorBoundary) is still alive and this would destroy working state.
  if (!root || root.childElementCount > 0) return;
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8fafc;padding:24px;font-family:system-ui,sans-serif">
      <div style="max-width:420px;width:100%;text-align:center;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px;box-shadow:0 1px 2px rgba(0,0,0,.05)">
        <p style="font-size:36px;margin:0 0 12px">⚠️</p>
        <h1 style="font-size:18px;font-weight:700;color:#1e293b;margin:0 0 8px">Algo salió mal</h1>
        <p style="font-size:14px;color:#64748b;margin:0 0 16px">Ocurrió un error inesperado. Tus datos guardados no se pierden — recarga la página para continuar.</p>
        <button onclick="location.reload()" style="width:100%;border:0;border-radius:8px;background:#f59e0b;color:#0f172a;font-weight:600;padding:10px;font-size:14px;cursor:pointer">Recargar la página</button>
        <p style="font-size:11px;color:#94a3b8;margin:16px 0 0;word-break:break-word">${message.replace(/[<>&]/g, "")}</p>
      </div>
    </div>`;
}

window.addEventListener("error", (e) => {
  showFatalError(e.message || "Error desconocido");
});
window.addEventListener("unhandledrejection", (e) => {
  showFatalError(e.reason?.message || String(e.reason || "Error desconocido"));
});

try {
  createRoot(document.getElementById("root")!).render(<App />);
} catch (error: any) {
  showFatalError(error?.message || "No se pudo iniciar la aplicación");
}

// Register the service worker (production only) for offline support.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* ignore registration errors */
    });
  });
}
