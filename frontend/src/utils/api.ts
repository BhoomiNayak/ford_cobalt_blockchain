/**
 * Axios API client with JWT interceptor.
 */
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api/v1";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

// ── Mines ──────────────────────────────────────────────
export const minesApi = {
  list: (params?: Record<string, string>) =>
    api.get("/mines", { params }).then((r) => r.data),
  get: (mineId: string) => api.get(`/mines/${mineId}`).then((r) => r.data),
  register: (data: unknown) => api.post("/mines/register", data).then((r) => r.data),
  updateCompliance: (mineId: string, data: unknown) =>
    api.put(`/mines/${mineId}/compliance`, data).then((r) => r.data),
};

// ── Batches ────────────────────────────────────────────
export const batchesApi = {
  search: (params?: Record<string, unknown>) =>
    api.get("/batches/search", { params }).then((r) => r.data),
  getProvenance: (batchId: string) =>
    api.get(`/batches/${batchId}/provenance`).then((r) => r.data),
  create: (data: unknown) => api.post("/batches/create", data).then((r) => r.data),
  addCustody: (batchId: string, data: unknown) =>
    api.post(`/batches/${batchId}/custody`, data).then((r) => r.data),
};

// ── Shipments ──────────────────────────────────────────
export const shipmentsApi = {
  list: (params?: Record<string, string>) =>
    api.get("/shipments", { params }).then((r) => r.data),
  getTracking: (shipmentId: string) =>
    api.get(`/shipments/${shipmentId}/tracking`).then((r) => r.data),
  create: (data: unknown) => api.post("/shipments/create", data).then((r) => r.data),
  updateStatus: (shipmentId: string, status: string) =>
    api.put(`/shipments/${shipmentId}/status`, null, { params: { new_status: status } }).then((r) => r.data),
};

// ── Compliance ─────────────────────────────────────────
export const complianceApi = {
  list: (params?: Record<string, string>) =>
    api.get("/compliance/batches", { params }).then((r) => r.data),
  getBatch: (batchId: string) =>
    api.get(`/compliance/batch/${batchId}`).then((r) => r.data),
  verify: (data: unknown) => api.post("/compliance/verify", data).then((r) => r.data),
};

// ── ESG ────────────────────────────────────────────────
export const esgApi = {
  report: (params?: Record<string, string>) =>
    api.get("/esg/report", { params }).then((r) => r.data),
};

// ── Auth ───────────────────────────────────────────────
export const authApi = {
  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data).then((r) => r.data),
  register: (data: unknown) => api.post("/auth/register", data).then((r) => r.data),
  me: () => api.get("/auth/me").then((r) => r.data),
};
