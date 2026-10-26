import { Boxes, History, LayoutDashboard, PackageSearch, ShieldCheck } from "lucide-react";

export function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Boxes size={20} /></span><span>StockLedger</span></div>
        <div className="nav-label">WORKSPACE</div>
        <a className="nav-item active"><LayoutDashboard size={18} /> Overview</a>
        <a className="nav-item"><PackageSearch size={18} /> Products</a>
        <a className="nav-item"><History size={18} /> Movement ledger</a>
        <div className="sidebar-footer"><ShieldCheck size={16} /> Inventory you can trust</div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div><div className="eyebrow">SHOP OPERATIONS</div><h1>Inventory overview</h1></div>
          <span className="role-pill">Starter UI</span>
        </header>
        <section className="welcome">
          <div><p className="eyebrow light">LEDGER-FIRST INVENTORY</p><h2>Every movement tells a story.</h2><p>Stock balances will be calculated from the movement history, never typed in manually.</p></div>
          <div className="welcome-icon"><Boxes size={34}/></div>
        </section>
        <section className="metric-grid">
          <article className="metric"><span className="metric-label">Total products</span><strong>—</strong><small>Connect the API to load data</small></article>
          <article className="metric"><span className="metric-label">Units in stock</span><strong>—</strong><small>Calculated from movements</small></article>
          <article className="metric"><span className="metric-label">Low-stock items</span><strong>—</strong><small>Based on each product threshold</small></article>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><h3>Recent stock movements</h3><p>Purchases, sales, returns and adjustments</p></div><span className="coming-soon">API integration next</span></div>
          <div className="empty-state"><div className="empty-icon"><History size={24}/></div><strong>Your ledger starts here</strong><p>Once the API and seed data are connected, recent stock movements will appear here.</p></div>
        </section>
        <p className="footer-note">Built around an auditable movement ledger · Responsive starter</p>
      </main>
    </div>
  );
}
