import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Droplets, Wifi, WifiOff, Power, AlertTriangle, Activity, Gauge, Waves } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";

const START_THRESHOLD = 15;
const STOP_THRESHOLD = 75;

const initialZones = [
  { id: 1, moisture: 42, valve: false, watering: false },
  { id: 2, moisture: 68, valve: false, watering: false },
  { id: 3, moisture: 22, valve: false, watering: false },
  { id: 4, moisture: 81, valve: false, watering: false },
  { id: 5, moisture: 13, valve: true, watering: true },
  { id: 6, moisture: 55, valve: false, watering: false },
];

function Card({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

function CardContent({ children, className = "" }) {
  return <div className={className}>{children}</div>;
}

function Button({ children, onClick, variant = "default", className = "" }) {
  return (
    <button
      onClick={onClick}
      className={className}
      style={{
        padding: "10px 16px",
        borderRadius: "14px",
        border: variant === "outline" ? "1px solid #cbd5e1" : "none",
        background: variant === "outline" ? "#ffffff" : "#0f172a",
        color: variant === "outline" ? "#0f172a" : "#ffffff",
        cursor: "pointer",
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      {children}
    </button>
  );
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getZoneStatus(zone) {
  if (zone.watering) return "Полив активен";
  if (zone.moisture <= START_THRESHOLD) return "Нужен полив";
  if (zone.moisture >= STOP_THRESHOLD) return "Полив не требуется";
  return "Ожидание";
}

function getStatusClass(zone) {
  if (zone.watering) return "border-blue-400 bg-blue-50";
  if (zone.moisture <= START_THRESHOLD) return "border-red-300 bg-red-50";
  if (zone.moisture >= STOP_THRESHOLD) return "border-emerald-300 bg-emerald-50";
  return "border-slate-200 bg-white";
}

function makePoint(step, zones) {
  const point = { time: `${String(10 + Math.floor(step / 6)).padStart(2, "0")}:${String((step % 6) * 10).padStart(2, "0")}` };
  zones.forEach((z) => {
    point[`zone${z.id}`] = z.moisture;
  });
  return point;
}

export default function IrrigationDashboardDemo() {
  const [zones, setZones] = useState(initialZones);
  const [history, setHistory] = useState(() => [makePoint(0, initialZones)]);
  const [step, setStep] = useState(1);
  const [online, setOnline] = useState(true);
  const [autoMode, setAutoMode] = useState(true);
  const [waterLevel, setWaterLevel] = useState(86);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setZones((current) => {
        let pumpBusy = false;
        const next = current.map((zone) => {
          let watering = zone.watering;

          if (autoMode) {
            if (!watering && zone.moisture <= START_THRESHOLD && !pumpBusy && waterLevel > 10) {
              watering = true;
              pumpBusy = true;
            } else if (watering && zone.moisture >= STOP_THRESHOLD) {
              watering = false;
            } else if (watering) {
              pumpBusy = true;
            }
          }

          const drift = watering ? 7 : -Math.floor(Math.random() * 3);
          const noise = Math.floor(Math.random() * 3) - 1;
          const moisture = clamp(zone.moisture + drift + noise, 5, 95);

          if (moisture >= STOP_THRESHOLD) watering = false;

          return {
            ...zone,
            moisture,
            watering,
            valve: watering,
          };
        });

        setHistory((old) => {
          const updated = [...old, makePoint(step, next)].slice(-18);
          return updated;
        });
        setStep((s) => s + 1);
        setLastUpdate(new Date());
        setWaterLevel((level) => clamp(level - (next.some((z) => z.watering) ? 1 : 0), 0, 100));
        return next;
      });
    }, 2400);

    return () => clearInterval(timer);
  }, [autoMode, step, waterLevel]);

  const pumpActive = zones.some((zone) => zone.watering);
  const averageMoisture = Math.round(zones.reduce((sum, zone) => sum + zone.moisture, 0) / zones.length);
  const activeValves = zones.filter((zone) => zone.valve).length;
  const alarm = waterLevel <= 10;

  const chartLines = useMemo(() => zones.map((zone) => ({ key: `zone${zone.id}`, name: `Зона ${zone.id}` })), [zones]);

  return (
    <div className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white p-6 shadow-sm"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Система автоматического полива</h1>
              <p className="mt-2 text-slate-600">Мониторинг влажности почвы, состояния насоса и клапанов по 6 зонам</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setAutoMode((v) => !v)} className="rounded-2xl px-5">
                <Power className="mr-2 h-4 w-4" />
                {autoMode ? "AUTO" : "MANUAL"}
              </Button>
              <Button variant="outline" onClick={() => setOnline((v) => !v)} className="rounded-2xl px-5">
                {online ? <Wifi className="mr-2 h-4 w-4" /> : <WifiOff className="mr-2 h-4 w-4" />}
                {online ? "Онлайн" : "Не в сети"}
              </Button>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card className="rounded-3xl shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Средняя влажность</p>
                <Gauge className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-3 text-4xl font-bold">{averageMoisture}%</p>
              <p className="mt-2 text-sm text-slate-500">По всем зонам</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Насос</p>
                <Droplets className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-3 text-3xl font-bold">{pumpActive ? "Включён" : "Выключен"}</p>
              <p className="mt-2 text-sm text-slate-500">Активных клапанов: {activeValves}</p>
            </CardContent>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Уровень воды</p>
                <Waves className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-3 text-4xl font-bold">{waterLevel}%</p>
              <p className="mt-2 text-sm text-slate-500">Резервуар</p>
            </CardContent>
          </Card>

          <Card className={`rounded-3xl shadow-sm ${alarm ? "border-red-300 bg-red-50" : ""}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">Аварии</p>
                <AlertTriangle className="h-5 w-5 text-slate-500" />
              </div>
              <p className="mt-3 text-3xl font-bold">{alarm ? "Есть" : "Нет"}</p>
              <p className="mt-2 text-sm text-slate-500">Последнее обновление: {lastUpdate.toLocaleTimeString()}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-6">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-bold">Зоны полива</h2>
                <p className="text-slate-600">Полив включается при влажности 15% и отключается при достижении 75%</p>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-slate-600">
                Порог включения: {START_THRESHOLD}% / порог отключения: {STOP_THRESHOLD}%
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {zones.map((zone) => (
                <motion.div
                  key={zone.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-3xl border p-5 shadow-sm ${getStatusClass(zone)}`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold">Зона {zone.id}</h3>
                      <p className="mt-1 text-sm text-slate-600">{getZoneStatus(zone)}</p>
                    </div>
                    <div className="rounded-2xl bg-white px-3 py-1 text-sm font-semibold shadow-sm">
                      {zone.valve ? "Клапан открыт" : "Клапан закрыт"}
                    </div>
                  </div>

                  <div className="mt-5 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm text-slate-500">Влажность почвы</p>
                      <p className="text-5xl font-bold">{zone.moisture}%</p>
                    </div>
                    <Activity className={`h-10 w-10 ${zone.watering ? "text-blue-500" : "text-slate-400"}`} />
                  </div>

                  <div className="mt-5 h-3 overflow-hidden rounded-full bg-white">
                    <div className="h-full rounded-full bg-slate-900 transition-all duration-700" style={{ width: `${zone.moisture}%` }} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-slate-500">Старт полива</p>
                      <p className="font-bold">≤ {START_THRESHOLD}%</p>
                    </div>
                    <div className="rounded-2xl bg-white p-3">
                      <p className="text-slate-500">Остановка</p>
                      <p className="font-bold">≥ {STOP_THRESHOLD}%</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl shadow-sm">
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold">График влажности по зонам</h2>
            <p className="mt-1 text-slate-600">Демонстрационные данные обновляются автоматически, как будто система передаёт их через ESP8266 и сервер</p>
            <div className="mt-6 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis domain={[0, 100]} unit="%" />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={START_THRESHOLD} label="15% старт" strokeDasharray="4 4" />
                  <ReferenceLine y={STOP_THRESHOLD} label="75% стоп" strokeDasharray="4 4" />
                  {chartLines.map((lineItem) => (
                    <Line key={lineItem.key} type="monotone" dataKey={lineItem.key} name={lineItem.name} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
