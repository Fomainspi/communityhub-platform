"use client";

import { useEffect, useState } from "react";

type SessionProfile = {
  id: string;
  email: string;
  displayName: string;
  platformRole: string;
  memberships: Array<{ organizationId: string; role: string; status: string }>;
};

type SessionState = "loading" | "signed-in" | "signed-out" | "unavailable";

export default function SessionStatus() {
  const [state, setState] = useState<SessionState>("loading");
  const [profile, setProfile] = useState<SessionProfile | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/session", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          if (active) setState("signed-out");
          return;
        }
        if (!response.ok) {
          if (active) setState("unavailable");
          return;
        }
        const value = (await response.json()) as SessionProfile;
        if (active) {
          setProfile(value);
          setState("signed-in");
        }
      })
      .catch(() => {
        if (active) setState("unavailable");
      });

    return () => {
      active = false;
    };
  }, []);

  if (state === "loading") {
    return (
      <div className="card" role="status" style={{ marginBottom: 20 }}>
        Checking your session…
      </div>
    );
  }

  if (state === "signed-in" && profile) {
    return (
      <div className="card" style={{ marginBottom: 20 }}>
        <strong>Signed in as {profile.displayName}</strong>
        <p style={{ marginBottom: 12 }}>{profile.email}</p>
        <a className="btn secondary" href="/api/auth/logout">Sign out</a>
      </div>
    );
  }

  if (state === "signed-out") {
    return (
      <div className="card" style={{ marginBottom: 20 }}>
        <strong>You're viewing the demo workspace.</strong>
        <p>Sign in to connect your CommunityHub account and membership.</p>
        <a className="btn primary" href="/api/auth/login">Sign in</a>
      </div>
    );
  }

  return (
    <div className="card" role="status" style={{ marginBottom: 20 }}>
      <strong>Your account could not be checked.</strong>
      <p>Check that the CommunityHub API is running and try again.</p>
      <button className="btn secondary" onClick={() => window.location.reload()}>
        Retry
      </button>
    </div>
  );
}
