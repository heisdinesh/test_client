"use client";

import { useCallback, useEffect, useState } from "react";
import "./dashboard.css";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://5000-kode-ws-f9fbf17f0.hebbale.academy";

const LABELS = {
  en: {
    title: "Crate Rooms",
    updated: "Updated",
    warehouse: "Warehouse",
    farm: "Farm",
    temp: "Temp",
    humidity: "Humidity",
    voc: "VOC",
    unassigned: "Unassigned",
    score: "Score",
    noCrates: "No crates",
    refreshError: "Unable to refresh dashboard",
    loadError: "Unable to load dashboard",
    language: "Language",
    english: "English",
    kannada: "Kannada",
  },
  kn: {
    title: "ಕ್ರೇಟ್ ಕೊಠಡಿಗಳು",
    updated: "ನವೀಕರಿಸಲಾಗಿದೆ",
    warehouse: "ಗೋದಾಮು",
    farm: "ಫಾರ್ಮ್",
    temp: "ತಾಪಮಾನ",
    humidity: "ಆರ್ದ್ರತೆ",
    voc: "VOC",
    unassigned: "ನಿಗದಿಪಡಿಸಿಲ್ಲ",
    score: "ಸ್ಕೋರ್",
    noCrates: "ಕ್ರೇಟ್‌ಗಳಿಲ್ಲ",
    refreshError: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ನವೀಕರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ",
    loadError: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ಲೋಡ್ ಮಾಡಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ",
    language: "ಭಾಷೆ",
    english: "English",
    kannada: "ಕನ್ನಡ",
  },
};

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

  if (normalized.includes("soon") || normalized.includes("today") || normalized.includes("orange")) {
    return "priority-soon";
  }

  return "priority-unknown";
}

function CrateBox({ scan, labels }) {
  const priority = scan.qrCode?.priority || scan.priority;
  const shelfScore = scan.qrCode?.ShelfScore ?? scan.ShelfScore;
  const crateClassName = `crate-box ${priorityClass(priority)}`;

  return (
    <article className={crateClassName}>
      <div>
        <strong>{scan.qrCodeId}</strong>
        <p>{scan.room?.name || scan.roomId || labels.unassigned}</p>
      </div>

      <dl>
        <div>
          <dt>{labels.temp}</dt>
          <dd>{formatValue(scan.temperature, " C")}</dd>
        </div>
        <div>
          <dt>{labels.humidity}</dt>
          <dd>{formatValue(scan.humidity, "%")}</dd>
        </div>
        <div>
          <dt>{labels.voc}</dt>
          <dd>{formatValue(scan.voc)}</dd>
        </div>
      </dl>

      {(priority || shelfScore !== null) && (
        <div className="crate-meta">
          {priority && <span className="priority-pill">{priority}</span>}
          {shelfScore !== null && shelfScore !== undefined && <span>{labels.score} {shelfScore}</span>}
        </div>
      )}
    </article>
  );
}

function CrateColumn({ title, count, scans, labels }) {
  return (
    <section className="crate-column">
      <div className="column-heading">
        <h2>{title}</h2>
        <span>{count}</span>
      </div>

      <div className="crate-list">
        {scans.length > 0 ? (
          scans.map((scan) => <CrateBox key={scan.id} scan={scan} labels={labels} />)
        ) : (
          <p className="empty-state">{labels.noCrates}</p>
        )}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("en");
  const labels = LABELS[language];

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
      setError("refresh");
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
          <h1>{labels.title}</h1>
          <p>{labels.updated} {dashboard?.updated_at ? new Date(dashboard.updated_at).toLocaleTimeString() : "--"}</p>
        </div>

        <div className="dashboard-actions">
          <label className="language-control">
            <span>{labels.language}</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="en">{labels.english}</option>
              <option value="kn">{labels.kannada}</option>
            </select>
          </label>

          <aside className="sensor-panel">
            <span>{labels.warehouse}</span>
            <div>
              <strong>{formatValue(warehouseSensor?.temperature, " C")}</strong>
              <strong>{formatValue(warehouseSensor?.humidity, "%")}</strong>
              <strong>{formatValue(warehouseSensor?.voc)}</strong>
            </div>
          </aside>
        </div>
      </header>

      {error && <p className="dashboard-error">{labels.refreshError}</p>}

      <div className="crate-grid">
        <CrateColumn
          title={labels.farm}
          count={dashboard?.counts?.farm || 0}
          scans={dashboard?.data?.farm || []}
          labels={labels}
        />
        <CrateColumn
          title={labels.warehouse}
          count={dashboard?.counts?.warehouse || 0}
          scans={dashboard?.data?.warehouse || []}
          labels={labels}
        />
      </div>
    </main>
  );
}
