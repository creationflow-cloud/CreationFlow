import { useEffect, useState } from "react";

import { App } from "./App";
import { EditorLoginPage } from "./EditorLoginPage";
import { clearStoredApiKey, getStoredApiKey, pingWithApiKey } from "./api/client.js";

export function EditorAuthGate() {
  const [hasKey, setHasKey] = useState<boolean | null>(null);

  useEffect(() => {
    const key = getStoredApiKey();
    if (!key) {
      setHasKey(false);
      return;
    }
    let cancelled = false;
    void pingWithApiKey(key).then((ok) => {
      if (cancelled) {
        return;
      }
      if (!ok) {
        clearStoredApiKey();
        setHasKey(false);
      } else {
        setHasKey(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSignOut = () => {
    clearStoredApiKey();
    setHasKey(false);
  };

  if (hasKey === null) {
    return (
      <main className="login-shell">
        <p className="login-subtitle">Checking credentials…</p>
      </main>
    );
  }

  if (!hasKey) {
    return <EditorLoginPage />;
  }

  return <App onSignOut={handleSignOut} />;
}
