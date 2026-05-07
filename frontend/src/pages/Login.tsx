import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authApi } from "../utils/api";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.login(form);
      localStorage.setItem("access_token", data.access_token);
      toast.success("Logged in");
      navigate("/");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg)",
    }}>
      <div style={{
        width: 380, background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 16, padding: 40,
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, background: "var(--accent)", borderRadius: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
          }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 20 }}>FC</span>
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Ford Cobalt Portal</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, margin: "6px 0 0" }}>
            Ethical Supply Chain Traceability
          </p>
        </div>

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@ford.com"
              style={{
                width: "100%", padding: "10px 14px", border: "1px solid var(--border)",
                borderRadius: 8, background: "var(--bg)", color: "var(--text)",
                fontSize: 14, boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Password</label>
            <input
              type="password"
              required
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              style={{
                width: "100%", padding: "10px 14px", border: "1px solid var(--border)",
                borderRadius: 8, background: "var(--bg)", color: "var(--text)",
                fontSize: 14, boxSizing: "border-box",
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "11px", background: "var(--accent)", color: "#fff",
              border: "none", borderRadius: 8, cursor: "pointer",
              fontWeight: 600, fontSize: 15, marginTop: 4,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 20 }}>
          Secured by blockchain • Ford Motor Company
        </p>
      </div>
    </div>
  );
}
