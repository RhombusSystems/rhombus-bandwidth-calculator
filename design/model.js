/* Shared bandwidth model — single source of truth for all layout options.
   Extracted verbatim from the validated index.html model (commit 260ca50).
   Do not edit the numbers here without re-deriving them from production data. */

/* ─────────────────────────────────────────────────────────────────────────────
   MEASURED MODEL — derived 2026-07-29 from Rhombus Enterprises production data.

   Two independent sources, cross-validated on 15 of the same physical cameras:

     1. VIDEO_AGENT_LOG "Adjust dash quality to <qp>@<kbps> ... vsrc: N" lines,
        pulled from one online unit of each of 17 models, ~21 h window each.
        Gives each model's encoder tier ladder. ("dash" is the cloud upload
        stream; "realtime" is live-view only and is excluded.)

     2. Console hourly bandwidth export, 7 days, 41 cameras + 7 DR40 readers.
        Gives actual billed upload bytes.

   What the two sources together establish:

     - The dash ladder is a CEILING, not a rate. A camera sits at an idle tier
       (~1200 kbps, qp33) and jumps to an active tier (~3000 kbps, qp26) when
       rmain sees motion.
     - Realized bytes = ceiling × activity, and activity ran 0.001 to 1.06
       across the fleet. A static scene emits almost nothing no matter what the
       encoder is told: a server-room R4 targeting 1204 kbps shipped 4 kbps.
     - Cloud Archiving on/off is the dominant variable — an 18× median swing
       (1047 vs 58 kbps). Retention DURATION (30 d vs 270 d) has no real effect;
       it governs how long footage is stored, not how much is uploaded.

   The previous model used a flat ~400 kbps per camera from
   segment_max_bytes × 8 ÷ server_flush_interval. That is the segment cap, and
   it matched neither source — over-predicting quiet cameras by ~25× and
   under-predicting busy ones by ~5×.
   ───────────────────────────────────────────────────────────────────────────── */

