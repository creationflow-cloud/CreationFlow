import { useCallback, useEffect, useState } from "react";
import { listProducts, createProduct, type ProductDto } from "./api/products.js";
import {
  listProductTemplates,
  createProductTemplate,
  getProductTemplate,
  updateProductTemplate,
  type ProductTemplateDto,
} from "./api/product-templates.js";
import {
  listConfigurations,
  createConfiguration,
  type ConfigurationDto,
} from "./api/configurations.js";
import { listWorkspaces, type WorkspaceDto } from "./api/workspaces.js";
import { createDefaultDocument } from "./api/default-document.js";
import { importSvgSurfaces, type SvgSurfaceImportResult } from "@creationflow/importers";

type Page = "dashboard" | "products" | "templates" | "configurations";

const navigationItems: { key: Page; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "products", label: "Products" },
  { key: "templates", label: "Templates" },
  { key: "configurations", label: "Configurations" },
];

const editorBaseUrl = import.meta.env.VITE_EDITOR_URL ?? "http://localhost:5173";

interface TemplateDetailPage {
  id: string;
  name: string;
  width: number;
  height: number;
  unit: string;
  surfaces: TemplateDetailSurface[];
}

interface TemplateDetailSurface {
  id: string;
  name: string;
  kind?: string;
  width: number;
  height: number;
  unit: string;
  shape?: "rect" | "path";
  role?: "default" | "colorRegion" | "designRegion" | "overlay";
  pathData?: string;
  fillColor?: string;
  clipContent?: boolean;
  elements?: unknown[];
}

function buildDefaultPage(): TemplateDetailPage {
  return {
    id: crypto.randomUUID(),
    name: "Page 1",
    width: 500,
    height: 600,
    unit: "px",
    surfaces: [
      {
        id: crypto.randomUUID(),
        name: "Front",
        kind: "front",
        width: 500,
        height: 600,
        unit: "px",
      },
    ],
  };
}

function buildDefaultSurface(pageIndex: number): TemplateDetailSurface {
  return {
    id: crypto.randomUUID(),
    name: `Surface ${pageIndex + 1}`,
    kind: "custom",
    width: 500,
    height: 600,
    unit: "px",
  };
}

function docToPages(doc: Record<string, unknown>): TemplateDetailPage[] {
  const pages = (doc.pages as Record<string, unknown>[]) ?? [];
  return pages.map((page) => ({
    id: (page.id as string) ?? crypto.randomUUID(),
    name: (page.name as string) ?? "Untitled",
    width: (page.width as number) ?? 500,
    height: (page.height as number) ?? 600,
    unit: (page.unit as string) ?? "px",
    surfaces: ((page.surfaces as Record<string, unknown>[]) ?? []).map((s) => ({
      id: (s.id as string) ?? crypto.randomUUID(),
      name: (s.name as string) ?? "Untitled",
      kind: s.kind as string | undefined,
      width: (s.width as number) ?? 500,
      height: (s.height as number) ?? 600,
      unit: (s.unit as string) ?? "px",
      shape: s.shape as "rect" | "path" | undefined,
      role: s.role as "default" | "colorRegion" | "designRegion" | "overlay" | undefined,
      pathData: s.pathData as string | undefined,
      fillColor: s.fillColor as string | undefined,
      clipContent: s.clipContent as boolean | undefined,
    })),
  }));
}

function pagesToDoc(
  pages: TemplateDetailPage[],
  originalDoc: Record<string, unknown>,
): Record<string, unknown> {
  const originalPages = (originalDoc.pages as Record<string, unknown>[]) ?? [];
  return {
    ...originalDoc,
    pages: pages.map((page) => {
      const originalPage = originalPages.find((p) => p.id === page.id);
      const originalSurfaces = (originalPage?.surfaces as Record<string, unknown>[]) ?? [];
      return {
        id: page.id,
        name: page.name,
        width: page.width,
        height: page.height,
        unit: page.unit,
        surfaces: page.surfaces.map((s) => {
          const originalSurface = originalSurfaces.find((surface) => surface.id === s.id);
          return {
            id: s.id,
            name: s.name,
            kind: s.kind,
            width: s.width,
            height: s.height,
            unit: s.unit,
            shape: s.shape,
            role: s.role,
            pathData: s.pathData,
            fillColor: s.fillColor,
            clipContent: s.clipContent,
            elements: (originalSurface?.elements as unknown[]) ?? [],
          };
        }),
      };
    }),
  };
}

