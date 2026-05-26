import React, { useEffect, useMemo, useState } from "react";
import { Gauge, Waves, AlertTriangle, Power } from "lucide-react";
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

const WET_TARGET = 80;
const DRY_TARGET = 8;

// Чем больше значение, тем медленнее меняется влажность.
// WET_TAU_SEC = 75 делает рост влажности при поливе медленнее.
// DRY_TAU_SEC = 12000 делает потерю влаги очень плавной.
const WET_TAU_SEC = 140;
const DRY_TAU_SEC = 15000;

// Обновление данных каждые 2 секунды
const TICK_MS = 2000;
const GRAPH_STEP_SECONDS = TICK_MS / 1000;

const COLORS = ["#111827", "#374151", "#4b5563", "#6b7280", "#1f2937", "#525252"];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeInitialZones() {
  return [
    { id: 1, moisture: 43, watering: false, valveOpen: false },
    { id: 2, moisture: 58, watering: false, valveOpen: false },
    { id: 3, moisture: 28, watering: false, valveOpen: false },
    { id: 4, moisture: 67, watering: false, valveOpen: false },
    { id: 5, moisture: 14, watering: true, valveOpen: true },
    { id: 6, moisture: 51, watering: false, valveOpen: false },
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

function getChartDomain(history, keys, padding = 3) {
  const values = [];

  history.forEach((point) => {
    keys.forEach((key) => {
      if (typeof point[key] === "number") {
        values.push(point[key]);
      }
    });
  });

  if (values.length === 0) {
    return [0, 100];
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  return [
    Math.max(0, Math.floor(min - padding)),
    Math.min(100, Math.ceil(max + padding)),
  ];
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
            {zone.moisture.toFixed(1)}%
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
  const [zones, setZones] = useState(makeInitialZones);

  // Поплавковый датчик уровня воды определяет только наличие воды.
  const [hasWater] = useState(true);

  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [graphStep, setGraphStep] = useState(0);

  const [history, setHistory] = useState(() => {
    const initial = makeInitialZones();

    return Array.from({ length: 30 }, (_, i) => ({
      time: `${i * GRAPH_STEP_SECONDS} c`,
      seconds: i * GRAPH_STEP_SECONDS,
      zone1: initial[0].moisture,
      zone2: initial[1].moisture,
      zone3: initial[2].moisture,
      zone4: initial[3].moisture,
      zone5: initial[4].moisture,
      zone6: initial[5].moisture,
    }));
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const dtSec = TICK_MS / 1000;

      setZones((current) => {
        let next = current.map((z) => ({ ...z }));

        let activeIndex = next.findIndex((z) => z.watering);

        if (activeIndex === -1 && hasWater) {
          const dryIndex = next.findIndex((z) => z.moisture <= START_THRESHOLD);
          if (dryIndex !== -1) {
            next[dryIndex].watering = true;
            next[dryIndex].valveOpen = true;
            activeIndex = dryIndex;
          }
        }

        next = next.map((zone, index) => {
          const isWatering = index === activeIndex && zone.watering;

          let newMoisture = zone.moisture;

          if (isWatering && hasWater) {
            const factor = 1 - Math.exp(-dtSec / WET_TAU_SEC);
            newMoisture = zone.moisture + (WET_TARGET - zone.moisture) * factor;
          } else {
            const factor = 1 - Math.exp(-dtSec / DRY_TAU_SEC);
            newMoisture = zone.moisture + (DRY_TARGET - zone.moisture) * factor;
          }

          newMoisture = clamp(newMoisture, 0, 100);

          let watering = zone.watering;
          let valveOpen = zone.valveOpen;

          if (!hasWater) {
            watering = false;
            valveOpen = false;
          }

          if (isWatering && newMoisture >= STOP_THRESHOLD) {
            watering = false;
            valveOpen = false;
          }

          return {
            ...zone,
            moisture: newMoisture,
            watering,
            valveOpen,
          };
        });

        const now = new Date();
        setLastUpdate(now);

        setGraphStep((prev) => {
          const nextStep = prev + GRAPH_STEP_SECONDS;

          setHistory((old) => {
            const point = {
              time: `${nextStep} c`,
              seconds: nextStep,
              zone1: next[0].moisture,
              zone2: next[1].moisture,
              zone3: next[2].moisture,
              zone4: next[3].moisture,
              zone5: next[4].moisture,
              zone6: next[5].moisture,
            };

            return [...old.slice(-59), point];
          });

          return nextStep;
        });

        return next;
      });
    }, TICK_MS);

    return () => clearInterval(timer);
  }, [hasWater]);

  const pumpActive = zones.some((zone) => zone.watering);

  const averageMoisture = useMemo(() => {
    return zones.reduce((sum, z) => sum + z.moisture, 0) / zones.length;
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
          </div>

          <div style={{ marginTop: 12, fontSize: 14, color: "#6b7280" }}>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
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

          <div style={{ fontSize: 15, color: "#6b7280", marginBottom: 18 }}>
            График отображает изменение влажности по зонам в реальном времени, в секундах.
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