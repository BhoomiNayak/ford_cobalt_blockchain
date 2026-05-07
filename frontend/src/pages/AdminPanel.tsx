// AdminPanel.tsx
import React, { useState } from "react";
import { useMutation } from "react-query";
import toast from "react-hot-toast";
import { Settings, UserPlus } from "lucide-react";
import { authApi } from "../utils/api";

export default function AdminPanel() {
  const [form, setForm] = useState({ email: "", password: "", full_name: "", role: "viewer", organization: "" });

  const createUser = useMutation((data: any) => authApi.register(data), {
    onSuccess: () => { toast.success("User created"); setForm({ email: "", password: "", full_name: "", role: "viewer", organization: "" }); },
    onError: (e: any) => {
      toast.error(e.response?.data?.detail || "Error");
    },
  });

  const ROLES = ["admin", "auditor", "operator", "viewer"];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
        <Settings size={22} /> Admin Panel
      </h1>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, maxWidth: 560 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
          <UserPlus size={18} /> Create User
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            ["full_name", "Full Name", "text"],
            ["email", "Email", "email"],
            ["password", "Password", "password"],
            ["organization", "Organization", "text"],
          ].map(([key, label, type]) => (
            <div key={key}>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>{label}</label>
              <input
                type={type}
                value={(form as any)[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 7, background: "var(--bg)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }}
              />
            </div>
          ))}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>Role</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              style={{ width: "100%", padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 7, background: "var(--bg)", color: "var(--text)", fontSize: 13 }}
            >
              {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
            </select>
          </div>
          <button
            onClick={() => createUser.mutate(form)}
            disabled={createUser.isLoading}
            style={{ padding: "10px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14, marginTop: 4 }}
          >
            {createUser.isLoading ? "Creating…" : "Create User"}
          </button>
        </div>
      </div>

      <div style={{ marginTop: 24, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, maxWidth: 560 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Role Permissions</h2>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Role", "Register Mine", "Create Batch", "Verify Compliance", "Admin"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: "var(--text-muted)", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              ["admin", true, true, true, true],
              ["auditor", true, true, true, false],
              ["operator", false, true, false, false],
              ["viewer", false, false, false, false],
            ].map(([role, ...perms]) => (
              <tr key={role as string} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "8px 10px", fontWeight: 600 }}>{role as string}</td>
                {(perms as boolean[]).map((p, i) => (
                  <td key={i} style={{ padding: "8px 10px" }}>
                    <span style={{ color: p ? "#16a34a" : "#dc2626" }}>{p ? "✓" : "✗"}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
