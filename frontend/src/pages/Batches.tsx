import React, { useState } from "react";
import { useQuery } from "react-query";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { batchesApi } from "../utils/api";

const STATUSES = ["", "EXTRACTED", "IN_TRANSIT", "PROCESSING", "DELIVERED", "REJECTED", "FLAGGED"];

export default function Batches() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ mine_id: "", status: "", page: 1 });

  const { data, isLoading } = useQuery(
    ["batches", filters],
    () => batchesApi.search({ ...filters, page_size: "20", page: String(filters.page) }),
    { keepPreviousData: true }
  );

  const STATUS_COLORS: Record<string, string> = {
    EXTRACTED: "#2563eb", IN_TRANSIT: "#d97706", PROCESSING: "#7c3aed",
    DELIVERED: "#16a34a", REJECTED: "#dc2626", FLAGGED: "#ef4444",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Batches</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "4px 0 0" }}>
            {data?.total ?? "—"} total batches
          </p>
        </div>
        <button onClick={() => navigate("/batches/new")} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
          background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8,
          cursor: "pointer", fontWeight: 600, fontSize: 14,
        }}>
          <Plus size={16} /> New Batch
        </button>
      </div>

      {/* Filters */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
        padding: "14px 16px", display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap",
      }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            placeholder="Filter by Mine ID…"
            value={filters.mine_id}
            onChange={e => setFilters(f => ({ ...f, mine_id: e.target.value, page: 1 }))}
            style={{
              width: "100%", padding: "7px 10px 7px 32px", background: "var(--bg)",
              border: "1px solid var(--border)", borderRadius: 7, color: "var(--text)", fontSize: 13,
              boxSizing: "border-box",
            }}
          />
        </div>

        <select
          value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))}
          style={{
            padding: "7px 12px", background: "var(--bg)", border: "1px solid var(--border)",
            borderRadius: 7, color: "var(--text)", fontSize: 13, cursor: "pointer",
          }}
        >
          {STATUSES.map(s => <option key={s} value={s}>{s || "All Statuses"}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
              {["Batch ID", "Mine ID", "Weight (kg)", "Purity %", "Custody Steps", "Status", "Created"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 16px", color: "var(--text-muted)", fontWeight: 500, whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>No batches found</td></tr>
            ) : (
              data?.items?.map((b: any) => {
                const c = STATUS_COLORS[b.status] || "#6b7280";
                return (
                  <tr
                    key={b.batch_id}
                    onClick={() => navigate(`/batches/${b.batch_id}`)}
                    style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 11 }}>
                      {b.batch_id?.slice(0, 18)}…
                    </td>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", fontSize: 11 }}>
                      {b.mine_id?.slice(0, 14)}…
                    </td>
                    <td style={{ padding: "12px 16px" }}>{b.weight_kg?.toLocaleString()}</td>
                    <td style={{ padding: "12px 16px" }}>{b.purity_percent}%</td>
                    <td style={{ padding: "12px 16px" }}>{b.custody_chain?.length ?? 0}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ background: `${c}20`, color: c, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                        {b.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "var(--text-muted)" }}>
                      {new Date(b.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {data && data.pages > 1 && (
          <div style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)" }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Page {data.page} of {data.pages} ({data.total} results)
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))}
                disabled={filters.page === 1}
                style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 6, background: "transparent", cursor: "pointer", color: "var(--text)" }}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))}
                disabled={filters.page === data.pages}
                style={{ padding: "6px 12px", border: "1px solid var(--border)", borderRadius: 6, background: "transparent", cursor: "pointer", color: "var(--text)" }}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
