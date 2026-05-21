import { useEffect, useState } from "react";

import { getProductTemplate } from "./api/product-templates.js";
import type { ProductTemplateDto } from "./api/product-templates.js";

const elementTools = ["Text", "Image", "Shape", "Variables"];

const apiUrl = import.meta.env.VITE_CREATIONFLOW_API_URL ?? "http://localhost:3000";

function getQueryParam(param: string): string | null {
  const params = new URLSearchParams(window.location.search);

  return params.get(param);
}

interface TemplateElement {
  readonly id: string;
  readonly type: string;
  readonly name?: string;
}

interface TemplateSurface {
  readonly id: string;
  readonly name: string;
  readonly elements?: readonly TemplateElement[];
}

interface TemplatePage {
  readonly id: string;
  readonly name: string;
  readonly surfaces?: readonly TemplateSurface[];
}

export function App() {
  const templateId = getQueryParam("templateId");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [template, setTemplate] = useState<ProductTemplateDto | null>(null);

  useEffect(() => {
    if (!templateId) {
      return;
    }

    let cancelled = false;

    async function loadTemplate() {
      setLoading(true);
      setError(null);

      try {
        const data = await getProductTemplate(templateId as string);

        if (!cancelled) {
          setTemplate(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load template.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTemplate();

    return () => {
      cancelled = true;
    };
  }, [templateId]);

  const pages = (template?.documentSchema?.pages as TemplatePage[] | undefined) ?? [];
  const documentName =
    (template?.documentSchema?.name as string | undefined) ?? "Untitled document";

  return (
    <main className="editor-shell">
      <header className="editor-header">
        <div>
          <p className="eyebrow">CreationFlow Editor</p>
          <h1>{template ? documentName : "Untitled document"}</h1>
        </div>
        <span className="document-pill">
          {templateId ? `Template: ${templateId.slice(0, 8)}...` : "Project placeholder"}
        </span>
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

          {templateId && (
            <div className="property-card">
              <h3>Template</h3>
              {loading && <p className="template-status">Loading template...</p>}
              {error && <p className="template-status template-error">{error}</p>}
              {template && !loading && (
                <div className="template-info">
                  <div className="info-row">
                    <span className="info-label">ID</span>
                    <span className="info-value">{template.id}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Workspace</span>
                    <span className="info-value">{template.workspaceId}</span>
                  </div>
                  {template.productId && (
                    <div className="info-row">
                      <span className="info-label">Product</span>
                      <span className="info-value">{template.productId}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {template && !loading && pages.length > 0 && (
            <div className="property-card">
              <h3>Pages & Surfaces</h3>
              <div className="page-list">
                {pages.map((page) => (
                  <div className="page-item" key={page.id}>
                    <span className="page-name">{page.name}</span>
                    {page.surfaces && page.surfaces.length > 0 && (
                      <ul className="surface-list">
                        {page.surfaces.map((surface) => (
                          <li className="surface-item" key={surface.id}>
                            <span className="surface-name">{surface.name}</span>
                            {surface.elements && surface.elements.length > 0 && (
                              <ul className="element-list">
                                {surface.elements.map((element) => (
                                  <li className="element-item" key={element.id}>
                                    <span className="element-type">{element.type}</span>
                                    {element.name && (
                                      <span className="element-name"> — {element.name}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="property-card">
            <h3>Current document</h3>
            {!template && !loading && (
              <p className="document-placeholder">No document loaded yet.</p>
            )}
            {template && !loading && (
              <p className="document-placeholder">
                Template loaded. Configuration not yet created.
              </p>
            )}
          </div>

          <button
            className="action-button"
            type="button"
            disabled={!template || loading}
            onClick={() => {
              // TODO: Create configuration from template when ready.
              // This will call createConfigurationFromTemplate() and POST /configurations.
            }}
          >
            Create configuration from template
          </button>
        </aside>
      </section>

      <footer className="surface-bar" aria-label="Product surfaces">
        {(template && !loading
          ? pages.flatMap((page) => page.surfaces ?? []).map((s) => s.name)
          : ["Front", "Back", "Left sleeve", "Right sleeve"]
        ).map((surface, index) => (
          <button className="surface-tab" key={`${surface}-${index}`} type="button">
            {surface}
          </button>
        ))}
      </footer>
    </main>
  );
}
