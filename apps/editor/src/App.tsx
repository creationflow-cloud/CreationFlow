const elementTools = ["Text", "Image", "Shape", "Variables"];
const surfaces = ["Front", "Back", "Left sleeve", "Right sleeve"];

const apiUrl = import.meta.env.VITE_CREATIONFLOW_API_URL ?? "http://localhost:3000";

export function App() {
  return (
    <main className="editor-shell">
      <header className="editor-header">
        <div>
          <p className="eyebrow">CreationFlow Editor</p>
          <h1>Untitled document</h1>
        </div>
        <span className="document-pill">Project placeholder</span>
      </header>

      <section className="editor-workspace" aria-label="Editor workspace">
        <aside className="sidebar left-sidebar" aria-label="Elements sidebar">
          <h2>Elements</h2>
          <nav className="tool-list" aria-label="Element tools">
            {elementTools.map((tool) => (
              <button className="tool-button" key={tool} type="button">
                {tool}
              </button>
            ))}
          </nav>
        </aside>

        <section className="canvas-stage" aria-label="Canvas area">
          <div className="canvas-placeholder">
            <h2>Canvas Area</h2>
            <p>2D editor surface placeholder</p>
          </div>
        </section>

        <aside className="sidebar right-sidebar" aria-label="Properties sidebar">
          <h2>Properties</h2>
          <div className="property-card">Selected element placeholder</div>

          <div className="property-card api-info-card">
            <h3>API Connection</h3>
            <div className="info-row">
              <span className="info-label">API URL</span>
              <span className="info-value">{apiUrl}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Configuration ID</span>
              <span className="info-value info-placeholder">not set</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status</span>
              <span className="info-value info-status">not loaded</span>
            </div>
          </div>

          <div className="property-card">
            <h3>Current document</h3>
            <p className="document-placeholder">No document loaded yet.</p>
          </div>
        </aside>
      </section>

      <footer className="surface-bar" aria-label="Product surfaces">
        {surfaces.map((surface) => (
          <button className="surface-tab" key={surface} type="button">
            {surface}
          </button>
        ))}
      </footer>
    </main>
  );
}
