// Shipments.tsx
import React from "react";
import { useQuery } from "react-query";
import { Ship, MapPin } from "lucide-react";
import { shipmentsApi } from "../utils/api";

export function Shipments() {
  const { data: shipments, isLoading } = useQuery("shipments", () => shipmentsApi.list());
  const STATUS_COLORS: Record<string, string> = { CREATED: "#6b7280", IN_TRANSIT: "#d97706", DELIVERED: "#16a34a", DELAYED: "#dc2626", CUSTOMS: "#7c3aed" };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Shipments</h1>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {isLoading ? <p>Loading…</p> : shipments?.map((s: any) => {
          const c = STATUS_COLORS[s.status] || "#6b7280";
          return (
            <div key={s.shipment_id} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Ship size={20} color="var(--accent)" />
                  <div>
                    <div style={{ fontWeight: 600 }}>{s.carrier} — {s.carrier_id}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                      {s.origin} → {s.destination}
                    </div>
                  </div>
                </div>
                <span style={{ background: `${c}20`, color: c, padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{s.status}</span>
              </div>
              <div style={{ display: "flex", gap: 24, marginTop: 12, fontSize: 13, color: "var(--text-muted)" }}>
                <span>Batch: <code style={{ fontSize: 11 }}>{s.batch_id?.slice(0, 16)}…</code></span>
                <span>ETA: {new Date(s.estimated_arrival).toLocaleDateString()}</span>
                {s.actual_arrival && <span>Arrived: {new Date(s.actual_arrival).toLocaleDateString()}</span>}
                <span>IoT Readings: {s.iot_readings?.length ?? 0}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export default Shipments;
