import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "react-query";
import { Toaster } from "react-hot-toast";

import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Batches from "./pages/Batches";
import BatchDetail from "./pages/BatchDetail";
import Mines from "./pages/Mines";
import Shipments from "./pages/Shipments";
import CompliancePage from "./pages/Compliance";
import ESGReport from "./pages/ESGReport";
import AdminPanel from "./pages/AdminPanel";
import Login from "./pages/Login";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem("access_token");
  return token ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Layout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="batches" element={<Batches />} />
            <Route path="batches/:batchId" element={<BatchDetail />} />
            <Route path="mines" element={<Mines />} />
            <Route path="shipments" element={<Shipments />} />
            <Route path="compliance" element={<CompliancePage />} />
            <Route path="esg" element={<ESGReport />} />
            <Route path="admin" element={<AdminPanel />} />
          </Route>
        </Routes>
      </Router>
    </QueryClientProvider>
  );
}