// idleKbps / activeKbps are PER VIDEO SOURCE. vsrc = number of sources.
// src: "log"   = tier ladder read directly from this model's VIDEO_AGENT_LOG
//      "bytes" = no log pull, but real byte data exists for this model
//      "est"   = neither; inherits the standard ladder. Treat as unverified.
const CAMERAS = [
  { model:"DR40", res:"3840×2160", mp:"8.3 MP (4K)", idleKbps:1200, activeKbps:3000, vsrc:1, sold:true,  legacy:false, src:"bytes", note:"Badge reader / intercom. 7 units in the byte export: 2428 / 1127 / 990 kbps with archiving on, 13 / 11 / 9 without." },
  { model:"R100", res:"1920×1080", mp:"2 MP",        idleKbps:1200, activeKbps:3000, vsrc:1, sold:true,  legacy:false, src:"est",   note:"No online unit in the bench org. Standard ladder assumed." },
  { model:"R120", res:"1920×1440", mp:"2 MP",        idleKbps:1200, activeKbps:3000, vsrc:1, sold:true,  legacy:false, src:"log",   note:"Log window ran 34% at the active tier. Real bytes 1137 kbps archiving on, 86 off." },
  { model:"R150", res:"1920×1080", mp:"2 MP",        idleKbps:1200, activeKbps:3000, vsrc:1, sold:true,  legacy:false, src:"log",   note:"Only archive-off sample was 41 kbps — a static arcade cam." },
  { model:"R200", res:"1920×1440", mp:"5 MP",        idleKbps:1200, activeKbps:3000, vsrc:1, sold:true,  legacy:false, src:"log",   note:"4 archive-on units, median 982 kbps." },
  { model:"R230", res:"2592×1944", mp:"3.8 MP",      idleKbps:1200, activeKbps:3000, vsrc:1, sold:true,  legacy:false, src:"log",   note:"3 archive-off units at 16 kbps median — stairwells and exits." },
  { model:"R36S", res:"3520×3520", mp:"12.4 MP (360°)", idleKbps:1200, activeKbps:3000, vsrc:1, sold:true, legacy:false, src:"log", note:"1743 kbps on a busy street with archiving; 398 median without." },
  { model:"R410", res:"3840×2160", mp:"8.3 MP (4K)", idleKbps:1200, activeKbps:3000, vsrc:1, sold:true,  legacy:false, src:"log",   note:"Best log-to-bytes agreement in the set: 1640 predicted vs 1865 actual." },
  { model:"R520", res:"2592×1944", mp:"5 MP",        idleKbps:1200, activeKbps:3000, vsrc:1, sold:true,  legacy:false, src:"log",   note:"1155 kbps archiving on, 169 median off." },
  { model:"R540", res:"3840×2160", mp:"8.3 MP (4K)", idleKbps:1180, activeKbps:2951, vsrc:1, sold:true,  legacy:false, src:"log",   note:"Scaled ladder. Busiest single-sensor camera measured: 2350 kbps." },
  { model:"R545", res:"3840×2160", mp:"8.3 MP (4K)", idleKbps:1160, activeKbps:2900, vsrc:1, sold:true,  legacy:false, src:"log",   note:"Scaled ladder. LPR unit on a rear lot: 944 kbps." },
  { model:"R600", res:"2592×1944", mp:"5 MP ×4",     idleKbps:1200, activeKbps:3000, vsrc:4, sold:true,  legacy:false, src:"log",   note:"4 independent sources. Ceiling 12000 kbps; measured p95 of 11323 confirms it." },
  { model:"R1",   res:"1280×720",  mp:"0.9 MP",      idleKbps:360,  activeKbps:720,  vsrc:1, sold:false, legacy:true,  src:"log",   note:"Legacy firmware logs 'setting single stream' — one encoder feeds local and cloud." },
  { model:"R2",   res:"2592×1944", mp:"2 MP",        idleKbps:786,  activeKbps:1967, vsrc:1, sold:false, legacy:true,  src:"log",   note:"Legacy single-stream ladder. 756 kbps archiving on, 6 off." },
  { model:"R3",   res:"3008×3008", mp:"9 MP (360°)", idleKbps:1200, activeKbps:3000, vsrc:1, sold:false, legacy:true,  src:"log",   note:"4 archive-on units, median 888 kbps." },
  { model:"R4",   res:"3840×2160", mp:"8.3 MP (4K)", idleKbps:1200, activeKbps:3000, vsrc:1, sold:false, legacy:true,  src:"log",   note:"Widest spread in the fleet: 2023 kbps at a front door, 4 kbps in a server room." },
  { model:"R170", res:"1920×1080", mp:"2 MP",        idleKbps:1200, activeKbps:3000, vsrc:1, sold:false, legacy:true,  src:"log",   note:"Only sample had archiving off: 91 kbps against a 3000 kbps ceiling." },
  { model:"R500", res:"3840×2160", mp:"8.3 MP (4K)", idleKbps:1146, activeKbps:2867, vsrc:1, sold:false, legacy:true,  src:"log",   note:"Scaled ladder. Parking entrance with 120 d archiving: 1582 kbps." },
  { model:"R510", res:"3840×2160", mp:"8.3 MP (4K)", idleKbps:748,  activeKbps:1871, vsrc:1, sold:false, legacy:true,  src:"log",   note:"Lowest ladder of the 4K line. 3 archive-on units averaged 1436 kbps — near ceiling." },
];

/* Scene activity: fraction of the model's ceiling actually uploaded.
   Factors are the mean of each empirical quartile band, split by archiving
   state. n = cameras in that band. */
const ACTIVITY = [
  { key:"Low",      archOn:0.193, archOff:0.003, nOn:7,  nOff:3,
    stats:"< 5 persons/hr · < 2 vehicles/hr",
    examples:"Stairwells, server rooms, storage, utility closets, emergency exits" },
  { key:"Moderate", archOn:0.428, archOff:0.021, nOn:14, nOff:7,
    stats:"5 – 50 persons/hr · 2 – 10 vehicles/hr",
    examples:"Office hallways, small retail, side parking, break rooms, lobbies" },
  { key:"High",     archOn:0.838, archOff:0.132, nOn:6,  nOff:3,
    stats:"50+ persons/hr · 10+ vehicles/hr",
    examples:"Main entrances, busy retail, parking lots, kitchens, warehouses" },
];

