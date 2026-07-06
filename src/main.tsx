import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Automatically detect the correct backend origin (local vs Cloud Run)
const getBackendBase = (): string => {
  const hostname = window.location.hostname;
  
  // If we are running on local environment or directly on the Cloud Run backend, keep URLs relative
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.includes("run.app")
  ) {
    return "";
  }
  
  // Otherwise (e.g. deployed on Vercel), route requests to the secure Cloud Run Shared App URL
  return "https://ais-pre-asobmyb7elwlcvjme5zkp4-571295732780.europe-west2.run.app";
};

const backendBase = getBackendBase();

if (backendBase) {
  // Monkey patch global fetch to automatically forward relative API requests
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === "string" && input.startsWith("/api/")) {
      input = `${backendBase}${input}`;
    }
    return originalFetch(input, init);
  };

  // Monkey patch global WebSocket to automatically route connections to the active backend
  const OriginalWebSocket = window.WebSocket;
  // @ts-ignore
  window.WebSocket = function (url: string | URL, protocols?: string | string[]) {
    let finalUrl = url;
    if (typeof url === "string" && url.includes("/ws")) {
      const secure = backendBase.startsWith("https:");
      const wsHost = backendBase.replace(/^https?:\/\//, "");
      finalUrl = `${secure ? "wss:" : "ws:"}//${wsHost}/ws`;
    }
    return new OriginalWebSocket(finalUrl, protocols);
  };
  window.WebSocket.prototype = OriginalWebSocket.prototype;
  // @ts-ignore
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  // @ts-ignore
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  // @ts-ignore
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  // @ts-ignore
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
