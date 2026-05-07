import React, { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Layers, Mountain, Ship, ShieldCheck,
  BarChart3, Settings, LogOut, Menu, X, Wallet, ChevronRight
} from "lucide-react";
import { useWallet } from "../hooks/useWallet";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/batches", label: "Batches", icon: Layers },
  { to: "/mines", label: "Mines", icon: Mountain },
  { to: "/shipments", label: "Shipments", icon: Ship },
  { to: "/compliance", label: "Compliance", icon: ShieldCheck },
  { to: "/esg", label: "ESG Report", icon: BarChart3 },
  { to: "/admin", label: "Admin", icon: Settings },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { address, isConnected, connect, balance } = useWallet();
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 240 : 64,
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.2s ease",
        overflow: "hidden",
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)" }}>
          <div style={{ width: 32, height: 32, background: "var(--accent)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>FC</span>
          </div>
          {sidebarOpen && <span style={{ fontWeight: 700, fontSize: 14, whiteSpace: "nowrap" }}>Ford Cobalt</span>}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(({ to, label, icon: Icon, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              style={({ isActive }) => ({
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", borderRadius: 8, textDecoration: "none",
                color: isActive ? "var(--accent)" : "var(--text-muted)",
                background: isActive ? "var(--accent-dim)" : "transparent",
                fontWeight: isActive ? 600 : 400, fontSize: 14, whiteSpace: "nowrap",
                transition: "all 0.15s",
              })}
            >
              <Icon size={18} style={{ flexShrink: 0 }} />
              {sidebarOpen && label}
            </NavLink>
          ))}
        </nav>

        {/* Wallet */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid var(--border)" }}>
          {isConnected ? (
            <div style={{ padding: "8px 10px", background: "var(--success-dim)", borderRadius: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", flexShrink: 0 }} />
                {sidebarOpen && (
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {address?.slice(0, 6)}…{address?.slice(-4)}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 600 }}>{balance} ETH</div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button onClick={connect} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 14,
            }}>
              <Wallet size={18} style={{ flexShrink: 0 }} />
              {sidebarOpen && "Connect Wallet"}
            </button>
          )}

          <button onClick={logout} style={{
            marginTop: 8, width: "100%", display: "flex", alignItems: "center", gap: 10,
            padding: "8px 10px", borderRadius: 8, border: "none",
            background: "transparent", color: "var(--text-muted)", cursor: "pointer", fontSize: 14,
          }}>
            <LogOut size={18} style={{ flexShrink: 0 }} />
            {sidebarOpen && "Logout"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Topbar */}
        <header style={{
          height: 56, display: "flex", alignItems: "center", padding: "0 24px",
          borderBottom: "1px solid var(--border)", background: "var(--surface)", gap: 16,
        }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
            border: "none", background: "transparent", cursor: "pointer", color: "var(--text-muted)", padding: 4,
          }}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Ford Cobalt Supply Chain</span>
          <ChevronRight size={14} style={{ color: "var(--text-muted)" }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>Traceability Portal</span>
        </header>

        {/* Content */}
        <main style={{ flex: 1, overflow: "auto", padding: 24 }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
