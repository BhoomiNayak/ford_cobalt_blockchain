// ─── Mines.tsx ────────────────────────────────────────────────────────────────
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { Mountain, Plus, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { minesApi } from "../utils/api";

export function Mines() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", country: "", coordinates: "", operator_id: "", operator_address: "", certifications: "" });

  const { data: mines, isLoading } = useQuery("mines", () => minesApi.list());

  const register = useMutation((data: any) => minesApi.register(data), {
    onSuccess: () => { toast.success("Mine registered"); qc.invalidateQueries("mines"); setShowForm(false); },
    onError: (e: any) => {
      toast.error(e.response?.data?.detail || "Error");
    },
  });

  const STATUS_COLORS: Record<string, string> = { ACTIVE: "#16a34a", PENDING: "#d97706", SUSPENDED: "#dc2626", REVOKED: "#6b7280" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Mining Sites</h1>
        <button onClick={() => setShowForm(!showForm)} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
          background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14,
        }}>
          <Plus size={16} /> Register Mine
        </button>
      </div>

      {showForm && (
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Register New Mine</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              ["name", "Mine Name *"],
              ["country", "Country *"],
              ["coordinates", "Coordinates (lat,lng) *"],
              ["operator_id", "Operator ID *"],
              ["operator_address", "Ethereum Address *"],
              ["certifications", "Certifications (comma-separated)"],
            ].map(([key, label]) => (
              <div key={key}>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 4 }}>{label}</label>
                <input
                  value={(form as any)[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--border)", borderRadius: 7, background: "var(--bg)", color: "var(--text)", fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              onClick={() => register.mutate({ ...form, certifications: form.certifications.split(",").map(c => c.trim()).filter(Boolean) })}
              disabled={register.isLoading}
              style={{ padding: "8px 20px", background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}
            >
              {register.isLoading ? "Registering…" : "Register"}
            </button>
            <button onClick={() => setShowForm(false)} style={{ padding: "8px 20px", border: "1px solid var(--border)", background: "transparent", borderRadius: 8, cursor: "pointer", color: "var(--text)", fontSize: 14 }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {isLoading ? <p>Loading…</p> : mines?.map((m: any) => {
          const c = STATUS_COLORS[m.status] || "#6b7280";
          return (
            <div key={m.mine_id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Mountain size={20} color="var(--accent)" />
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</span>
                </div>
                <span style={{ background: `${c}20`, color: c, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{m.status}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>🌍 {m.country}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>📍 {m.coordinates}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 10 }}>Operator: {m.operator_id}</div>
              {m.certifications?.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {m.certifications.map((cert: string) => (
                    <span key={cert} style={{ background: "var(--accent-dim)", color: "var(--accent)", padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 600 }}>{cert}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default Mines;
