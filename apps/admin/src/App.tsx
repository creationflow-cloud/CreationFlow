import { useCallback, useEffect, useState } from "react";
import { listProducts, type ProductDto } from "./api/products.js";
import { listProductTemplates, type ProductTemplateDto } from "./api/product-templates.js";
import { listConfigurations, type ConfigurationDto } from "./api/configurations.js";

type Page = "dashboard" | "products" | "templates" | "configurations";

const navigationItems: { key: Page; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "products", label: "Products" },
  { key: "templates", label: "Templates" },
  { key: "configurations", label: "Configurations" },
];

const editorBaseUrl = import.meta.env.VITE_EDITOR_URL ?? "http://localhost:5173";

export function App() {
  const [activePage, setActivePage] = useState<Page>("dashboard");
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [templates, setTemplates] = useState<ProductTemplateDto[]>([]);
  const [configurations, setConfigurations] = useState<ConfigurationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, t, c] = await Promise.all([
        listProducts(),
        listProductTemplates(),
        listConfigurations(),
      ]);
      setProducts(p);
      setTemplates(t);
      setConfigurations(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openInEditor = (id: string, param: "templateId" | "configurationId") => {
    window.open(`${editorBaseUrl}/?${param}=${id}`, "_blank");
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString();
  };

  const pageTitle: Record<Page, string> = {
    dashboard: "Workspace overview",
    products: "Products",
    templates: "Product templates",
    configurations: "Configurations",
  };

  return (
    <main className="admin-shell">
      <aside className="admin-nav" aria-label="Admin navigation">
        <div className="brand-mark">CF</div>
        <nav className="nav-list">
          {navigationItems.map((item) => (
            <button
              className={activePage === item.key ? "nav-item active" : "nav-item"}
              key={item.key}
              type="button"
              onClick={() => setActivePage(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">CreationFlow Admin</p>
            <h1>{pageTitle[activePage]}</h1>
          </div>
          <span className="environment-pill">
            {loading
              ? "Loading..."
              : `${products.length + templates.length + configurations.length} items loaded`}
          </span>
        </header>

        {loading && (
          <section className="status-banner status-loading">
            <p>Loading data from API...</p>
          </section>
        )}

        {error && (
          <section className="status-banner status-error">
            <p>Error loading data: {error}</p>
            <button type="button" className="retry-btn" onClick={loadData}>
              Retry
            </button>
          </section>
        )}

        {!loading && !error && activePage === "dashboard" && (
          <section className="dashboard-section" aria-labelledby="dashboard-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Dashboard</p>
                <h2 id="dashboard-heading">Workspace overview</h2>
              </div>
              <p>Real-time counts from your CreationFlow API.</p>
            </div>

            <div className="card-grid">
              <article className="metric-card">
                <span>Products</span>
                <strong>{products.length}</strong>
                <p>Product templates in workspace</p>
              </article>
              <article className="metric-card">
                <span>Templates</span>
                <strong>{templates.length}</strong>
                <p>Design templates available</p>
              </article>
              <article className="metric-card">
                <span>Configurations</span>
                <strong>{configurations.length}</strong>
                <p>Saved configurations</p>
              </article>
            </div>
          </section>
        )}

        {!loading && !error && activePage === "products" && (
          <section className="list-section" aria-labelledby="products-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Products</p>
                <h2 id="products-heading">All products ({products.length})</h2>
              </div>
            </div>

            {products.length === 0 ? (
              <p className="empty-state">
                No products found. Run the seed script or create products via API.
              </p>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((product) => (
                      <tr key={product.id}>
                        <td className="mono">{product.id}</td>
                        <td>{product.name}</td>
                        <td>{formatDate(product.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {!loading && !error && activePage === "templates" && (
          <section className="list-section" aria-labelledby="templates-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Templates</p>
                <h2 id="templates-heading">All templates ({templates.length})</h2>
              </div>
            </div>

            {templates.length === 0 ? (
              <p className="empty-state">
                No templates found. Run the seed script or create templates via API.
              </p>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Product</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {templates.map((template) => (
                      <tr key={template.id}>
                        <td className="mono">{template.id}</td>
                        <td>
                          {template.productId ? (
                            <span className="mono">{template.productId}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{formatDate(template.createdAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="editor-link-btn"
                            onClick={() => openInEditor(template.id, "templateId")}
                          >
                            Open in editor
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {!loading && !error && activePage === "configurations" && (
          <section className="list-section" aria-labelledby="configurations-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Configurations</p>
                <h2 id="configurations-heading">
                  All configurations ({configurations.length})
                </h2>
              </div>
            </div>

            {configurations.length === 0 ? (
              <p className="empty-state">
                No configurations found. Run the seed script or create configurations via API.
              </p>
            ) : (
              <div className="data-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Template</th>
                      <th>Product</th>
                      <th>Status</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {configurations.map((config) => (
                      <tr key={config.id}>
                        <td className="mono">{config.id}</td>
                        <td>
                          {config.templateId ? (
                            <span className="mono">{config.templateId}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          {config.productId ? (
                            <span className="mono">{config.productId}</span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <span className={`status-badge status-${config.status}`}>
                            {config.status}
                          </span>
                        </td>
                        <td>{formatDate(config.createdAt)}</td>
                        <td>
                          <button
                            type="button"
                            className="editor-link-btn"
                            onClick={() => openInEditor(config.id, "configurationId")}
                          >
                            Open in editor
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </section>
    </main>
  );
}
