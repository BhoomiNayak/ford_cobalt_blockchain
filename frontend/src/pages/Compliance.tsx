import React from "react";
import { useQuery } from "react-query";
import { ShieldCheck, ShieldX, Clock } from "lucide-react";
import { complianceApi } from "../utils/api";

export default function CompliancePage() {
  const { data, isLoading } = useQuery("compliance-list", () => complianceApi.list());

  const ICONS: Record<string, any> = { PASSED: ShieldCheck, FAILED: ShieldX, PENDING: Clock, UNDER_REVIEW: Clock };
  const COLORS: Record<string, string> = { PASSED: "#16a34a", FAILED: "#dc2626", PENDING: "#6b7280", UNDER_REVIEW: "#d97706" };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Compliance Records</h1>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg)", borderBottom: "1px solid var(--border)" }}>
              {["Batch ID", "Labor", "Environmental", "Conflict Free", "Docs", "Audit", "Status", "Verified"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "10px 14px", color: "var(--text-muted)", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>Loading…</td></tr>
            ) : data?.map((r: any) => {
              const Icon = ICONS[r.status] || Clock;
              const c = COLORS[r.status] || "#6b7280";
              const Tick = ({ v }: { v: boolean }) => <span style={{ color: v ? "#16a34a" : "#dc2626" }}>{v ? "✓" : "✗"}</span>;
              return (
                <tr key={r.batch_id} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11 }}>{r.batch_id?.slice(0, 16)}…</td>
                  <td style={{ padding: "10px 14px" }}><Tick v={r.labor_standards} /></td>
                  <td style={{ padding: "10px 14px" }}><Tick v={r.environmental_safety} /></td>
                  <td style={{ padding: "10px 14px" }}><Tick v={r.conflict_free} /></td>
                  <td style={{ padding: "10px 14px" }}><Tick v={r.documentation_valid} /></td>
                  <td style={{ padding: "10px 14px" }}><Tick v={r.audit_passed} /></td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, color: c, fontWeight: 600, fontSize: 12 }}>
                      <Icon size={14} />{r.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", color: "var(--text-muted)" }}>
                    {r.checked_at ? new Date(r.checked_at).toLocaleDateString() : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
