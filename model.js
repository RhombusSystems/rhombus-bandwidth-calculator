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
  { model:"R120", res:"1920×1080", mp:"2 MP",        idleKbps:1200, activeKbps:3000, vsrc:1, sold:true,  legacy:false, src:"log",   note:"Log window ran 34% at the active tier. Real bytes 1137 kbps archiving on, 86 off." },
  { model:"R150", res:"1920×1080", mp:"2 MP",        idleKbps:1200, activeKbps:3000, vsrc:1, sold:true,  legacy:false, src:"log",   note:"Only archive-off sample was 41 kbps — a static arcade cam." },
  { model:"R200", res:"2592×1944", mp:"5 MP",        idleKbps:1200, activeKbps:3000, vsrc:1, sold:true,  legacy:false, src:"log",   note:"4 archive-on units, median 982 kbps." },
  { model:"R230", res:"2592×1456", mp:"3.8 MP",      idleKbps:1200, activeKbps:3000, vsrc:1, sold:true,  legacy:false, src:"log",   note:"3 archive-off units at 16 kbps median — stairwells and exits." },
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

/* AI event-metadata overhead, kbps per video source.

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
const FEATURE_KEYS = ["timelapse","faceRecog","lpr","ppe","peopleocc","crosscount","aisearch"];
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


/* ── Engine ───────────────────────────────────────────────────────────────────

   State is per-LOCATION, because bandwidth is a property of an uplink, not of a
   project. A five-site job needs five ISP recommendations, not one; summing them
   into a single number would be meaningless. Each location therefore carries its
   own camera list, scene activity and archiving default, and produces its own
   sizing. Project-level output is a roll-up plus a circuit count.

   Within a location, settings inherit: `location.profile` / `location.archive`
   are the site defaults, and a model's `profile`/`archive` of null means
   "inherit". This keeps the common case to one decision while still letting a
   mixed site be described, which matters because archiving is an 18x lever.
   ─────────────────────────────────────────────────────────────────────────── */

const FEATURE_LABELS = {
  archive:"Cloud Archiving", timelapse:"Timelapse", faceRecog:"Face Recognition",
  lpr:"LPR", ppe:"PPE Detection", peopleocc:"People / Occupancy",
  crosscount:"Cross Counting", aisearch:"AI Search",
};

/* v2 keys saved cameras by MODEL NAME rather than array index. v1 stored an
   index-aligned array, which silently corrupted a saved project whenever the
   catalogue changed: removing R100 shifted every model after it by one, so a
   saved R120 quantity would reappear as R150. LEGACY_ORDER_V1 exists only to
   migrate those payloads once — do not edit it. */
const STORE_KEY = 'bw-project-v3';
const LEGACY_KEY_V2 = 'bw-project-v2';
const LEGACY_KEY_V1 = 'bw-project-v1';
const LEGACY_ORDER_V1 = ['DR40','R100','R120','R150','R200','R230','R36S','R410','R520',
                         'R540','R545','R600','R1','R2','R3','R4','R170','R500','R510'];

function newLocation(name) {
  return {
    name,
    profile: "Moderate",
    // Archiving defaults on: it ships with Enterprise at 30 days, and 27 of the
    // 40 cameras in the reference fleet have it enabled.
    archive: true,
    features: Object.fromEntries(FEATURE_KEYS.map(k => [k, false])),
    cams: CAMERAS.map(() => ({
      qty: 0,
      profile: null,   // null = inherit this location's activity
      archive: null,   // null = inherit this location's archiving
      toggles: Object.fromEntries(FEATURE_KEYS.map(k => [k, null])),
    })),
  };
}

const state = {
  title: "",
  active: 0,
  locations: [ newLocation("Main site") ],
};

/** The location a view is currently editing. */
function loc(li) { return state.locations[li === undefined ? state.active : li]; }

function siteActivity(li) {
  const l = loc(li);
  return ACTIVITY.find(a => a.key === l.profile) || ACTIVITY[1];
}

