import React, { useState } from "react";
import { useQuery } from "react-query";
import { Download, RefreshCw } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { esgApi } from "../utils/api";

export default function ESGReport() {
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const { data, isLoading, refetch } = useQuery(
    ["esg", dateRange],
    () => esgApi.report(dateRange.from ? { date_from: dateRange.from, date_to: dateRange.to } : {}),
    { staleTime: 60_000 }
  );

  const exportPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Ford Cobalt ESG Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
    doc.text(`Period: ${data?.report_period?.from?.slice(0, 10)} → ${data?.report_period?.to?.slice(0, 10)}`, 14, 36);

    doc.setFontSize(13);
    doc.text("ESG Score", 14, 48);
    doc.setFontSize(24);
    doc.text(`${data?.esg_score?.score} (${data?.esg_score?.grade})`, 14, 60);

    autoTable(doc, {
      startY: 70,
      head: [["Metric", "Value"]],
      body: [
        ["Total Mines", data?.mines?.total],
        ["Active Mines", data?.mines?.active],
        ["Suspended Mines", data?.mines?.suspended],
        ["Total Batches", data?.batches?.total],
        ["Total Weight (kg)", data?.batches?.total_weight_kg?.toLocaleString()],
        ["Average Purity (%)", data?.batches?.average_purity_percent],
        ["Compliance Passed", data?.compliance?.passed],
        ["Compliance Failed", data?.compliance?.failed],
        ["Compliance Rate (%)", data?.compliance?.compliance_rate_percent],
        ["Shipments Delivered", data?.shipments?.delivered],
        ["Shipments In Transit", data?.shipments?.in_transit],
      ],
    });

    if (data?.mines?.by_country?.length) {
      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 10,
        head: [["Country", "Number of Mines"]],
        body: data.mines.by_country.map((c: any) => [c.country, c.count]),
        headStyles: { fillColor: [37, 99, 235] },
      });
    }

    doc.save(`ford-esg-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const radarData = data ? [
    { metric: "Compliance", value: data.compliance.compliance_rate_percent },
    { metric: "Mine Health", value: (data.mines.active / (data.mines.total || 1)) * 100 },
    { metric: "ESG Score", value: data.esg_score.score },
    { metric: "Delivery Rate", value: (data.shipments.delivered / ((data.shipments.delivered + data.shipments.in_transit) || 1)) * 100 },
  ] : [];

  const gradeColor: Record<string, string> = { A: "#16a34a", B: "#2563eb", C: "#d97706", D: "#dc2626" };
  const gc = gradeColor[data?.esg_score?.grade] || "#6b7280";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>ESG Report</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14, margin: "4px 0 0" }}>
            Environmental, Social & Governance metrics
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => refetch()} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px",
            border: "1px solid var(--border)", background: "transparent", borderRadius: 8,
            cursor: "pointer", color: "var(--text)", fontSize: 14,
          }}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button onClick={exportPDF} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
            background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8,
            cursor: "pointer", fontWeight: 600, fontSize: 14,
          }}>
            <Download size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* Date range */}
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
        padding: "14px 16px", display: "flex", gap: 12, marginBottom: 20, alignItems: "center",
      }}>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Period:</span>
        <input type="date" value={dateRange.from} onChange={e => setDateRange(r => ({ ...r, from: e.target.value }))}
          style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)", color: "var(--text)", fontSize: 13 }} />
        <span style={{ color: "var(--text-muted)" }}>→</span>
        <input type="date" value={dateRange.to} onChange={e => setDateRange(r => ({ ...r, to: e.target.value }))}
          style={{ padding: "6px 10px", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)", color: "var(--text)", fontSize: 13 }} />
      </div>

      {isLoading ? <div style={{ color: "var(--text-muted)", padding: 40 }}>Loading…</div> : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* ESG Score Card */}
          <div style={{
            background: "var(--surface)", border: `2px solid ${gc}`, borderRadius: 16,
            padding: 32, textAlign: "center", gridColumn: "1 / -1",
            display: "flex", justifyContent: "center", gap: 48, alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 72, fontWeight: 800, color: gc, lineHeight: 1 }}>{data?.esg_score?.grade}</div>
              <div style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 8 }}>ESG Grade</div>
            </div>
            <div style={{ width: 2, height: 80, background: "var(--border)" }} />
            <div>
              <div style={{ fontSize: 48, fontWeight: 700 }}>{data?.esg_score?.score}</div>
              <div style={{ fontSize: 14, color: "var(--text-muted)" }}>out of 100</div>
            </div>
            <div style={{ width: 2, height: 80, background: "var(--border)" }} />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, marginBottom: 6 }}>
                <span style={{ color: "var(--text-muted)" }}>Compliance Score: </span>
                <strong>{data?.esg_score?.components?.compliance}</strong>
              </div>
              <div style={{ fontSize: 13 }}>
                <span style={{ color: "var(--text-muted)" }}>Mine Health Score: </span>
                <strong>{data?.esg_score?.components?.mine_health}</strong>
              </div>
            </div>
          </div>

          {/* Stats grid */}
          {[
            { section: "Mines", items: [
              ["Total", data?.mines?.total],
              ["Active", data?.mines?.active],
              ["Suspended", data?.mines?.suspended],
            ]},
            { section: "Batches", items: [
              ["Total", data?.batches?.total],
              ["Total Weight (kg)", data?.batches?.total_weight_kg?.toLocaleString()],
              ["Avg Purity", `${data?.batches?.average_purity_percent}%`],
            ]},
            { section: "Compliance", items: [
              ["Passed", data?.compliance?.passed],
              ["Failed", data?.compliance?.failed],
              ["Rate", `${data?.compliance?.compliance_rate_percent}%`],
            ]},
            { section: "Shipments", items: [
              ["Delivered", data?.shipments?.delivered],
              ["In Transit", data?.shipments?.in_transit],
            ]},
          ].map(({ section, items }) => (
            <div key={section} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>
                {section}
              </h3>
              {items.map(([label, value]) => (
                <div key={label as string} style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{value ?? "—"}</span>
                </div>
              ))}
            </div>
          ))}

          {/* Radar */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Performance Radar</h3>
            <ResponsiveContainer width="100%" height={220}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                <Radar name="Score" dataKey="value" stroke="#2563eb" fill="#2563eb" fillOpacity={0.2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Country breakdown */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Mines by Country</h3>
            {data?.mines?.by_country?.map((c: any) => (
              <div key={c.country} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 14 }}>{c.country}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 80, height: 6, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(c.count / data.mines.total) * 100}%`, background: "var(--accent)", borderRadius: 999 }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 14, minWidth: 20, textAlign: "right" }}>{c.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
