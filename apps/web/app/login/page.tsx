type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <section
        style={{
          width: "100%",
          maxWidth: 430,
          background: "white",
          border: "1px solid #dbe8de",
          borderRadius: 20,
          padding: 32,
        }}
      >
        <div className="brand">
          <span className="logo">C</span> CommunityHub
        </div>
        <h1 style={{ fontSize: 34, letterSpacing: -1, marginBottom: 8 }}>Welcome back</h1>
        <p style={{ color: "#607166" }}>
          Sign in securely to access your communities.
        </p>
        {error === "sign_in_failed" && (
          <p role="alert" style={{ marginTop: 18, color: "#a12626", fontSize: 14 }}>
            Sign-in could not be completed. Please try again.
          </p>
        )}
        <a
          className="btn primary"
          href="/api/auth/login"
          style={{
            display: "block",
            textAlign: "center",
            marginTop: 24,
            padding: 14,
          }}
        >
          Continue with secure sign-in
        </a>
        <p style={{ textAlign: "center", fontSize: 13, color: "#607166", marginTop: 20 }}>
          Your password is handled by the configured identity provider and is never collected by CommunityHub.
        </p>
      </section>
    </main>
  );
}
