"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Organization = { id: string; name: string; slug: string; role: string };
type Member = {
  id: string;
  role: "MEMBER" | "COMMUNITY_ADMIN";
  status: "ACTIVE" | "INVITED" | "SUSPENDED" | "LEFT";
  joinedAt: string | null;
  createdAt: string;
  user: { id: string; displayName: string; email: string; status: string };
};
type MemberResponse = {
  members: Member[];
  pagination: { limit: number; offset: number; total: number; hasMore: boolean };
};

const PAGE_SIZE = 25;
const statusLabels: Record<Member["status"], string> = {
  ACTIVE: "Active", INVITED: "Invited", SUSPENDED: "Suspended", LEFT: "Left",
};

function apiErrorMessage(code: unknown, fallback: string): string {
  if (typeof code !== "string") return fallback;
  const messages: Record<string, string> = {
    UNAUTHORIZED: "Your session has expired. Please sign in again.",
    FORBIDDEN: "You do not have permission to manage this community.",
    ORGANIZATION_NOT_FOUND: "This community is unavailable or inactive.",
    MEMBERSHIP_NOT_FOUND: "This membership could not be found. Refresh the page and try again.",
    CANNOT_MODIFY_OWN_MEMBERSHIP: "You cannot change your own community membership.",
    LAST_COMMUNITY_ADMIN: "This change would leave the community without an active administrator.",
    CONCURRENT_MEMBERSHIP_CHANGE: "Another membership change happened at the same time. Refresh and try again.",
    API_UNAVAILABLE: "The CommunityHub API is temporarily unavailable. Please try again shortly.",
    AUTHENTICATION_NOT_CONFIGURED: "Sign-in is not configured for this environment yet.",
  };
  return messages[code] ?? fallback;
}

