"use client";

import { useCallback, useEffect, useState } from "react";
import "./dashboard.css";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://5000-kode-ws-f9fbf17f0.hebbale.academy";

function formatValue(value, suffix = "") {
  if (value === null || value === undefined) {
    return "--";
  }

  return `${value}${suffix}`;
}

function priorityClass(priority) {
  const normalized = String(priority || "").toLowerCase().replace(/[_-]+/g, " ");

  if (normalized.includes("can wait") || normalized.includes("wait")) {
    return "priority-can-wait";
  }

  if (normalized.includes("immediate") || normalized.includes("red")) {
    return "priority-immediate";
  }

  if (normalized.includes("soon") || normalized.includes("orange")) {
    return "priority-soon";
  }

  return "priority-unknown";
}

function CrateBox({ scan }) {
  const priority = scan.qrCode?.priority || scan.priority;
  const shelfScore = scan.qrCode?.ShelfScore ?? scan.ShelfScore;
  const crateClassName = `crate-box ${priorityClass(priority)}`;

  return (
    <article className={crateClassName}>
      <div>
        <strong>{scan.qrCodeId}</strong>
        <p>{scan.room?.name || scan.roomId || "Unassigned"}</p>
      </div>

      <dl>
        <div>
          <dt>Temp</dt>
          <dd>{formatValue(scan.temperature, " C")}</dd>
        </div>
        <div>
          <dt>Humidity</dt>
          <dd>{formatValue(scan.humidity, "%")}</dd>
        </div>
        <div>
          <dt>VOC</dt>
          <dd>{formatValue(scan.voc)}</dd>
        </div>
      </dl>

      {(priority || shelfScore !== null) && (
        <div className="crate-meta">
          {priority && <span className="priority-pill">{priority}</span>}
          {shelfScore !== null && shelfScore !== undefined && <span>Score {shelfScore}</span>}
        </div>
      )}
    </article>
  );
}

function CrateColumn({ title, count, scans }) {
  return (
    <section className="crate-column">
      <div className="column-heading">
        <h2>{title}</h2>
        <span>{count}</span>
      </div>

      <div className="crate-list">
        {scans.length > 0 ? (
          scans.map((scan) => <CrateBox key={scan.id} scan={scan} />)
        ) : (
          <p className="empty-state">No crates</p>
        )}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/crates`, {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || data.message || "Unable to load dashboard");
      }

      setDashboard(data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Unable to refresh dashboard");
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(fetchDashboard, 0);
    const intervalId = setInterval(fetchDashboard, 10000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [fetchDashboard]);

  const warehouseSensor = dashboard?.warehouse_sensor;

  return (
    <main className="dashboard-page">
      <header className="dashboard-topbar">
        <div>
          <h1>Crate Rooms</h1>
          <p>Updated {dashboard?.updated_at ? new Date(dashboard.updated_at).toLocaleTimeString() : "--"}</p>
        </div>

        <aside className="sensor-panel">
          <span>Warehouse</span>
          <div>
            <strong>{formatValue(warehouseSensor?.temperature, " C")}</strong>
            <strong>{formatValue(warehouseSensor?.humidity, "%")}</strong>
            <strong>{formatValue(warehouseSensor?.voc)}</strong>
          </div>
        </aside>
      </header>

      {error && <p className="dashboard-error">{error}</p>}

      <div className="crate-grid">
        <CrateColumn
          title="Farm"
          count={dashboard?.counts?.farm || 0}
          scans={dashboard?.data?.farm || []}
        />
        <CrateColumn
          title="Warehouse"
          count={dashboard?.counts?.warehouse || 0}
          scans={dashboard?.data?.warehouse || []}
        />
      </div>
    </main>
  );
}
