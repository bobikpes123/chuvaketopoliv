import React, { useEffect, useMemo, useState } from "react";
import { Gauge, Waves, AlertTriangle, Power, Wifi, WifiOff } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

const START_THRESHOLD = 15;
const STOP_THRESHOLD = 75;

const COLORS = ["#111827", "#374151", "#4b5563", "#6b7280", "#1f2937", "#525252"];

function makeInitialState() {
  return {
    zones: [
      { id: 1, moisture: 43, watering: false, valveOpen: false },
      { id: 2, moisture: 58, watering: false, valveOpen: false },
      { id: 3, moisture: 28, watering: false, valveOpen: false },
      { id: 4, moisture: 67, watering: false, valveOpen: false },
      { id: 5, moisture: 14, watering: true, valveOpen: true },
      { id: 6, moisture: 51, watering: false, valveOpen: false },
    ],
    history: [
      {
        time: "0 c",
        seconds: 0,
        zone1: 43,
        zone2: 58,
        zone3: 28,
        zone4: 67,
        zone5: 14,
        zone6: 51,
      },
    ],
    hasWater: true,
    updatedAt: new Date().toISOString(),
  };
}

function getChartDomain(history, keys, padding = 3) {
  const values = [];

  history.forEach((point) => {
    keys.forEach((key) => {
      if (typeof point[key] === "number") {
        values.push(point[key]);
      }
    });
  });

  if (values.length === 0) return [0, 100];

  const min = Math.min(...values);
  const max = Math.max(...values);

  return [
    Math.max(0, Math.floor(min - padding)),
    Math.min(100, Math.ceil(max + padding)),
  ];
}

function getZoneState(zone) {
  if (zone.watering) return "Выполняется полив";
  if (zone.moisture <= START_THRESHOLD) return "Требуется полив";
  if (zone.moisture >= STOP_THRESHOLD) return "Достаточная влажность";
  return "Нормальное состояние";
}

function getZoneBorder(zone) {
  if (zone.watering) return "#111827";
  if (zone.moisture <= START_THRESHOLD) return "#991b1b";
  return "#d1d5db";
}

function Panel({ title, value, subtitle, icon }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #d1d5db",
        padding: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          color: "#4b5563",
          fontSize: 14,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
        }}
      >
        <span>{title}</span>
        <span>{icon}</span>
      </div>

      <div style={{ fontSize: 30, fontWeight: 700, color: "#111827" }}>
        {value}
      </div>

      <div style={{ marginTop: 8, fontSize: 14, color: "#6b7280" }}>
        {subtitle}
      </div>
    </div>
  );
}

function ZoneCard({ zone }) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: `2px solid ${getZoneBorder(zone)}`,
        padding: 20,
        minHeight: 190,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          borderBottom: "1px solid #e5e7eb",
          paddingBottom: 14,
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#111827" }}>
            Зона {zone.id}
          </div>
          <div style={{ marginTop: 6, fontSize: 14, color: "#4b5563" }}>
            {getZoneState(zone)}
          </div>
        </div>

        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: zone.valveOpen ? "#111827" : "#6b7280",
            border: "1px solid #d1d5db",
            padding: "7px 10px",
            height: "fit-content",
            background: zone.valveOpen ? "#f3f4f6" : "#ffffff",
          }}
        >
          {zone.valveOpen ? "Клапан открыт" : "Клапан закрыт"}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 6 }}>
            Влажность почвы
          </div>
          <div style={{ fontSize: 46, fontWeight: 800, color: "#111827" }}>
            {Number(zone.moisture).toFixed(1)}%
          </div>
        </div>

        <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.8 }}>
          <div>
            Пуск полива: <b>≤ {START_THRESHOLD}%</b>
          </div>
          <div>
            Остановка: <b>≥ {STOP_THRESHOLD}%</b>
          </div>
          <div>
            Насос: <b>{zone.watering ? "включён" : "выключен"}</b>
          </div>
        </div>
      </div>
    </div>
  );
}