/* Observed p95-hour to average-hour ratio, by archiving state. Used for peak
   sizing; the result is capped at the ceiling, which no average can exceed. */
const PEAK_RATIO = { on: 2.18, off: 2.99 };

/* AI event-metadata overhead, kbps per camera.

   IMPORTANT: unlike the ceiling and activity figures above, these are NOT
   validated. The byte export reports one total per device, so per-feature cost
   cannot be separated from scene activity — both live inside the activity
   factor. These are the original payload-size estimates, retained because they
   are directionally useful for sizing event-heavy deployments. Isolating any
   one of them needs an A/B on a single camera.

   Timelapse is the exception: it runs a second continuous stream, so it is
   modelled as adding the model's own idle tier rather than a flat number. */
const FEATURES = [
  { name:"Object Search", low:1, mod:3, high:8, indep:false, notes:"Built-in; bounding boxes + confidence per detection" },
  { name:"Face Recognition", low:8, mod:23, high:60, indep:false, notes:"Embedding (~20 KB) + 256×256 crop; scales with traffic" },
  { name:"Person Re-Id", low:5, mod:16, high:40, indep:false, notes:"Reference only - no toggle in calculator" },
  { name:"People Counting", low:0.1, mod:0.1, high:0.2, indep:true, notes:"Aggregated count, periodic upload" },
  { name:"Occupancy Counting", low:0.2, mod:0.3, high:0.5, indep:true, notes:"Per-zone payload every minute" },
  { name:"Cross Counting", low:0.3, mod:1, high:3, indep:false, notes:"Directional crossing event per person" },
  { name:"Color Detection", low:0.2, mod:0.5, high:1, indep:false, notes:"Clothing color tags on Object Search events" },
  { name:"PPE Detection", low:0.5, mod:2, high:6, indep:false, notes:"Vest/helmet/mask flags per detection" },
  { name:"Human Loitering", low:0.05, mod:0.1, high:0.2, indep:false, notes:"Alert-only; very low event rate" },
  { name:"Behavior Detection", low:0.05, mod:0.1, high:0.2, indep:false, notes:"Alert-only upload" },
  { name:"Pose Detection", low:3, mod:11, high:25, indep:false, notes:"Reference only. 17-point skeleton keypoints" },
  { name:"LPR", low:10, mod:40, high:100, indep:false, notes:"Plate crop (~50 KB) + OCR; highest cost" },
  { name:"Vehicle Counting", low:0.1, mod:0.1, high:0.2, indep:true, notes:"Aggregated count only" },
  { name:"Face Counting", low:0.1, mod:0.1, high:0.2, indep:true, notes:"Count only; no embeddings" },
  { name:"Engagement Counting", low:0.2, mod:0.3, high:0.5, indep:true, notes:"Dwell-time analytics, periodic" },
  { name:"Visual Tamper", low:0.02, mod:0.05, high:0.1, indep:false, notes:"Alert-only; negligible" },
  { name:"WDR", low:0, mod:0, high:0, indep:true, notes:"On-device only; zero upload" },
  { name:"Hi-Res Detection", low:0, mod:0, high:0, indep:true, notes:"On-device full-res AI; no upload" },
  { name:"AI Search", low:5, mod:15, high:40, indep:false, notes:"Frame embeddings + metadata for search" },
];

// "archive" and "timelapse" are handled structurally, not as additive overhead.
const TOGGLE_COLS = ["archive","timelapse","faceRecog","lpr","ppe","peopleocc","crosscount","aisearch"];
const OVERHEAD_MAP = {
  faceRecog:  FEATURES.find(f=>f.name==="Face Recognition"),
  lpr:        FEATURES.find(f=>f.name==="LPR"),
  ppe:        FEATURES.find(f=>f.name==="PPE Detection"),
  peopleocc:  FEATURES.find(f=>f.name==="People Counting"),
  crosscount: FEATURES.find(f=>f.name==="Cross Counting"),
  aisearch:   FEATURES.find(f=>f.name==="AI Search"),
};
const OCC_OVERHEAD = FEATURES.find(f=>f.name==="Occupancy Counting");
const OBJ_SEARCH   = FEATURES.find(f=>f.name==="Object Search");

/* ── Engine ───────────────────────────────────────────────────────────────── */

