const navigationItems = [
  "Dashboard",
  "Products",
  "Templates",
  "Configurations",
  "Render Jobs",
  "Settings",
];

const dashboardCards = [
  { label: "Products", value: "0", detail: "Product templates placeholder" },
  { label: "Configurations", value: "0", detail: "Saved configurations placeholder" },
  { label: "Render Jobs", value: "0", detail: "Pending render jobs placeholder" },
  { label: "Orders this month", value: "0", detail: "Production intake placeholder" },
];

const apiUrl = import.meta.env.VITE_CREATIONFLOW_API_URL ?? "http://localhost:3000";

const settingsItems = [
  { label: "API URL", value: apiUrl },
  { label: "API client", value: "prepared" },
  { label: "Storage", value: "Storage placeholder" },
  { label: "License status placeholder", value: "No license check configured" },
];

export function App() {
  return (
    <main className="admin-shell">
      <aside className="admin-nav" aria-label="Admin navigation">
        <div className="brand-mark">CF</div>
        <nav className="nav-list">
          {navigationItems.map((item) => (
            <button
              className={item === "Dashboard" ? "nav-item active" : "nav-item"}
              key={item}
              type="button"
            >
              {item}
            </button>
          ))}
        </nav>
      </aside>

      <section className="admin-main">
        <header className="admin-header">
          <div>
            <p className="eyebrow">CreationFlow Admin</p>
            <h1>Operations dashboard</h1>
          </div>
          <span className="environment-pill">API client prepared</span>
        </header>

        <section className="dashboard-section" aria-labelledby="dashboard-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Dashboard</p>
              <h2 id="dashboard-heading">Workspace overview</h2>
            </div>
            <p>
              Static foundation for product templates, configurations, render jobs, and production
              data.
            </p>
          </div>

          <div className="card-grid">
            {dashboardCards.map((card) => (
              <article className="metric-card" key={card.label}>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <p>{card.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="settings-panel" aria-labelledby="settings-heading">
          <div>
            <p className="eyebrow">Settings</p>
            <h2 id="settings-heading">Settings</h2>
          </div>
          <div className="settings-list">
            {settingsItems.map((item) => (
              <div className="settings-row" key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
