import { useCallback, useEffect, useState } from "react";
import { listProducts, createProduct, type ProductDto } from "./api/products.js";
import {
  listProductTemplates,
  createProductTemplate,
  type ProductTemplateDto,
} from "./api/product-templates.js";
import {
  listConfigurations,
  createConfiguration,
  type ConfigurationDto,
} from "./api/configurations.js";
import { listWorkspaces, type WorkspaceDto } from "./api/workspaces.js";
import { createDefaultDocument } from "./api/default-document.js";

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
  const [workspace, setWorkspace] = useState<WorkspaceDto | null>(null);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [templates, setTemplates] = useState<ProductTemplateDto[]>([]);
  const [configurations, setConfigurations] = useState<ConfigurationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateProduct, setShowCreateProduct] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showCreateConfig, setShowCreateConfig] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [creatingConfig, setCreatingConfig] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [productName, setProductName] = useState("");
  const [templateProductId, setTemplateProductId] = useState("");
  const [configTemplateId, setConfigTemplateId] = useState("");
  const [configProductId, setConfigProductId] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const wsList = await listWorkspaces();
      const ws = wsList[0] ?? null;
      setWorkspace(ws);

      if (ws) {
        const [p, t, c] = await Promise.all([
          listProducts(ws.id),
          listProductTemplates(ws.id),
          listConfigurations(ws.id),
        ]);
        setProducts(p);
        setTemplates(t);
        setConfigurations(c);
      } else {
        setProducts([]);
        setTemplates([]);
        setConfigurations([]);
      }
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

  const handleCreateProduct = async () => {
    if (!workspace || !productName.trim()) return;
    setCreatingProduct(true);
    setCreateError(null);
    try {
      await createProduct({ workspaceId: workspace.id, name: productName.trim() });
      setProductName("");
      setShowCreateProduct(false);
      await loadData();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!workspace) return;
    setCreatingTemplate(true);
    setCreateError(null);
    try {
      const doc = createDefaultDocument({ workspaceId: workspace.id });
      await createProductTemplate({
        workspaceId: workspace.id,
        productId: templateProductId || undefined,
        documentSchema: doc,
      });
      setTemplateProductId("");
      setShowCreateTemplate(false);
      await loadData();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingTemplate(false);
    }
  };

  const handleCreateConfig = async () => {
    if (!workspace) return;
    const tpl = templates.find((t) => t.id === configTemplateId);
    if (!tpl) return;
    setCreatingConfig(true);
    setCreateError(null);
    try {
      await createConfiguration({
        workspaceId: workspace.id,
        templateId: tpl.id,
        productId: configProductId || tpl.productId || undefined,
        document: tpl.documentSchema,
        status: "draft",
      });
      setConfigTemplateId("");
      setConfigProductId("");
      setShowCreateConfig(false);
      await loadData();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingConfig(false);
    }
  };

  const pageTitle: Record<Page, string> = {
    dashboard: "Workspace overview",
    products: "Products",
    templates: "Product templates",
    configurations: "Configurations",
  };

  const workspaceLabel = workspace ? workspace.name : "No workspace";

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
            {loading ? "Loading..." : `${workspaceLabel}`}
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

        {!loading && !workspace && !error && (
          <section className="status-banner status-error">
            <p>No workspace found. Please run the seed script first.</p>
          </section>
        )}

        {createError && (
          <section className="status-banner status-error">
            <p>Create error: {createError}</p>
            <button type="button" className="retry-btn" onClick={() => setCreateError(null)}>
              Dismiss
            </button>
          </section>
        )}

        {!loading && !error && workspace && activePage === "dashboard" && (
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

        {!loading && !error && workspace && activePage === "products" && (
          <section className="list-section" aria-labelledby="products-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Products</p>
                <h2 id="products-heading">All products ({products.length})</h2>
              </div>
              <button
                type="button"
                className="create-toggle-btn"
                onClick={() => {
                  setShowCreateProduct(!showCreateProduct);
                  setCreateError(null);
                }}
              >
                {showCreateProduct ? "Cancel" : "New Product"}
              </button>
            </div>

            {showCreateProduct && (
              <div className="create-form">
                <label className="form-label" htmlFor="product-name">
                  Name
                </label>
                <input
                  id="product-name"
                  className="form-input"
                  type="text"
                  placeholder="e.g. Demo T-Shirt"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                />
                <button
                  type="button"
                  className="create-submit-btn"
                  disabled={creatingProduct || !productName.trim()}
                  onClick={handleCreateProduct}
                >
                  {creatingProduct ? "Creating..." : "Create"}
                </button>
              </div>
            )}

            {products.length === 0 && !showCreateProduct ? (
              <p className="empty-state">
                No products found. Create your first product above.
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

        {!loading && !error && workspace && activePage === "templates" && (
          <section className="list-section" aria-labelledby="templates-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Templates</p>
                <h2 id="templates-heading">All templates ({templates.length})</h2>
              </div>
              <button
                type="button"
                className="create-toggle-btn"
                onClick={() => {
                  setShowCreateTemplate(!showCreateTemplate);
                  setCreateError(null);
                }}
              >
                {showCreateTemplate ? "Cancel" : "New Template"}
              </button>
            </div>

            {showCreateTemplate && (
              <div className="create-form">
                <label className="form-label" htmlFor="template-product">
                  Product (optional)
                </label>
                <select
                  id="template-product"
                  className="form-select"
                  value={templateProductId}
                  onChange={(e) => setTemplateProductId(e.target.value)}
                >
                  <option value="">— No product —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="create-submit-btn"
                  disabled={creatingTemplate}
                  onClick={handleCreateTemplate}
                >
                  {creatingTemplate ? "Creating..." : "Create"}
                </button>
              </div>
            )}

            {templates.length === 0 && !showCreateTemplate ? (
              <p className="empty-state">
                No templates found. Create your first template above.
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

        {!loading && !error && workspace && activePage === "configurations" && (
          <section className="list-section" aria-labelledby="configurations-heading">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Configurations</p>
                <h2 id="configurations-heading">
                  All configurations ({configurations.length})
                </h2>
              </div>
              <button
                type="button"
                className="create-toggle-btn"
                onClick={() => {
                  setShowCreateConfig(!showCreateConfig);
                  setCreateError(null);
                }}
              >
                {showCreateConfig ? "Cancel" : "New Configuration"}
              </button>
            </div>

            {showCreateConfig && (
              <div className="create-form">
                <label className="form-label" htmlFor="config-template">
                  Template
                </label>
                <select
                  id="config-template"
                  className="form-select"
                  value={configTemplateId}
                  onChange={(e) => {
                    setConfigTemplateId(e.target.value);
                    const tpl = templates.find((t) => t.id === e.target.value);
                    if (tpl?.productId) {
                      setConfigProductId(tpl.productId);
                    } else {
                      setConfigProductId("");
                    }
                  }}
                >
                  <option value="">— Select template —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id}
                    </option>
                  ))}
                </select>
                <label className="form-label" htmlFor="config-product">
                  Product (optional)
                </label>
                <select
                  id="config-product"
                  className="form-select"
                  value={configProductId}
                  onChange={(e) => setConfigProductId(e.target.value)}
                >
                  <option value="">— No product —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="create-submit-btn"
                  disabled={creatingConfig || !configTemplateId}
                  onClick={handleCreateConfig}
                >
                  {creatingConfig ? "Creating..." : "Create"}
                </button>
              </div>
            )}

            {configurations.length === 0 && !showCreateConfig ? (
              <p className="empty-state">
                No configurations found. Create your first configuration above.
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
