import { useState } from "react";

import { pingWithApiKey, setStoredApiKey } from "./api/client.js";

export function EditorLoginPage() {
  const [apiKey, setApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmed = apiKey.trim();
    if (!trimmed) {
      setError("Please provide an API key.");
      return;
    }

    setSubmitting(true);
    try {
      const ok = await pingWithApiKey(trimmed);
      if (!ok) {
        setError("API rejected the provided key.");
        return;
      }
      setStoredApiKey(trimmed);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="brand-mark">CF</div>
        <h1>CreationFlow Editor</h1>
        <p className="login-subtitle">
          Provide your API key to load templates and configurations. The key stays in your browser.
        </p>

        <label className="form-label" htmlFor="editor-api-key">
          API Key
        </label>
        <input
          id="editor-api-key"
          className="form-input"
          type="password"
          autoComplete="off"
          placeholder="creationflow_…"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          disabled={submitting}
        />

        {error && <p className="login-error">{error}</p>}

        <button
          type="submit"
          className="login-submit"
          disabled={submitting || apiKey.trim().length === 0}
        >
          {submitting ? "Verifying..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