/** Effective activity band for one model at one location, honouring overrides. */
function activityFor(idx, li) {
  const l = loc(li);
  const key = l.cams[idx].profile || l.profile;
  return ACTIVITY.find(a => a.key === key) || ACTIVITY[1];
}

/** Effective archiving state for one model at one location. */
function archiveFor(idx, li) {
  const l = loc(li);
  const o = l.cams[idx].archive;
  return o === null ? l.archive : o;
}

/** Effective feature state for one model. A null camera value inherits the site. */
function featureFor(idx, key, li) {
  const l = loc(li), value = l.cams[idx].toggles[key];
  return value === null ? !!l.features[key] : !!value;
}

/** True when this model differs from its location's defaults. */
function isOverridden(idx, li) {
  const l = loc(li), c = l.cams[idx];
  if (c.profile !== null || c.archive !== null) return true;
  return FEATURE_KEYS.some(k => c.toggles[k] !== null);
}

function getOverhead(feat, idx, li) {
  const p = activityFor(idx, li).key;
  return p === "Low" ? feat.low : p === "High" ? feat.high : feat.mod;
}

function calcAIOverhead(idx, li) {
  let oh = getOverhead(OBJ_SEARCH, idx, li);
  for (const key of FEATURE_KEYS) {
    if (featureFor(idx, key, li) && OVERHEAD_MAP[key]) {
      oh += getOverhead(OVERHEAD_MAP[key], idx, li);
      if (key === "peopleocc") oh += getOverhead(OCC_OVERHEAD, idx, li);
    }
  }
  return oh * CAMERAS[idx].vsrc;
}

/** Everything a view needs about one model row at one location. */
function camMetrics(idx, li) {
  const cam = CAMERAS[idx], s = loc(li).cams[idx], act = activityFor(idx, li);
  const ceiling = cam.activeKbps * cam.vsrc;
  const archive = archiveFor(idx, li);
  const factor  = archive ? act.archOn : act.archOff;
  const aiKbps  = calcAIOverhead(idx, li);
  const tlKbps  = featureFor(idx, "timelapse", li) ? cam.idleKbps * cam.vsrc : 0;
  const videoAvg = ceiling * factor;
  // Peak: average scaled by the observed p95/avg ratio, but a camera can never
  // exceed its own encoder ceiling.
  const videoPeak = Math.min(ceiling, videoAvg * (archive ? PEAK_RATIO.on : PEAK_RATIO.off));
  return {
    idx, cam, qty: s.qty, ceiling, archive, factor, aiKbps, tlKbps,
    videoAvg, videoPeak, activityKey: act.key, overridden: isOverridden(idx, li),
    avgKbps: videoAvg + aiKbps + tlKbps,
    peakKbps: videoPeak + aiKbps + tlKbps,
    activeFeatures: FEATURE_KEYS.filter(k => featureFor(idx, k, li)),
  };
}

const MONTH_SECS = 60 * 60 * 24 * 30;

/** Totals for a single location — this is what sizes that site's circuit. */
function totals(li) {
  let cams=0, video=0, tl=0, ai=0, peak=0, ceiling=0, archived=0, models=0, tuned=0;
  CAMERAS.forEach((_, i) => {
    const m = camMetrics(i, li);
    if (m.qty <= 0) return;
    models++; cams += m.qty;
    video += m.videoAvg * m.qty;
    tl += m.tlKbps * m.qty;
    ai += m.aiKbps * m.qty;
    peak += m.peakKbps * m.qty;
    // "All saturated" must include the always-on timelapse stream and AI
    // metadata, else it can read below the busy-hour peak (which does include
    // them) — a camera's true simultaneous max is video ceiling + TL + AI.
    ceiling += (m.ceiling + m.tlKbps + m.aiKbps) * m.qty;
    if (m.archive) archived += m.qty;
    if (m.overridden) tuned++;
  });
  const avgKbps = video + tl + ai;
  const peakMbps = peak / 1000;
  return {
    li: li === undefined ? state.active : li,
    name: loc(li).name, cams, models, archived, tuned,
    avgMbps: avgKbps / 1000,
    peakMbps,
    ceilingMbps: ceiling / 1000,
    // Size the link off measured peak, then add 30% for protocol overhead and
    // retransmits. Capacity for unrelated site traffic is not included.
    ispMbps: cams ? Math.ceil(peakMbps * 1.3 / 50) * 50 : 0,
    monthlyTB: avgKbps * 1000 / 8 * MONTH_SECS / 1e12,
    split: avgKbps > 0
      ? { video: video/avgKbps*100, tl: tl/avgKbps*100, ai: ai/avgKbps*100 }
      : { video: 0, tl: 0, ai: 0 },
  };
}

