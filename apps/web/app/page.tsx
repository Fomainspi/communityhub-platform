const modules = [
  { icon: "⌂", title: "Your Community", text: "A private digital home for members, leaders, events, announcements, documents and community services." },
  { icon: "✦", title: "LookAtMe", text: "A private social network for verified members to publish, discuss, react, follow and discover people across communities." },
  { icon: "▣", title: "Marché", text: "A community marketplace where members can create shops, offer products or services and discover sellers across the network." },
];

export default function Home() {
  return (
    <main className="shell">
      <nav className="nav">
        <div className="brand"><span className="logo">C</span> CommunityHub</div>
        <div className="navlinks"><a href="#community">Community</a><a href="#lookatme">LookAtMe</a><a href="#marche">Marché</a></div>
        <div className="navactions"><button className="btn secondary">Sign in</button><button className="btn primary">Get started</button></div>
      </nav>

      <section className="hero">
        <div>
          <div className="eyebrow">The digital home for communities</div>
          <h1>Connect.<br />Belong.<br /><span style={{color:"var(--green-700)"}}>Build together.</span></h1>
          <p>CommunityHub brings community management, private social networking and member-to-member commerce into one secure platform.</p>
          <div className="hero-actions"><button className="btn primary">Explore CommunityHub →</button><button className="btn secondary">View the ecosystem</button></div>
        </div>
        <div className="preview">
          <div className="preview-top"><strong>Member Home</strong><span className="pill">● Connected</span></div>
          <div className="post">
            <div className="post-head"><div className="avatar">WF</div><div><div className="post-title">William Foma</div><div className="muted">ACPInc · 12 min ago</div></div></div>
            <p>Welcome to CommunityHub — one place for our community, our people and the opportunities we create together.</p>
            <div className="reactions"><span className="reaction">❤️ 24</span><span className="reaction">💬 8</span><span className="reaction">🤝 12</span><span className="reaction">✨ 5</span></div>
          </div>
        </div>
      </section>

      <section className="sections" id="community">
        <div className="section-title"><div className="eyebrow">One ecosystem</div><h2>Everything your community needs.</h2><p>Built as a multi-community platform from day one. Each organization gets its own secure space while members can participate in global features.</p></div>
        <div className="cards">
          {modules.map((module) => <article className="card" key={module.title}><div className="card-icon">{module.icon}</div><h3>{module.title}</h3><p>{module.text}</p></article>)}
        </div>
      </section>

      <section className="sections" id="lookatme" style={{background:"#0d4424",color:"white"}}>
        <div className="section-title"><div className="eyebrow" style={{color:"#9de0ae"}}>Private social network</div><h2>LookAtMe is social — but built for communities.</h2><p style={{color:"#c5d9ca"}}>Verified members. Meaningful conversations. Green by design. Follow people, publish posts, comment and discover members across the network.</p></div>
      </section>

      <section className="sections" id="marche">
        <div className="section-title"><div className="eyebrow">Member commerce</div><h2>Marché connects buyers and sellers.</h2><p>A global marketplace layer where members own their shops and communities do not need to manage every transaction.</p></div>
      </section>

      <footer className="footer"><span>© 2026 CommunityHub</span><span>Built for communities · Secure · Multi-tenant</span></footer>
    </main>
  );
}
