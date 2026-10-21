import SessionStatus from "../components/session-status";

const cards = [
  { title: "My Communities", value: "Live", detail: "Your approved memberships" },
  { title: "Community Administration", value: "Manage", detail: "Members, roles and access" },
  { title: "Member Network", value: "Explore", detail: "LookAtMe and Marché" },
];

export default function DashboardPage() {
  return (
    <main className="shell">
      <nav className="nav">
        <a className="brand" href="/dashboard"><span className="logo">C</span> CommunityHub</a>
        <div className="navactions"><span className="pill">Member workspace</span></div>
      </nav>
      <section className="sections">
        <div className="eyebrow">Your digital community space</div>
        <h1 style={{ fontSize: 46, letterSpacing: -2 }}>Good to see you.</h1>
        <p style={{ color: "#607166", maxWidth: 680, lineHeight: 1.6 }}>
          Your communities, member services and global features in one place.
        </p>
        <SessionStatus />
        <div className="cards" style={{ marginTop: 24 }}>
          {cards.map((card) => (
            <article className="card" key={card.title}>
              <div className="muted">{card.title}</div>
              <h2 style={{ fontSize: 25, margin: "12px 0 8px" }}>{card.value}</h2>
              <div style={{ color: "#607166", fontSize: 14 }}>{card.detail}</div>
            </article>
          ))}
        </div>
        <div className="cards" style={{ marginTop: 20 }}>
          <article className="card">
            <div className="card-icon">⌂</div>
            <h3>Community administration</h3>
            <p>Review member records, search by name or email, and manage community-specific roles and membership status.</p>
            <a className="btn primary" href="/admin/members" style={{ display: "inline-block" }}>Manage members →</a>
          </article>
          <article className="card">
            <div className="card-icon">✦</div>
            <h3>LookAtMe</h3>
            <p>A network for verified members to share updates and connect across participating communities.</p>
            <span className="pill">Planned module</span>
          </article>
          <article className="card">
            <div className="card-icon">▣</div>
            <h3>Marché</h3>
            <p>A cross-community marketplace for member shops, products and services.</p>
            <span className="pill">Planned module</span>
          </article>
        </div>
      </section>
    </main>
  );
}