/** Project roll-up. Note ispMbps is a SUM OF SEPARATE CIRCUITS, not one link. */
function grandTotals() {
  const per = state.locations.map((_, i) => totals(i));
  const live = per.filter(t => t.cams > 0);
  return {
    perLocation: per,
    liveLocations: live,
    locations: state.locations.length,
    circuits: live.length,
    cams: per.reduce((n,t) => n + t.cams, 0),
    archived: per.reduce((n,t) => n + t.archived, 0),
    avgMbps: per.reduce((n,t) => n + t.avgMbps, 0),
    peakMbps: per.reduce((n,t) => n + t.peakMbps, 0),
    monthlyTB: per.reduce((n,t) => n + t.monthlyTB, 0),
    ispTotalMbps: per.reduce((n,t) => n + t.ispMbps, 0),
  };
}

/* ── mutations ─────────────────────────────────────────────────────────────── */
function setProfile(p)     { loc().profile = p; commit(); }
const MAX_QTY = 100000;
function normaliseQty(v) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(MAX_QTY, Math.max(0, Math.trunc(n))) : 0;
}
function setQty(i, v)      { loc().cams[i].qty = normaliseQty(v); commit(); }
function incrementQty(i,d) { setQty(i, loc().cams[i].qty + d); }
function toggle(i, k) {
  if (!FEATURE_KEYS.includes(k)) return;
  const next = !featureFor(i, k);
  loc().cams[i].toggles[k] = next === loc().features[k] ? null : next;
  commit();
}
function setSiteFeature(k, enabled) {
  if (!FEATURE_KEYS.includes(k)) return;
  loc().features[k] = !!enabled;
  commit();
}
function setSiteArchive(a) { loc().archive = a; commit(); }
function setCamProfile(i,p){ loc().cams[i].profile = p; commit(); }   // null = inherit
function setCamArchive(i,a){ loc().cams[i].archive = a; commit(); }   // null = inherit
function clearOverride(i) {
  const c = loc().cams[i];
  c.profile = null; c.archive = null;
  FEATURE_KEYS.forEach(k => c.toggles[k] = null);
  commit();
}
function setTitle(t) { state.title = t; save(); }

function addLocation(name) {
  state.locations.push(newLocation(name || `Location ${state.locations.length + 1}`));
  state.active = state.locations.length - 1;
  commit();
}
function renameLocation(li, name) { state.locations[li].name = name || 'Untitled'; commit(); }
function removeLocation(li) {
  if (state.locations.length === 1) return false;   // never leave zero locations
  state.locations.splice(li, 1);
  if (state.active >= state.locations.length) state.active = state.locations.length - 1;
  commit();
  return true;
}
function selectLocation(li) { state.active = li; commit(); }
function duplicateLocation(li) {
  const copy = JSON.parse(JSON.stringify(state.locations[li]));
  copy.name = `${copy.name} (copy)`;
  state.locations.splice(li + 1, 0, copy);
  state.active = li + 1;
  commit();
}

/* ── persistence ───────────────────────────────────────────────────────────── */
function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      v: 3, title: state.title, active: state.active,
      locations: state.locations.map(l => ({
        name: l.name, profile: l.profile, archive: l.archive, features: l.features,
        // Keyed by model name so the catalogue can gain or lose models without
        // corrupting saved quantities. Only non-default entries are written.
        cams: l.cams.reduce((o, c, i) => {
          if (c.qty || c.profile !== null || c.archive !== null
              || FEATURE_KEYS.some(k => c.toggles[k] !== null)) {
            o[CAMERAS[i].model] = { qty:c.qty, profile:c.profile, archive:c.archive,
              toggles:Object.fromEntries(FEATURE_KEYS
                .filter(k => c.toggles[k] !== null)
                .map(k => [k, c.toggles[k]])) };
          }
          return o;
        }, {}),
      })),
    }));
  } catch (e) { /* private browsing, quota — not worth surfacing */ }
}