const FEATURE_LABELS = {
  archive:"Cloud Archiving", timelapse:"Timelapse", faceRecog:"Face Recognition",
  lpr:"LPR", ppe:"PPE Detection", peopleocc:"People / Occupancy",
  crosscount:"Cross Counting", aisearch:"AI Search",
};

const state = {
  profile: "Moderate",
  // Archiving defaults on: ships with Enterprise at 30 days, and 27 of the 40
  // cameras in the reference fleet have it enabled.
  cams: CAMERAS.map(() => ({
    qty: 0,
    toggles: { archive:true, timelapse:false, faceRecog:false, lpr:false,
               ppe:false, peopleocc:false, crosscount:false, aisearch:false },
  })),
};

function activityDef() {
  return ACTIVITY.find(a => a.key === state.profile) || ACTIVITY[1];
}

function getOverhead(feat) {
  const p = state.profile;
  return p === "Low" ? feat.low : p === "High" ? feat.high : feat.mod;
}

function calcAIOverhead(idx) {
  let oh = getOverhead(OBJ_SEARCH);
  const t = state.cams[idx].toggles;
  for (const key of TOGGLE_COLS) {
    if (t[key] && OVERHEAD_MAP[key]) {
      oh += getOverhead(OVERHEAD_MAP[key]);
      if (key === "peopleocc") oh += getOverhead(OCC_OVERHEAD);
    }
  }
  return oh;
}

/** Everything a view needs about one model row. */
function camMetrics(idx) {
  const cam = CAMERAS[idx], s = state.cams[idx], act = activityDef();
  const ceiling = cam.activeKbps * cam.vsrc;
  const archive = s.toggles.archive;
  const factor  = archive ? act.archOn : act.archOff;
  const aiKbps  = calcAIOverhead(idx);
  const tlKbps  = s.toggles.timelapse ? cam.idleKbps : 0;
  const videoAvg = ceiling * factor;
  // Peak: average scaled by the observed p95/avg ratio, but a camera can never
  // exceed its own encoder ceiling.
  const videoPeak = Math.min(ceiling, videoAvg * (archive ? PEAK_RATIO.on : PEAK_RATIO.off));
  return {
    idx, cam, qty: s.qty, ceiling, archive, factor, aiKbps, tlKbps,
    videoAvg, videoPeak,
    avgKbps: videoAvg + aiKbps + tlKbps,
    peakKbps: videoPeak + aiKbps + tlKbps,
    activeFeatures: TOGGLE_COLS.filter(k => s.toggles[k]),
  };
}

/** Deployment-wide totals. */
function totals() {
  let cams=0, video=0, tl=0, ai=0, peak=0, ceiling=0, archived=0, models=0;
  CAMERAS.forEach((_, i) => {
    const m = camMetrics(i);
    if (m.qty <= 0) return;
    models++;
    cams += m.qty;
    video += m.videoAvg * m.qty;
    tl += m.tlKbps * m.qty;
    ai += m.aiKbps * m.qty;
    peak += m.peakKbps * m.qty;
    ceiling += m.ceiling * m.qty;
    if (m.archive) archived += m.qty;
  });
  const avgKbps = video + tl + ai;
  const peakMbps = peak / 1000;
  return {
    cams, models, archived,
    avgMbps: avgKbps / 1000,
    peakMbps,
    ceilingMbps: ceiling / 1000,
    // Size the link off measured peak, then add 30% for protocol overhead,
    // retransmits and non-camera traffic sharing the uplink.
    ispMbps: Math.ceil(peakMbps * 1.3 / 50) * 50,
    monthlyTB: avgKbps * 1000 / 8 * 60 * 60 * 24 * 30 / 1e12,
    split: avgKbps > 0
      ? { video: video/avgKbps*100, tl: tl/avgKbps*100, ai: ai/avgKbps*100 }
      : { video: 0, tl: 0, ai: 0 },
  };
}

function setProfile(p) { state.profile = p; render(); }
function setQty(i, v)  { state.cams[i].qty = Math.max(0, parseInt(v) || 0); render(); }
function toggle(i, k)  { state.cams[i].toggles[k] = !state.cams[i].toggles[k]; render(); }
