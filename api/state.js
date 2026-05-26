import { createClient } from "@supabase/supabase-js";

const START_THRESHOLD = 15;
const STOP_THRESHOLD = 75;

const WET_TARGET = 80;
const DRY_TARGET = 8;

const WET_TAU_SEC = 110;
const DRY_TAU_SEC = 12000;

const MAX_DT_SEC = 10;

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function makeInitialState() {
  const zones = [
    { id: 1, moisture: 43, watering: false, valveOpen: false },
    { id: 2, moisture: 58, watering: false, valveOpen: false },
    { id: 3, moisture: 28, watering: false, valveOpen: false },
    { id: 4, moisture: 67, watering: false, valveOpen: false },
    { id: 5, moisture: 14, watering: true, valveOpen: true },
    { id: 6, moisture: 51, watering: false, valveOpen: false },
  ];

  return {
    zones,
    history: [
      {
        time: "0 c",
        seconds: 0,
        zone1: zones[0].moisture,
        zone2: zones[1].moisture,
        zone3: zones[2].moisture,
        zone4: zones[3].moisture,
        zone5: zones[4].moisture,
        zone6: zones[5].moisture,
      },
    ],
    graphStep: 0,
    hasWater: true,
  };
}

function simulateState(data, dtSec) {
  const safeDt = clamp(dtSec, 0, MAX_DT_SEC);

  if (safeDt <= 0) {
    return data;
  }

  const hasWater = data.hasWater !== false;

  let zones = Array.isArray(data.zones) ? data.zones.map((z) => ({ ...z })) : makeInitialState().zones;

  let activeIndex = zones.findIndex((z) => z.watering);

  if (activeIndex === -1 && hasWater) {
    const dryIndex = zones.findIndex((z) => z.moisture <= START_THRESHOLD);
    if (dryIndex !== -1) {
      zones[dryIndex].watering = true;
      zones[dryIndex].valveOpen = true;
      activeIndex = dryIndex;
    }
  }

  zones = zones.map((zone, index) => {
    const isWatering = index === activeIndex && zone.watering;

    let newMoisture = Number(zone.moisture);

    if (Number.isNaN(newMoisture)) {
      newMoisture = 50;
    }

    if (isWatering && hasWater) {
      const factor = 1 - Math.exp(-safeDt / WET_TAU_SEC);
      newMoisture = newMoisture + (WET_TARGET - newMoisture) * factor;
    } else {
      const factor = 1 - Math.exp(-safeDt / DRY_TAU_SEC);
      newMoisture = newMoisture + (DRY_TARGET - newMoisture) * factor;
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

  const graphStep = Math.round((data.graphStep || 0) + safeDt);

  const historyPoint = {
    time: `${graphStep} c`,
    seconds: graphStep,
    zone1: zones[0].moisture,
    zone2: zones[1].moisture,
    zone3: zones[2].moisture,
    zone4: zones[3].moisture,
    zone5: zones[4].moisture,
    zone6: zones[5].moisture,
  };

  const history = Array.isArray(data.history)
    ? [...data.history.slice(-59), historyPoint]
    : [historyPoint];

  return {
    ...data,
    zones,
    history,
    graphStep,
    hasWater,
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { data: row, error } = await supabase
      .from("irrigation_state")
      .select("data, updated_at")
      .eq("id", 1)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const currentData = row?.data || makeInitialState();
    const updatedAt = row?.updated_at ? new Date(row.updated_at).getTime() : Date.now();
    const now = Date.now();

    const dtSec = Math.max(0, (now - updatedAt) / 1000);

    const nextData = simulateState(currentData, dtSec);

    const { error: updateError } = await supabase
      .from("irrigation_state")
      .update({
        data: nextData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({
      ...nextData,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Server error" });
  }
}