/** Copy one saved camera entry onto a fresh location slot, validating as it goes
    so a hand-edited or stale payload cannot inject bad state. */
function applyCam(slot, c, legacyToggles = false) {
  if (!c) return;
  slot.qty = normaliseQty(c.qty);
  slot.profile = ACTIVITY.some(a => a.key === c.profile) ? c.profile : null;
  slot.archive = typeof c.archive === 'boolean' ? c.archive : null;
  if (c.toggles) FEATURE_KEYS.forEach(k => {
    if (legacyToggles) slot.toggles[k] = !!c.toggles[k];
    else slot.toggles[k] = typeof c.toggles[k] === 'boolean' ? c.toggles[k] : null;
  });
}

/** Restore a saved project. Reads v2 (model-keyed) and migrates v1 (index-keyed)
    through LEGACY_ORDER_V1, so upgrading does not lose an in-progress quote. */
function load() {
  let raw, source = 'v3';
  try {
    raw = localStorage.getItem(STORE_KEY);
    if (!raw) { raw = localStorage.getItem(LEGACY_KEY_V2); source = 'v2'; }
    if (!raw) { raw = localStorage.getItem(LEGACY_KEY_V1); source = 'v1'; }
  } catch (e) { return false; }
  if (!raw) return false;
  let d;
  try { d = JSON.parse(raw); } catch (e) { return false; }
  if (!d || !Array.isArray(d.locations) || !d.locations.length) return false;

  const byModel = {};
  CAMERAS.forEach((c, i) => byModel[c.model] = i);

  state.title = typeof d.title === 'string' ? d.title : '';
  state.locations = d.locations.map(src => {
    const l = newLocation(typeof src.name === 'string' ? src.name : 'Main site');
    if (ACTIVITY.some(a => a.key === src.profile)) l.profile = src.profile;
    if (typeof src.archive === 'boolean') l.archive = src.archive;

    if (source === 'v3' && src.features && typeof src.features === 'object') {
      FEATURE_KEYS.forEach(k => { l.features[k] = !!src.features[k]; });
    }

    if (Array.isArray(src.cams)) {
      // v1: positional. Resolve each slot through the order it was written with,
      // then look the model up by name. Entries for removed models are dropped.
      src.cams.forEach((c, i) => {
        const model = LEGACY_ORDER_V1[i];
        const target = model === undefined ? undefined : byModel[model];
        if (target !== undefined) applyCam(l.cams[target], c, true);
      });
    } else if (src.cams && typeof src.cams === 'object') {
      // v2/v3: model-keyed.
      Object.entries(src.cams).forEach(([model, c]) => {
        const target = byModel[model];
        if (target !== undefined) applyCam(l.cams[target], c, source !== 'v3');
      });
    }

    if (source !== 'v3') {
      // Old payloads stored effective booleans on every camera. Promote a value
      // shared by the entire catalogue to the site default, retaining only real
      // per-camera differences as overrides.
      FEATURE_KEYS.forEach(k => {
        const siteValue = l.cams.every(c => c.toggles[k] === true);
        l.features[k] = siteValue;
        l.cams.forEach(c => { c.toggles[k] = c.toggles[k] === siteValue ? null : c.toggles[k]; });
      });
    }
    return l;
  });
  state.active = Math.min(Math.max(0, parseInt(d.active) || 0), state.locations.length - 1);
  if (source !== 'v3') save();              // rewrite once and stop re-migrating
  return true;
}

function clearProject() {
  state.title = '';
  state.locations = [ newLocation('Main site') ];
  state.active = 0;
  commit();
}

/** Persist, then let the view redraw. `render` is defined by whichever page
    loaded this model. */
function commit() { save(); if (typeof render === 'function') render(); }
