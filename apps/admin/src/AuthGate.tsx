import { useEffect, useState } from "react";

import { App } from "./App";
import { LoginPage } from "./LoginPage";
import { clearStoredApiKey, getStoredApiKey, pingWithApiKey } from "./api/client.js";

type AuthState = "loading" | "unauthenticated" | "authenticated";

export function AuthGate() {
  const [authState, setAuthState] = useState<AuthState>(() =>
    getStoredApiKey() ? "loading" : "unauthenticated",
  );

  useEffect(() => {
    if (authState !== "loading") {
      return;
    }
    const key = getStoredApiKey();
    if (!key) {
      queueMicrotask(() => setAuthState("unauthenticated"));
      return;
    }
    let cancelled = false;
    void pingWithApiKey(key).then((ok) => {
      if (cancelled) {
        return;
      }
      if (!ok) {
        clearStoredApiKey();
        setAuthState("unauthenticated");
      } else {
        setAuthState("authenticated");
      }
    });
    return () => {
      cancelled = true;
    };
  }, [authState]);

  const handleSignOut = () => {
    clearStoredApiKey();
    setAuthState("unauthenticated");
  };

  if (authState === "loading") {
    return (
      <main className="login-shell">
        <p className="login-subtitle">Checking credentials…</p>
      </main>
    );
  }

  if (authState === "unauthenticated") {
    return <LoginPage />;
  }

  return <App onSignOut={handleSignOut} />;
}