export default function CommunityMembersPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");

  const selectedOrganization = useMemo(
    () => organizations.find((organization) => organization.id === organizationId),
    [organizations, organizationId],
  );

  useEffect(() => {
    let active = true;
    fetch("/api/organizations", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(apiErrorMessage(body.error, "Could not load communities."));
        const manageable = (body.organizations as Organization[]).filter(
          (organization) => organization.role === "COMMUNITY_ADMIN" || organization.role === "SUPER_ADMIN",
        );
        if (!active) return;
        setOrganizations(manageable);
        setOrganizationId(manageable[0]?.id ?? "");
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load communities.");
      })
      .finally(() => { if (active) setLoadingOrganizations(false); });
    return () => { active = false; };
  }, []);

  const loadMembers = useCallback(async () => {
    if (!organizationId) {
      setMembers([]);
      setTotal(0);
      setHasMore(false);
      return;
    }
    setLoadingMembers(true);
    setError("");
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (search) params.set("search", search);
      const response = await fetch(
        `/api/organizations/${encodeURIComponent(organizationId)}/members?${params.toString()}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(apiErrorMessage(body.error, "Could not load members."));
      const result = body as MemberResponse;
      setMembers(result.members);
      setTotal(result.pagination.total);
      setHasMore(result.pagination.hasMore);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load members.");
    } finally {
      setLoadingMembers(false);
    }
  }, [organizationId, offset, search]);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  async function updateMember(member: Member, patch: { role?: Member["role"]; status?: Member["status"] }) {
    setBusyId(member.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/organizations/${encodeURIComponent(organizationId)}/members/${encodeURIComponent(member.id)}`,
        { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(patch) },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(apiErrorMessage(body.error, "Could not update membership."));
      setNotice(`Updated membership for ${member.user.displayName}.`);
      await loadMembers();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update membership.");
    } finally {
      setBusyId("");
    }
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setOffset(0);
    setSearch(searchInput.trim());
  }

  function changeOrganization(nextOrganizationId: string) {
    setOrganizationId(nextOrganizationId);
    setOffset(0);
  }

  return (
    <main className="shell">
      <nav className="nav">
        <a className="brand" href="/dashboard"><span className="logo">C</span> CommunityHub</a>
        <div className="navactions"><a className="btn secondary" href="/dashboard">Back to dashboard</a></div>
      </nav>
      <section className="sections">
        <div className="eyebrow">Community administration</div>
        <h1 style={{ fontSize: 44, letterSpacing: -2 }}>Member management</h1>
        <p style={{ color: "#607166", maxWidth: 680, lineHeight: 1.6 }}>
          View members and manage community-specific roles and membership status. Your permissions are checked by the API for every request.
        </p>

        {error && <div className="card" role="alert" style={{ borderColor: "#e6b6b6", color: "#8a2020", marginBottom: 16 }}>{error}</div>}
        {notice && <div className="card" role="status" style={{ borderColor: "#b8dfc2", color: "#155b2a", marginBottom: 16 }}>{notice}</div>}

        <section className="card" style={{ marginBottom: 20 }}>
          <label htmlFor="community" style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>Community</label>
          {loadingOrganizations ? <p>Loading your communities…</p> : organizations.length === 0 ? (
            <p>You do not have an active community-administrator role in any community.</p>
          ) : (
            <select id="community" value={organizationId} onChange={(event) => changeOrganization(event.target.value)} style={{ width: "100%", maxWidth: 480, padding: 12, border: "1px solid #dbe8de", borderRadius: 10, background: "white" }}>
              {organizations.map((organization) => <option value={organization.id} key={organization.id}>{organization.name}</option>)}
            </select>
          )}
          {selectedOrganization && <p style={{ marginBottom: 0, fontSize: 13, color: "#607166" }}>Your role: {selectedOrganization.role === "SUPER_ADMIN" ? "Platform Super Admin" : "Community Admin"}</p>}
        </section>

        {organizations.length > 0 && (
          <section className="card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
              <div><h2 style={{ margin: "0 0 5px" }}>Members</h2><p style={{ margin: 0, color: "#607166" }}>{total} membership{total === 1 ? "" : "s"}</p></div>
              <form onSubmit={submitSearch} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input aria-label="Search members" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search name or email" style={{ padding: 11, border: "1px solid #dbe8de", borderRadius: 10, minWidth: 220 }} />
                <button className="btn primary" type="submit">Search</button>
                {search && <button className="btn secondary" type="button" onClick={() => { setSearchInput(""); setSearch(""); setOffset(0); }}>Clear</button>}
              </form>
            </div>
            {loadingMembers ? <p role="status">Loading members…</p> : members.length === 0 ? <p>No members found for this search.</p> : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
                  <thead><tr>{["Member", "Email", "Role", "Membership status", "Actions"].map((heading) => <th key={heading} style={{ padding: "12px 10px", borderBottom: "1px solid #dbe8de", color: "#607166", whiteSpace: "nowrap" }}>{heading}</th>)}</tr></thead>
                  <tbody>{members.map((member) => (
                    <tr key={member.id}>
                      <td style={{ padding: 12, borderBottom: "1px solid #edf2ee", fontWeight: 700, whiteSpace: "nowrap" }}>{member.user.displayName}</td>
                      <td style={{ padding: 12, borderBottom: "1px solid #edf2ee" }}>{member.user.email}</td>
                      <td style={{ padding: 12, borderBottom: "1px solid #edf2ee" }}>
                        <select aria-label={`Role for ${member.user.displayName}`} disabled={busyId === member.id || member.status === "LEFT"} value={member.role} onChange={(event) => void updateMember(member, { role: event.target.value as Member["role"] })} style={{ padding: 8, border: "1px solid #dbe8de", borderRadius: 8, background: "white" }}>
                          <option value="MEMBER">Member</option><option value="COMMUNITY_ADMIN">Community Admin</option>
                        </select>
                      </td>
                      <td style={{ padding: 12, borderBottom: "1px solid #edf2ee" }}><span className="pill">{statusLabels[member.status]}</span></td>
                      <td style={{ padding: 12, borderBottom: "1px solid #edf2ee" }}>
                        <select aria-label={`Status for ${member.user.displayName}`} disabled={busyId === member.id || member.status === "LEFT"} value={member.status} onChange={(event) => void updateMember(member, { status: event.target.value as Member["status"] })} style={{ padding: 8, border: "1px solid #dbe8de", borderRadius: 8, background: "white" }}>
                          <option value="ACTIVE">Active</option><option value="INVITED">Invited</option><option value="SUSPENDED">Suspended</option><option value="LEFT">Left</option>
                        </select>
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
              <span style={{ color: "#607166", fontSize: 13 }}>
                {total === 0 ? "No results" : `Showing ${offset + 1}–${Math.min(offset + members.length, total)} of ${total}`}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn secondary" type="button" disabled={offset === 0 || loadingMembers} onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}>Previous</button>
                <button className="btn secondary" type="button" disabled={!hasMore || loadingMembers} onClick={() => setOffset((current) => current + PAGE_SIZE)}>Next</button>
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
