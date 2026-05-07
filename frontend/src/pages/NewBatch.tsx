import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, PackagePlus } from "lucide-react";
import { batchesApi, minesApi } from "../utils/api";

const nowForInput = () => new Date().toISOString().slice(0, 16);

export default function NewBatch() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    mine_id: "",
    extraction_date: nowForInput(),
    weight_kg: "",
    purity_percent: "",
    geolocation: "",
    photo_ipfs_hash: "",
  });

  const { data: mines = [], isLoading: minesLoading } = useQuery("active-mines", () =>
    minesApi.list({ status: "ACTIVE" })
  );

  const selectedMine = useMemo(
    () => mines.find((mine: any) => mine.mine_id === form.mine_id),
    [mines, form.mine_id]
  );

  const createBatch = useMutation(
    () =>
      batchesApi.create({
        mine_id: form.mine_id,
        extraction_date: new Date(form.extraction_date).toISOString(),
        weight_kg: Number(form.weight_kg),
        purity_percent: Number(form.purity_percent),
        geolocation: form.geolocation,
        photo_ipfs_hash: form.photo_ipfs_hash || null,
      }),
    {
      onSuccess: (result: any) => {
        toast.success("Batch created");
        queryClient.invalidateQueries("batches");
        const batchId = result?.data?.batch_id;
        navigate(batchId ? `/batches/${batchId}` : "/batches");
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || "Could not create batch");
      },
    }
  );

  const update = (key: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.mine_id) {
      toast.error("Select an active mine first");
      return;
    }
    createBatch.mutate();
  };

  return (
    <div>
      <button
        onClick={() => navigate("/batches")}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          border: "none",
          background: "transparent",
          color: "var(--text-muted)",
          cursor: "pointer",
          fontSize: 14,
          marginBottom: 20,
          padding: 0,
        }}
      >
        <ArrowLeft size={16} /> Back
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <PackagePlus size={22} color="var(--accent)" />
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>New Batch</h1>
      </div>

      <form
        onSubmit={submit}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 24,
          maxWidth: 720,
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <Field label="Active Mine">
            <select
              required
              value={form.mine_id}
              onChange={(event) => {
                const mineId = event.target.value;
                const mine = mines.find((item: any) => item.mine_id === mineId);
                setForm((current) => ({
                  ...current,
                  mine_id: mineId,
                  geolocation: mine?.coordinates || current.geolocation,
                }));
              }}
              style={inputStyle}
            >
              <option value="">{minesLoading ? "Loading mines..." : "Select mine"}</option>
              {mines.map((mine: any) => (
                <option key={mine.mine_id} value={mine.mine_id}>
                  {mine.name} - {mine.country}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Extraction Date">
            <input
              required
              type="datetime-local"
              value={form.extraction_date}
              onChange={(event) => update("extraction_date", event.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Weight (kg)">
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={form.weight_kg}
              onChange={(event) => update("weight_kg", event.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Purity (%)">
            <input
              required
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={form.purity_percent}
              onChange={(event) => update("purity_percent", event.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Geolocation">
            <input
              required
              placeholder="-10.5,25.3"
              value={form.geolocation}
              onChange={(event) => update("geolocation", event.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Photo IPFS Hash">
            <input
              placeholder="Optional"
              value={form.photo_ipfs_hash}
              onChange={(event) => update("photo_ipfs_hash", event.target.value)}
              style={inputStyle}
            />
          </Field>
        </div>

        {selectedMine && (
          <div style={{ marginTop: 16, fontSize: 13, color: "var(--text-muted)" }}>
            Creating from {selectedMine.name} operated by {selectedMine.operator_id}.
          </div>
        )}

        {!minesLoading && mines.length === 0 && (
          <div style={{ marginTop: 16, fontSize: 13, color: "#d97706" }}>
            No active mines are available. Register a mine and set its compliance status to ACTIVE first.
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button
            type="submit"
            disabled={createBatch.isLoading || mines.length === 0}
            style={{
              padding: "9px 18px",
              background: "var(--accent)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              cursor: "pointer",
              fontWeight: 600,
              opacity: createBatch.isLoading || mines.length === 0 ? 0.7 : 1,
            }}
          >
            {createBatch.isLoading ? "Creating..." : "Create Batch"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/batches")}
            style={{
              padding: "9px 18px",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text)",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
      {label}
      {children}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  border: "1px solid var(--border)",
  borderRadius: 7,
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 13,
  boxSizing: "border-box",
};