function ZoneChart({ history, zoneId }) {
  const data = history.map((point) => ({
    time: point.time,
    value: point[`zone${zoneId}`],
  }));

  const domain = getChartDomain(data, ["value"], 2);

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #d1d5db",
        padding: 16,
      }}
    >
      <div
        style={{
          fontSize: 16,
          fontWeight: 700,
          marginBottom: 12,
          color: "#111827",
        }}
      >
        Зона {zoneId}
      </div>

      <div style={{ width: "100%", height: 210 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" />
            <YAxis domain={domain} unit="%" width={42} />
            <Tooltip />
            <ReferenceLine y={START_THRESHOLD} stroke="#991b1b" strokeDasharray="4 4" />
            <ReferenceLine y={STOP_THRESHOLD} stroke="#166534" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="value"
              stroke={COLORS[(zoneId - 1) % COLORS.length]}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function App() {
  const initial = useMemo(() => makeInitialState(), []);

  const [zones, setZones] = useState(initial.zones);
  const [history, setHistory] = useState(initial.history);
  const [hasWater, setHasWater] = useState(initial.hasWater);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [serverConnected, setServerConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [errorText, setErrorText] = useState("");

  async function loadStateFromServer() {
    if (!navigator.onLine) {
      setIsOnline(false);
      setServerConnected(false);
      setErrorText("Обновление данных остановлено.");
      return;
    }

    try {
      const response = await fetch("/api/state", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Ошибка получения данных с сервера");
      }

      const data = await response.json();

      setZones(Array.isArray(data.zones) ? data.zones : initial.zones);
      setHistory(Array.isArray(data.history) ? data.history : initial.history);
      setHasWater(data.hasWater !== false);
      setLastUpdate(new Date(data.updatedAt || Date.now()));
      setIsOnline(true);
      setServerConnected(true);
      setErrorText("");
    } catch (error) {
      setServerConnected(false);
      setErrorText("Обновление данных остановлено.");
    }
  }

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      loadStateFromServer();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setServerConnected(false);
      setErrorText("Обновление данных остановлено.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    loadStateFromServer();

    const timer = setInterval(() => {
      if (navigator.onLine) {
        loadStateFromServer();
      } else {
        setIsOnline(false);
        setServerConnected(false);
        setErrorText("Обновление данных остановлено.");
      }
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  const pumpActive = zones.some((zone) => zone.watering);

  const averageMoisture = useMemo(() => {
    if (!zones.length) return 0;
    return zones.reduce((sum, z) => sum + Number(z.moisture), 0) / zones.length;
  }, [zones]);

  const activeZone = zones.find((z) => z.watering);
  const alarm = !hasWater;

  const generalChartDomain = getChartDomain(
    history,
    ["zone1", "zone2", "zone3", "zone4", "zone5", "zone6"],
    4
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "#f3f4f6",
        padding: "16px",
        boxSizing: "border-box",
        fontFamily:
          'Arial, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        color: "#111827",
      }}
    >
      <div style={{ width: "100%", margin: 0 }}>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #d1d5db",
            padding: 26,
            marginBottom: 22,
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>
            Система автоматического полива растений
          </div>

          <div style={{ fontSize: 16, color: "#4b5563", lineHeight: 1.6 }}>
            Контроль влажности почвы по шести зонам.
          </div>

          <div style={{ marginTop: 12, fontSize: 14, color: "#6b7280" }}>
            Последнее обновление: {lastUpdate.toLocaleTimeString("ru-RU")}
          </div>

          {errorText && (
            <div
              style={{
                marginTop: 14,
                padding: 12,
                border: "1px solid #991b1b",
                color: "#991b1b",
                background: "#fef2f2",
                fontSize: 14,
              }}
            >
              {errorText}
            </div>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <Panel
            title="Средняя влажность"
            value={`${averageMoisture.toFixed(1)}%`}
            subtitle="Среднее значение по зонам"
            icon={<Gauge size={20} />}
          />

          <Panel
            title="Насос"
            value={pumpActive ? "Включён" : "Выключен"}
            subtitle={activeZone ? `Поливается зона ${activeZone.id}` : "Полив не выполняется"}
            icon={<Power size={20} />}
          />

          <Panel
            title="Вода в баке"
            value={hasWater ? "Есть" : "Нет"}
            subtitle="Состояние поплавкового датчика"
            icon={<Waves size={20} />}
          />

          <Panel
            title="Аварийный режим"
            value={alarm ? "Активен" : "Нет"}
            subtitle={alarm ? "Недостаточно воды" : "Ошибок не обнаружено"}
            icon={<AlertTriangle size={20} />}
          />

          <Panel
            title="Связь с сервером"
            value={isOnline && serverConnected ? "Есть" : "Нет"}
            subtitle={
              isOnline && serverConnected
                ? "Данные получены с сервера"
                : "Обновление остановлено"
            }
            icon={isOnline && serverConnected ? <Wifi size={20} /> : <WifiOff size={20} />}
          />
        </div>

        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 14 }}>
            Зоны полива
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            {zones.map((zone) => (
              <ZoneCard key={zone.id} zone={zone} />
            ))}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #d1d5db",
            padding: 22,
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>
            Общий график влажности почвы
          </div>

          <div style={{ width: "100%", height: 420 }}>
            <ResponsiveContainer>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis domain={generalChartDomain} unit="%" />
                <Tooltip />
                <Legend />
                <ReferenceLine
                  y={START_THRESHOLD}
                  stroke="#991b1b"
                  strokeDasharray="5 5"
                  label="15% старт"
                />
                <ReferenceLine
                  y={STOP_THRESHOLD}
                  stroke="#166534"
                  strokeDasharray="5 5"
                  label="75% стоп"
                />
                {zones.map((zone) => (
                  <Line
                    key={zone.id}
                    type="monotone"
                    dataKey={`zone${zone.id}`}
                    name={`Зона ${zone.id}`}
                    stroke={COLORS[(zone.id - 1) % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 14 }}>
            Графики по отдельным зонам
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 16,
            }}
          >
            {zones.map((zone) => (
              <ZoneChart key={zone.id} history={history} zoneId={zone.id} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}