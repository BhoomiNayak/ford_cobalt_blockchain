import React from "react";
import { useQuery } from "react-query";
import { Mountain, Layers, Ship, ShieldCheck, TrendingUp, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { esgApi, batchesApi, minesApi, shipmentsApi } from "../utils/api";

const COLORS = ["#2563eb", "#16a34a", "#dc2626", "#d97706"];

function KPICard({ icon: Icon, label, value, sub, color = "#2563eb" }: any) {
  return (
    <div style={{
      background: "var(--surface)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "20px 24px", display: "flex", gap: 16, alignItems: "center",
    }}>
      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{value ?? "—"}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: esg } = useQuery("esg-report", () => esgApi.report());
  const { data: batches } = useQuery("batches-search", () => batchesApi.search({ page_size: "5" }));
  const { data: mines } = useQuery("mines", () => minesApi.list());

  const complianceData = esg ? [
    { name: "Passed", value: esg.compliance.passed },
    { name: "Failed", value: esg.compliance.failed },
    { name: "Pending", value: esg.compliance.pending },
  ] : [];

  const minesByCountry = esg?.mines?.by_country?.map((c: any) => ({
    country: c.country, mines: c.count,
  })) || [];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Supply Chain Overview</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "4px 0 0" }}>
          Real-time cobalt traceability dashboard
        </p>
      </div>

      {/* KPI Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <KPICard icon={Mountain} label="Active Mines" value={esg?.mines?.active} sub={`of ${esg?.mines?.total} total`} color="#2563eb" />
        <KPICard icon={Layers} label="Total Batches" value={esg?.batches?.total} sub={`${esg?.batches?.total_weight_kg?.toLocaleString()} kg total`} color="#7c3aed" />
        <KPICard icon={ShieldCheck} label="Compliance Rate" value={`${esg?.compliance?.compliance_rate_percent}%`} sub="ESG verified batches" color="#16a34a" />
        <KPICard icon={TrendingUp} label="ESG Score" value={`${esg?.esg_score?.score} (${esg?.esg_score?.grade})`} sub="Current period" color="#d97706" />
        <KPICard icon={Ship} label="In Transit" value={esg?.shipments?.in_transit} sub={`${esg?.shipments?.delivered} delivered`} color="#0891b2" />
        <KPICard icon={AlertTriangle} label="Failed Compliance" value={esg?.compliance?.failed} sub="Require attention" color="#dc2626" />
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Mines by Country */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Mines by Country</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={minesByCountry}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="country" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="mines" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Compliance Donut */}
        <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Compliance Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={complianceData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {complianceData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Batches */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Recent Batches</h3>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Batch ID", "Mine ID", "Weight (kg)", "Purity %", "Status", "Created"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "8px 12px", color: "var(--text-muted)", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {batches?.items?.map((b: any) => (
              <tr key={b.batch_id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 11 }}>{b.batch_id?.slice(0, 16)}…</td>
                <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: 11 }}>{b.mine_id?.slice(0, 12)}…</td>
                <td style={{ padding: "10px 12px" }}>{b.weight_kg?.toLocaleString()}</td>
                <td style={{ padding: "10px 12px" }}>{b.purity_percent}%</td>
                <td style={{ padding: "10px 12px" }}>
                  <StatusBadge status={b.status} />
                </td>
                <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>
                  {new Date(b.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    ACTIVE: "#16a34a", EXTRACTED: "#2563eb", IN_TRANSIT: "#d97706",
    DELIVERED: "#16a34a", REJECTED: "#dc2626", FLAGGED: "#dc2626",
    PASSED: "#16a34a", FAILED: "#dc2626", PENDING: "#6b7280",
  };
  const c = colors[status] || "#6b7280";
  return (
    <span style={{ background: `${c}20`, color: c, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600 }}>
      {status}
    </span>
  );
}
