import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import { ArrowLeft, MapPin, User, Clock, CheckCircle, Package, Truck, Factory } from "lucide-react";
import { batchesApi, complianceApi } from "../utils/api";

const ROLE_ICONS: Record<string, any> = {
  MINE: Package, TRANSPORTER: Truck, PROCESSOR: Factory,
  REFINERY: Factory, MANUFACTURER: Factory,
};
const ROLE_COLORS: Record<string, string> = {
  MINE: "#2563eb", TRANSPORTER: "#d97706", PROCESSOR: "#7c3aed",
  REFINERY: "#0891b2", MANUFACTURER: "#16a34a",
};

export default function BatchDetail() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();

  const { data: batch, isLoading } = useQuery(
    ["batch", batchId],
    () => batchesApi.getProvenance(batchId!),
    { enabled: !!batchId }
  );

  const { data: compliance } = useQuery(
    ["compliance", batchId],
    () => complianceApi.getBatch(batchId!),
    { enabled: !!batchId, retry: false }
  );

  if (isLoading) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Loading…</div>;
  if (!batch) return <div style={{ padding: 40, color: "var(--text-muted)" }}>Batch not found</div>;

  return (
    <div>
      <button onClick={() => navigate(-1)} style={{
        display: "flex", alignItems: "center", gap: 6, border: "none", background: "transparent",
        color: "var(--text-muted)", cursor: "pointer", fontSize: 14, marginBottom: 20, padding: 0,
      }}>
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>
        {/* Main info */}
        <div>
          {/* Header */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>BATCH ID</div>
                <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 600, wordBreak: "break-all" }}>{batch.batch_id}</div>
              </div>
              <StatusBadge status={batch.status} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginTop: 20 }}>
              {[
                { label: "Mine ID", value: batch.mine_id?.slice(0, 16) + "…" },
                { label: "Weight", value: `${batch.weight_kg?.toLocaleString()} kg` },
                { label: "Purity", value: `${batch.purity_percent}%` },
                { label: "Extracted", value: new Date(batch.extraction_date).toLocaleDateString() },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>{label}</div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{value}</div>
                </div>
              ))}
            </div>

            {batch.geolocation && (
              <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)" }}>
                <MapPin size={14} />
                {batch.geolocation}
              </div>
            )}

            {batch.tx_hash && (
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-muted)" }}>
                Tx: <span style={{ fontFamily: "monospace" }}>{batch.tx_hash}</span>
              </div>
            )}
          </div>

          {/* Provenance Timeline */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 24 }}>
            <h2 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 700 }}>Custody Chain</h2>

            {batch.custody_chain?.length === 0 ? (
              <div style={{ color: "var(--text-muted)", fontSize: 14, textAlign: "center", padding: 32 }}>
                No custody records yet
              </div>
            ) : (
              <div style={{ position: "relative" }}>
                {/* Vertical line */}
                <div style={{
                  position: "absolute", left: 23, top: 0, bottom: 0,
                  width: 2, background: "var(--border)",
                }} />

                {batch.custody_chain?.map((record: any, idx: number) => {
                  const Icon = ROLE_ICONS[record.role] || User;
                  const color = ROLE_COLORS[record.role] || "#6b7280";
                  const isLast = idx === batch.custody_chain.length - 1;

                  return (
                    <div key={idx} style={{ display: "flex", gap: 16, marginBottom: isLast ? 0 : 24, position: "relative" }}>
                      {/* Icon */}
                      <div style={{
                        width: 48, height: 48, borderRadius: "50%", flexShrink: 0,
                        background: `${color}20`, border: `2px solid ${color}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        zIndex: 1,
                      }}>
                        <Icon size={20} color={color} />
                      </div>

                      {/* Content */}
                      <div style={{
                        flex: 1, background: "var(--bg)", border: "1px solid var(--border)",
                        borderRadius: 10, padding: "14px 16px",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <span style={{
                              background: `${color}20`, color, padding: "2px 8px",
                              borderRadius: 999, fontSize: 11, fontWeight: 700,
                            }}>{record.role}</span>
                            <span style={{ marginLeft: 8, fontWeight: 600, fontSize: 14 }}>{record.actor_id}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-muted)" }}>
                            <Clock size={12} />
                            {new Date(record.timestamp).toLocaleString()}
                          </div>
                        </div>

                        {record.location && (
                          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>
                            <MapPin size={12} /> {record.location}
                          </div>
                        )}

                        {record.notes && (
                          <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)" }}>{record.notes}</div>
                        )}

                        {record.tx_hash && (
                          <div style={{ marginTop: 6, fontSize: 10, color: "var(--text-muted)", fontFamily: "monospace" }}>
                            ⛓ {record.tx_hash}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Compliance Card */}
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600 }}>Compliance Checks</h3>
            {compliance ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  ["Labor Standards", compliance.labor_standards],
                  ["Environmental Safety", compliance.environmental_safety],
                  ["Conflict Free", compliance.conflict_free],
                  ["Documentation Valid", compliance.documentation_valid],
                  ["Audit Passed", compliance.audit_passed],
                ].map(([label, passed]) => (
                  <div key={label as string} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13 }}>{label as string}</span>
                    <CheckCircle size={16} color={passed ? "#16a34a" : "#dc2626"} />
                  </div>
                ))}
                <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                  <StatusBadge status={compliance.status} />
                </div>
              </div>
            ) : (
              <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No compliance record</div>
            )}
          </div>

          {/* Photo */}
          {batch.photo_ipfs_hash && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
              <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 600 }}>Documentation</h3>
              <a href={`https://ipfs.io/ipfs/${batch.photo_ipfs_hash}`} target="_blank" rel="noreferrer"
                style={{ color: "var(--accent)", fontSize: 13, textDecoration: "none" }}>
                📄 View IPFS Document
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    EXTRACTED: "#2563eb", IN_TRANSIT: "#d97706", DELIVERED: "#16a34a",
    REJECTED: "#dc2626", FLAGGED: "#dc2626", PASSED: "#16a34a", FAILED: "#dc2626", PENDING: "#6b7280",
  };
  const c = colors[status] || "#6b7280";
  return (
    <span style={{ background: `${c}20`, color: c, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
      {status}
    </span>
  );
}