export function App({ onSignOut }: { readonly onSignOut?: () => void } = {}) {
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

  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [detailPages, setDetailPages] = useState<TemplateDetailPage[]>([]);
  const [detailDoc, setDetailDoc] = useState<Record<string, unknown>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailSaving, setDetailSaving] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailSaveStatus, setDetailSaveStatus] = useState<"idle" | "saved" | "error">("idle");

  const [svgImportInput, setSvgImportInput] = useState("");
  const [svgImportPreview, setSvgImportPreview] = useState<SvgSurfaceImportResult | null>(null);
  const [svgImportTargetPage, setSvgImportTargetPage] = useState<number | null>(null);

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
    queueMicrotask(() => {
      void loadData();
    });
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

  const openTemplateDetail = async (id: string) => {
    setEditingTemplateId(id);
    setDetailLoading(true);
    setDetailError(null);
    try {
      const tpl = await getProductTemplate(id);
      setDetailDoc(tpl.documentSchema);
      setDetailPages(docToPages(tpl.documentSchema));
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetailLoading(false);
    }
  };

  const closeTemplateDetail = () => {
    setEditingTemplateId(null);
    setDetailPages([]);
    setDetailDoc({});
    setDetailError(null);
    setDetailSaveStatus("idle");
  };

  const handleAddPage = () => {
    setDetailPages((prev) => [...prev, buildDefaultPage()]);
  };

  const handleAddSurface = (pageIndex: number) => {
    setDetailPages((prev) =>
      prev.map((page, i) =>
        i === pageIndex
          ? { ...page, surfaces: [...page.surfaces, buildDefaultSurface(page.surfaces.length)] }
          : page,
      ),
    );
  };

  const handleUpdatePage = (pageIndex: number, patch: Partial<TemplateDetailPage>) => {
    setDetailPages((prev) =>
      prev.map((page, i) => (i === pageIndex ? { ...page, ...patch } : page)),
    );
  };

  const handleUpdateSurface = (
    pageIndex: number,
    surfaceIndex: number,
    patch: Partial<TemplateDetailSurface>,
  ) => {
    setDetailPages((prev) =>
      prev.map((page, i) =>
        i === pageIndex
          ? {
              ...page,
              surfaces: page.surfaces.map((s, j) => (j === surfaceIndex ? { ...s, ...patch } : s)),
            }
          : page,
      ),
    );
  };

  const handleDeleteSurface = (pageIndex: number, surfaceIndex: number) => {
    const page = detailPages[pageIndex];
    const surface = page.surfaces[surfaceIndex];

    if (!surface) return;

    if (page.surfaces.length === 1) {
      window.alert(
        "Cannot delete the last surface on a page. Add another surface first or delete the entire page.",
      );
      return;
    }

    const elementCount = surface.elements?.length ?? 0;
    const message =
      elementCount > 0
        ? `Delete surface "${surface.name}"?\n\nThis will also delete ${elementCount} element(s) on this surface. This action cannot be undone.`
        : `Delete surface "${surface.name}"? This action cannot be undone.`;

    const confirmed = window.confirm(message);

    if (!confirmed) return;

    setDetailPages((prev) =>
      prev.map((p, i) =>
        i === pageIndex
          ? { ...p, surfaces: p.surfaces.filter((_, j) => j !== surfaceIndex) }
          : p,
      ),
    );
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplateId) return;
    setDetailSaving(true);
    setDetailError(null);
    try {
      const newDoc = pagesToDoc(detailPages, detailDoc);
      await updateProductTemplate(editingTemplateId, { documentSchema: newDoc });
      setDetailDoc(newDoc);
      setDetailSaveStatus("saved");
      await loadData();
      setTimeout(() => setDetailSaveStatus("idle"), 3000);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : String(err));
      setDetailSaveStatus("error");
    } finally {
      setDetailSaving(false);
    }
  };

  const handleAnalyzeSvg = () => {
    if (!svgImportInput.trim()) {
      setSvgImportPreview(null);
      return;
    }

    try {
      const result = importSvgSurfaces(svgImportInput);
      setSvgImportPreview(result);
    } catch (err) {
      setSvgImportPreview({
        width: 0,
        height: 0,
        surfaces: [],
        warnings: [{
          code: "unsupported_element",
          message: `SVG import failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        }],
      });
    }
  };

  const handleApplyImportedSurfaces = (pageIndex: number) => {
    if (!svgImportPreview || svgImportPreview.surfaces.length === 0) return;

    const importedSurfaces: TemplateDetailSurface[] = svgImportPreview.surfaces.map((s) => ({
      id: crypto.randomUUID(),
      name: s.name,
      kind: "custom",
      width: svgImportPreview.width,
      height: svgImportPreview.height,
      unit: s.unit,
      shape: s.shape,
      role: s.role,
      pathData: s.pathData,
      fillColor: s.fillColor,
      clipContent: s.clipContent,
    }));

    setDetailPages((prev) =>
      prev.map((page, i) =>
        i === pageIndex
          ? { ...page, surfaces: [...page.surfaces, ...importedSurfaces] }
          : page,
      ),
    );

    setSvgImportInput("");
    setSvgImportPreview(null);
    setSvgImportTargetPage(null);
  };

  const pageTitle: Record<Page, string> = {
    dashboard: "Workspace overview",
    products: "Products",
    templates: "Product templates",
    configurations: "Configurations",
  };

  const workspaceLabel = workspace ? workspace.name : "No workspace";

  if (editingTemplateId) {
    const editingTemplate = templates.find((t) => t.id === editingTemplateId);

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
              <p className="eyebrow">Template Structure</p>
              <h1>{editingTemplate?.id.slice(0, 12) ?? "Loading..."}</h1>
            </div>
            <div className="header-actions">
              <button type="button" className="back-btn" onClick={closeTemplateDetail}>
                ← Back
              </button>
              <button
                type="button"
                className={`save-btn ${detailSaveStatus}`}
                disabled={detailSaving}
                onClick={handleSaveTemplate}
              >
                {detailSaving ? "Saving..." : detailSaveStatus === "saved" ? "Saved ✓" : "Save"}
              </button>
            </div>
          </header>

          {detailLoading && (
            <section className="status-banner status-loading">
              <p>Loading template structure...</p>
            </section>
          )}

          {detailError && (
            <section className="status-banner status-error">
              <p>Error: {detailError}</p>
              <button
                type="button"
                className="retry-btn"
                onClick={() => openTemplateDetail(editingTemplateId)}
              >
                Retry
              </button>
            </section>
          )}

          {!detailLoading && !detailError && (
            <section className="template-detail-panel">
              <div className="detail-header">
                <h2>Pages & Surfaces</h2>
                <button type="button" className="add-page-btn" onClick={handleAddPage}>
                  + Add Page
                </button>
              </div>

              {detailPages.length === 0 && (
                <p className="empty-state">No pages yet. Add your first page above.</p>
              )}

              {detailPages.map((page, pageIndex) => (
                <div key={page.id} className="page-card">
                  <div className="page-card-header">
                    <input
                      className="page-name-input"
                      type="text"
                      value={page.name}
                      onChange={(e) => handleUpdatePage(pageIndex, { name: e.target.value })}
                      placeholder="Page name"
                    />
                    <div className="page-dims">
                      <label>
                        W
                        <input
                          className="dim-input"
                          type="number"
                          value={page.width}
                          onChange={(e) =>
                            handleUpdatePage(pageIndex, { width: Number(e.target.value) || 0 })
                          }
                        />
                      </label>
                      <span>×</span>
                      <label>
                        H
                        <input
                          className="dim-input"
                          type="number"
                          value={page.height}
                          onChange={(e) =>
                            handleUpdatePage(pageIndex, { height: Number(e.target.value) || 0 })
                          }
                        />
                      </label>
                      <span>{page.unit}</span>
                    </div>
                    <button
                      type="button"
                      className="add-surface-btn"
                      onClick={() => handleAddSurface(pageIndex)}
                    >
                      + Add Surface
                    </button>
                  </div>

                  {page.surfaces.length === 0 && (
                    <p className="surface-empty">No surfaces. Add one above.</p>
                  )}

                  <div className="surface-list">
                    {page.surfaces.map((surface, surfaceIndex) => (
                      <div key={surface.id} className="surface-row">
                        <input
                          className="surface-name-input"
                          type="text"
                          value={surface.name}
                          onChange={(e) =>
                            handleUpdateSurface(pageIndex, surfaceIndex, { name: e.target.value })
                          }
                          placeholder="Surface name"
                        />
                        <span className="surface-kind-badge">{surface.kind ?? "custom"}</span>
                        <div className="surface-dims">
                          <label>
                            W
                            <input
                              className="dim-input"
                              type="number"
                              value={surface.width}
                              onChange={(e) =>
                                handleUpdateSurface(pageIndex, surfaceIndex, {
                                  width: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </label>
                          <span>×</span>
                          <label>
                            H
                            <input
                              className="dim-input"
                              type="number"
                              value={surface.height}
                              onChange={(e) =>
                                handleUpdateSurface(pageIndex, surfaceIndex, {
                                  height: Number(e.target.value) || 0,
                                })
                              }
                            />
                          </label>
                          <span>{surface.unit}</span>
                        </div>
                        <select
                          className="surface-shape-select"
                          value={surface.shape ?? "rect"}
                          onChange={(e) =>
                            handleUpdateSurface(pageIndex, surfaceIndex, {
                              shape: e.target.value as "rect" | "path",
                            })
                          }
                        >
                          <option value="rect">Rect</option>
                          <option value="path">Path</option>
                        </select>
                        <select
                          className="surface-role-select"
                          value={surface.role ?? "default"}
                          onChange={(e) =>
                            handleUpdateSurface(pageIndex, surfaceIndex, {
                              role: e.target.value as "default" | "colorRegion" | "designRegion" | "overlay",
                            })
                          }
                        >
                          <option value="default">Default</option>
                          <option value="colorRegion">Color Region</option>
                          <option value="designRegion">Design Region</option>
                          <option value="overlay">Overlay</option>
                        </select>
                        {surface.shape === "path" && (
                          <textarea
                            className="surface-path-textarea"
                            value={surface.pathData ?? ""}
                            onChange={(e) =>
                              handleUpdateSurface(pageIndex, surfaceIndex, {
                                pathData: e.target.value,
                              })
                            }
                            placeholder="SVG path data (e.g., M10,10 L50,10 L50,50 Z)"
                            rows={2}
                          />
                        )}
                        {(surface.role === "colorRegion" || surface.role === "overlay") && (
                          <input
                            className="surface-fill-input"
                            type="text"
                            value={surface.fillColor ?? ""}
                            onChange={(e) =>
                              handleUpdateSurface(pageIndex, surfaceIndex, {
                                fillColor: e.target.value,
                              })
                            }
                            placeholder="Fill color (#RRGGBB)"
                          />
                        )}
                        <label className="surface-clip-label">
                          <input
                            type="checkbox"
                            checked={surface.clipContent ?? false}
                            onChange={(e) =>
                              handleUpdateSurface(pageIndex, surfaceIndex, {
                                clipContent: e.target.checked,
                              })
                            }
                          />
                          Clip Content
                        </label>
                        <button
                          type="button"
                          className="delete-surface-btn"
                          onClick={() => handleDeleteSurface(pageIndex, surfaceIndex)}
                          title="Delete surface"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <section className="svg-import-panel">
                <h3>SVG Import</h3>
                <p className="import-hint">Paste an SVG with named paths to create surfaces automatically.</p>
                <textarea
                  className="svg-import-textarea"
                  placeholder={`<svg viewBox="0 0 500 600">\n  <path id="design-area" d="M100 100 L400 100 L400 500 L100 500 Z"/>\n</svg>`}
                  value={svgImportInput}
                  onChange={(e) => setSvgImportInput(e.target.value)}
                  rows={8}
                />
                <div className="import-actions">
                  <button type="button" className="analyze-btn" onClick={handleAnalyzeSvg}>
                    Analyze SVG
                  </button>
                  {svgImportTargetPage !== null && svgImportPreview && svgImportPreview.surfaces.length > 0 && (
                    <button
                      type="button"
                      className="apply-btn"
                      onClick={() => handleApplyImportedSurfaces(svgImportTargetPage)}
                    >
                      Apply {svgImportPreview.surfaces.length} Surface{svgImportPreview.surfaces.length !== 1 ? "s" : ""} to Page {svgImportTargetPage + 1}
                    </button>
                  )}
                </div>

                {svgImportPreview && (
                  <div className="import-preview">
                    <h4>Detected Surfaces: {svgImportPreview.surfaces.length}</h4>
                    {svgImportPreview.surfaces.length > 0 && (
                      <select
                        className="import-target-select"
                        value={svgImportTargetPage ?? ""}
                        onChange={(e) => setSvgImportTargetPage(e.target.value ? Number(e.target.value) : null)}
                      >
                        <option value="">Select target page...</option>
                        {detailPages.map((page, i) => (
                          <option key={page.id} value={i}>
                            Page {i + 1}: {page.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <ul className="surface-preview-list">
                      {svgImportPreview.surfaces.map((s, i) => (
                        <li key={i} className={`surface-preview-item role-${s.role}`}>
                          <span className="surface-name">{s.name}</span>
                          <span className="surface-role-badge">{s.role}</span>
                          <span className="surface-shape-badge">{s.shape}</span>
                          {s.clipContent && <span className="clip-badge">clip</span>}
                        </li>
                      ))}
                    </ul>
                    {svgImportPreview.warnings.length > 0 && (
                      <div className="import-warnings">
                        <h5>Warnings ({svgImportPreview.warnings.length})</h5>
                        <ul>
                          {svgImportPreview.warnings.map((w, i) => (
                            <li key={i} className="warning-item">
                              <code>{w.code}</code>: {w.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {svgImportPreview.viewBox && (
                      <p className="viewbox-info">
                        ViewBox: {svgImportPreview.viewBox.x} {svgImportPreview.viewBox.y} {svgImportPreview.viewBox.width}×{svgImportPreview.viewBox.height}
                      </p>
                    )}
                  </div>
                )}
              </section>
            </section>
          )}
        </section>
      </main>
    );
  }

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
          <div className="header-actions">
            <span className="environment-pill">{loading ? "Loading..." : `${workspaceLabel}`}</span>
            {onSignOut && (
              <button type="button" className="signout-btn" onClick={onSignOut}>
                Sign out
              </button>
            )}
          </div>
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
              <p className="empty-state">No products found. Create your first product above.</p>
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
              <p className="empty-state">No templates found. Create your first template above.</p>
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
                        <td className="actions-cell">
                          <button
                            type="button"
                            className="edit-structure-btn"
                            onClick={() => openTemplateDetail(template.id)}
                          >
                            Edit structure
                          </button>
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
                <h2 id="configurations-heading">All configurations ({configurations.length})</h2>
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
