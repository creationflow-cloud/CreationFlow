import { useState } from "react";

import { pingWithApiKey, setStoredApiKey } from "./api/client.js";

export function LoginPage() {
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
        <h1>CreationFlow Admin</h1>
        <p className="login-subtitle">
          Provide your API key to access the admin workspace. The key is stored locally in your browser
          and never sent anywhere except the CreationFlow API.
        </p>

        <label className="form-label" htmlFor="api-key">
          API Key
        </label>
        <input
          id="api-key"
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

        <p className="login-hint">
          Need an API key? Set <code>CREATIONFLOW_API_KEY</code> on the API server and share the same
          value here.
        </p>
      </form>
    </main>
  );
}
