import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import ErrorBoundary from "./components/ErrorBoundary.tsx";
import "./lib/auth-cache"; // dedupes supabase.auth.getUser network calls
import "./index.css";

// Suppress external script errors globally (Twitter in-app browser, extensions, etc.)
window.onerror = function (message, source, lineno, colno, error) {
  const suppressPatterns = ["CONFIG", "Can't find variable", "__NEXT", "analytics", "gtag", "fbq"];
  const messageStr = String(message);
  
  if (suppressPatterns.some((pattern) => messageStr.includes(pattern))) {
    console.warn("Suppressed external error:", messageStr);
    return true; // Prevent default error handling
  }
  return false;
};

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </HelmetProvider>
  </React.StrictMode>
);
