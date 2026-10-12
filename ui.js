const AI = { timelapse:"Timelapse", faceRecog:"Face Recognition", lpr:"LPR", ppe:"PPE",
             peopleocc:"People / Occupancy", crosscount:"Cross Counting", aisearch:"AI Search" };
const AI_KEYS = Object.keys(AI);
const openRows = new Set();

function setPressed(element, pressed) {
  element.classList.toggle('on', pressed);
  element.setAttribute('aria-pressed', String(pressed));
}

/* ── step 1 ─────────────────────────────────────────────────────────────── */
function buildPicks(filter = '') {
  const f = filter.trim().toLowerCase();
  const hit = c => !f || c.model.toLowerCase().includes(f) || c.mp.toLowerCase().includes(f)
                 || c.res.toLowerCase().includes(f)
                 || (c.vsrc > 1 && ('multisensor'.includes(f) || 'multi'.includes(f)));
  let html = '', divided = false;
  CAMERAS.forEach((cam, i) => {
    if (!hit(cam)) return;
    if (cam.legacy && !divided) {
      divided = true;
      html += `<div class="divider-lbl lbl">Legacy / discontinued</div>`;
    }
    const est = cam.src === 'est'
      ? '<span class="est" title="No log or byte data for this model — standard ladder assumed">◇ est</span>' : '';
    html += `
      <div class="pick ${cam.legacy?'legacy':''} ${openRows.has(i)?'open':''}" data-i="${i}">
        <div class="pk-main">
          <div class="pk-id">
            <div class="pk-m">${cam.model} ${est}<span id="bdg${i}"></span></div>
            <div class="pk-s">${cam.mp} · ${(cam.activeKbps*cam.vsrc).toLocaleString()} kbps ceiling${cam.vsrc>1?` · ${cam.vsrc} sources`:''}</div>
          </div>
          <div class="qbox">
            <button onclick="bump(${i},-1)" aria-label="Fewer ${cam.model}">–</button>
            <input type="number" min="0" max="100000" value="${loc().cams[i].qty}" id="q${i}"
                   oninput="setQty(${i},this.value)" aria-label="${cam.model} quantity">
            <button onclick="bump(${i},1)" aria-label="More ${cam.model}">+</button>
          </div>
        </div>
        <button class="pk-tune" onclick="flipRow(${i})" aria-expanded="${openRows.has(i)}"
                aria-controls="drawer${i}">
          Tune <span class="pk-state" id="st${i}"></span>
          <span class="chev">▼</span>
        </button>
        <div class="drawer" id="drawer${i}">
          <div class="d-grp">
            <span class="lbl">Cloud archiving</span>
            <div class="mini" id="da${i}" role="group" aria-label="${cam.model} cloud archiving">
              <button aria-pressed="false" onclick="setCamArchive(${i},null)">Site default</button>
              <button class="warm" aria-pressed="false" onclick="setCamArchive(${i},true)">On</button>
              <button aria-pressed="false" onclick="setCamArchive(${i},false)">Off</button>
            </div>
          </div>
          <div class="d-grp">
            <span class="lbl">Scene activity</span>
            <div class="mini" id="dp${i}" role="group" aria-label="${cam.model} scene activity">
              <button aria-pressed="false" onclick="setCamProfile(${i},null)">Site default</button>
              ${ACTIVITY.map(a => `<button aria-pressed="false" onclick="setCamProfile(${i},'${a.key}')">${a.key}</button>`).join('')}
            </div>
          </div>
          <div class="d-grp">
            <span class="lbl">Features on this model</span>
            <div class="mini" id="df${i}" role="group" aria-label="${cam.model} features">
              ${AI_KEYS.map(k => `<button aria-pressed="false" data-k="${k}" onclick="toggle(${i},'${k}')">${AI[k]}</button>`).join('')}
            </div>
          </div>
          <div class="d-out">
            <span>Per camera <b id="pc${i}">—</b> avg · <b id="pp${i}">—</b> peak</span>
            <button class="d-reset" onclick="clearOverride(${i})">reset to site</button>
          </div>
        </div>
      </div>`;
  });
  document.getElementById('picks').innerHTML = html ||
    `<div style="padding:18px;text-align:center;color:var(--ink-3);font-size:.82rem">No models match “${esc(filter)}”.</div>`;
  render();
}

function bump(i, d) {
  incrementQty(i, d);
}
function flipRow(i) {
  openRows.has(i) ? openRows.delete(i) : openRows.add(i);
  const el = document.querySelector(`.pick[data-i="${i}"]`);
  if (el) {
    el.classList.toggle('open', openRows.has(i));
    el.querySelector('.pk-tune').setAttribute('aria-expanded', openRows.has(i));
  }
}

/* ── locations ──────────────────────────────────────────────────────────── */
function buildLocbar() {
  const g = grandTotals();
  document.getElementById('locbar').innerHTML =
    state.locations.map((l, i) => {
      const t = g.perLocation[i];
      return `<button class="loctab ${i===state.active?'on':''}" aria-pressed="${i===state.active}"
                onclick="selectLocation(${i})"
                title="${esc(l.name)}">
        <span>${esc(l.name)}</span>
        <span class="n">${t.cams ? t.cams + ' cam' + (t.cams===1?'':'s') : 'empty'}</span>
      </button>`;
    }).join('') +
    `<button class="loc-add" onclick="promptAddLocation()">+ Location</button>`;

  document.getElementById('loctools').innerHTML = `
    <button class="loc-tool" onclick="promptRenameLocation()">Rename this site</button>
    <button class="loc-tool" onclick="duplicateLocation(${state.active})">Duplicate</button>
    ${state.locations.length > 1
      ? `<button class="loc-tool danger" onclick="promptRemoveLocation()">Delete</button>` : ''}
    <button class="loc-tool danger" onclick="promptClear()">Clear project</button>`;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function promptAddLocation() {
  const n = prompt('Name of the new location?', `Location ${state.locations.length + 1}`);
  if (n !== null) addLocation(n.trim());
}
function promptRenameLocation() {
  const n = prompt('Rename this location:', loc().name);
  if (n !== null) renameLocation(state.active, n.trim());
}
function promptRemoveLocation() {
  const t = totals();
  const warn = t.cams
    ? `Delete “${loc().name}” and its ${t.cams} camera${t.cams===1?'':'s'}?`
    : `Delete “${loc().name}”?`;
  if (confirm(warn)) removeLocation(state.active);
}
function promptClear() {
  if (confirm('Clear the whole project — title and every location? This cannot be undone.'))
    clearProject();
}

/* ── step 2 ─────────────────────────────────────────────────────────────── */
function buildOpts() {
  document.getElementById('opts').innerHTML = ACTIVITY.map(a => `
    <button class="opt" role="radio" aria-checked="false" data-k="${a.key}" onclick="setProfile('${a.key}')">
      <span class="radio"></span>
      <span>
        <span class="o-t">${a.key}</span>
        <span class="o-d">${a.examples}</span>
        <span class="o-f">${a.stats} · uploads ${(a.archOn*100).toFixed(1)}% of ceiling archived,
          ${(a.archOff*100).toFixed(1)}% not (n=${a.nOn}/${a.nOff})</span>
      </span>
    </button>`).join('');
  document.getElementById('fgrid').innerHTML = AI_KEYS.map(k =>
    `<button class="fpill" aria-pressed="false" data-k="${k}" onclick="flipSiteAI('${k}')">${AI[k]}</button>`).join('');
}

function flipSiteAI(k) {
  setSiteFeature(k, !loc().features[k]);
}

/* ── reference ──────────────────────────────────────────────────────────── */
function buildRef() {
  let html = '', divided = false;
  CAMERAS.forEach(c => {
    if (c.legacy && !divided) {
      divided = true;
      html += `<tr><td colspan="8" class="lbl" style="padding-top:13px">Legacy / discontinued</td></tr>`;
    }
    const ev = { log:'Log + bytes', bytes:'Bytes only', est:'Estimated' }[c.src];
    html += `<tr class="${c.legacy?'leg':''}">
      <td style="font-weight:600">${c.model}</td><td>${c.res}</td>
      <td class="n">${c.idleKbps}</td><td class="n">${c.activeKbps}</td>
      <td class="n">${c.vsrc}</td><td class="n"><b>${(c.activeKbps*c.vsrc).toLocaleString()}</b></td>
      <td><span class="ev ${c.src}">${ev}</span></td>
      <td class="note">${c.note}</td></tr>`;
  });
  document.getElementById('ref-body').innerHTML = html;
}

/* ── step 3 ─────────────────────────────────────────────────────────────── */
function renderResult() {
  const t = totals();
  const el = document.getElementById('result');
  ['pip0','pip1','pip2'].forEach(id => document.getElementById(id).className = 'pip');
  if (!t.cams) {
    document.getElementById('pip0').className = 'pip now';
    el.innerHTML = `<div class="empty-res">Nothing configured yet.<br>
      Add at least one camera in step one and the sizing appears here.</div>`;
    return;
  }
  document.getElementById('pip0').className = 'pip done';
  document.getElementById('pip1').className = 'pip done';
  document.getElementById('pip2').className = 'pip now';

  const tuned = t.tuned;
  const mixed = t.archived > 0 && t.archived < t.cams;

  el.innerHTML = `
    <div class="hero">
      <div class="result-eyebrow">Recommended upload</div>
      <div class="answer-line"><div class="v">${t.ispMbps}</div>
      <div class="u">Mbps<br><span>minimum</span></div></div>
      <div class="sub">busy-hour peak &times;1.3 for protocol and retransmits, rounded up to 50</div>
    </div>
    <div class="facts">
      <div class="fact"><span class="lbl">Busy-hour peak</span>
        <div class="v">${t.peakMbps.toFixed(1)}</div><span class="u">Mbps</span></div>
      <div class="fact"><span class="lbl">Sustained average</span>
        <div class="v">${t.avgMbps.toFixed(1)}</div><span class="u">Mbps</span></div>
      <div class="fact"><span class="lbl">If all saturate at once</span>
        <div class="v">${t.ceilingMbps.toFixed(1)}</div><span class="u">Mbps absolute max</span></div>
      <div class="fact"><span class="lbl">Monthly volume</span>
        <div class="v">${t.monthlyTB.toFixed(2)}</div><span class="u">TB uploaded</span></div>
    </div>
    <div class="split">
      <span class="lbl">What's using it</span>
      <div class="sbar">
        <span style="width:${t.split.video}%;background:var(--teal)"></span>
        <span style="width:${t.split.tl}%;background:var(--clay)"></span>
        <span style="width:${t.split.ai}%;background:var(--sand)"></span>
      </div>
      <div class="skey">
        <span><i style="background:var(--teal)"></i>Video ${t.split.video.toFixed(1)}%</span>
        <span><i style="background:var(--clay)"></i>Timelapse ${t.split.tl.toFixed(1)}%</span>
        <span><i style="background:var(--sand)"></i>Events ${t.split.ai.toFixed(1)}%</span>
      </div>
    </div>
    <div class="callout ${mixed?'warn':''}">
      <strong>${t.cams} cameras</strong> across ${t.models} model${t.models===1?'':'s'} ·
      <strong>${t.archived}</strong> archiving to cloud (${Math.round(t.archived/t.cams*100)}%)${
        tuned ? ` · ${tuned} model${tuned===1?'':'s'} tuned away from the site default` : ''}.
      ${mixed
        ? `This is a mixed site. Archived cameras uploaded a median 1047 kbps in production and
           non-archived just 58 kbps, so which cameras carry archiving moves this number more than
           any other choice on the page.`
        : `In the measured fleet, archived cameras uploaded a median 1047 kbps and non-archived just
           58 kbps — which is why that switch moves this number more than anything else here.`}
    </div>
    <div class="actions">
      <button class="btn" onclick="printDoc()">Print customer estimate</button>
      <button class="btn ghost" id="copy-summary" onclick="copySummary()">Copy summary</button>
      <button class="btn ghost" onclick="exportCSV()">Export CSV</button>
    </div>`;
}

function renderRollup() {
  const g = grandTotals();
  const card = document.getElementById('rollup-card');
  // Only meaningful once there is more than one location.
  if (state.locations.length < 2) { card.style.display = 'none'; return; }
  card.style.display = '';
  document.getElementById('rollup').innerHTML =
    g.perLocation.map((t, i) => `
      <div class="rl-row">
        <span class="nm">${esc(t.name)}
          <small>${t.cams ? `${t.cams} camera${t.cams===1?'':'s'} · ${t.archived} archiving · ${t.avgMbps.toFixed(1)} Mbps sustained` : 'no cameras yet'}</small>
        </span>
        <span class="mb">${t.ispMbps ? t.ispMbps + ' Mbps' : '—'}</span>
      </div>`).join('') + `
      <div class="rl-row tot">
        <span class="nm">Project total
          <small>${g.cams} camera${g.cams===1?'':'s'} · ${g.monthlyTB.toFixed(2)} TB/month</small>
        </span>
        <span class="mb">${g.ispTotalMbps} Mbps</span>
      </div>
      <p class="rl-note">Across <strong>${g.circuits}</strong> independent
        circuit${g.circuits===1?'':'s'} — not one shared link. Order each site's connection to its
        own figure above.</p>`;
}

/* ── exports ──────────────────────────────────────────────────────────────
   All three exports cover every location, not just the one on screen. */
function rowsFor(li) {
  return CAMERAS.map((_, i) => camMetrics(i, li)).filter(m => m.qty > 0);
}
function featureList(m) {
  const f = m.activeFeatures.map(k => AI[k]);
  return (m.archive ? ['Cloud Archive'] : []).concat(f).join(', ') || 'Event-only, no features';
}
function projectName() { return state.title.trim() || 'Untitled project'; }
function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,48) || 'project';
}
const BASIS = 'Measured Rhombus production traffic: VIDEO_AGENT_LOG encoder ladders (17 models) + 7-day hourly byte export (48 devices)';

function exportCSV() {
  const g = grandTotals();
  const stamp = new Date().toISOString().slice(0,10);
  const rows = [];
  rows.push(['Rhombus Bandwidth Estimate']);
  rows.push(['Project', projectName()]);
  rows.push(['Date', stamp]);
  rows.push(['Locations', state.locations.length]);
  rows.push(['Circuits required', g.circuits]);
  rows.push([]);

  state.locations.forEach((l, li) => {
    const t = g.perLocation[li];
    rows.push([`LOCATION: ${l.name}`]);
    if (!t.cams) { rows.push(['(no cameras configured)']); rows.push([]); return; }
    rows.push(['Scene activity', l.profile, 'Cloud archiving', l.archive ? 'ON' : 'OFF']);
    rows.push(['Model','Qty','Cloud Archive','Scene Activity','Features','Ceiling (kbps)',
               'Activity (%)','Event Overhead (kbps)','Avg/Cam (kbps)','Peak/Cam (kbps)','Subtotal (Mbps)']);
    rowsFor(li).forEach(m => rows.push([
      m.cam.model, m.qty, m.archive ? 'ON' : 'OFF',
      m.activityKey + (m.overridden ? ' (tuned)' : ''), featureList(m),
      m.ceiling.toFixed(0), (m.factor*100).toFixed(1), (m.aiKbps + m.tlKbps).toFixed(1),
      m.avgKbps.toFixed(0), m.peakKbps.toFixed(0), (m.avgKbps*m.qty/1000).toFixed(2),
    ]));
    rows.push(['Cameras', t.cams, '', '', '', '', '', '', '', '', t.avgMbps.toFixed(2)]);
    rows.push(['Cameras archiving', t.archived]);
    rows.push(['Sustained average (Mbps)', t.avgMbps.toFixed(1)]);
    rows.push(['Busy-hour peak (Mbps)', t.peakMbps.toFixed(1)]);
    rows.push(['If all saturate at once (Mbps)', t.ceilingMbps.toFixed(1)]);
    rows.push(['Monthly volume (TB)', t.monthlyTB.toFixed(2)]);
    rows.push(['RECOMMENDED UPLINK (Mbps)', t.ispMbps]);
    rows.push([]);
  });

  rows.push(['PROJECT TOTALS']);
  rows.push(['Location','Cameras','Archiving','Sustained (Mbps)','Peak (Mbps)','Monthly (TB)','Uplink (Mbps)']);
  g.perLocation.forEach(t => rows.push([t.name, t.cams, t.archived,
    t.avgMbps.toFixed(1), t.peakMbps.toFixed(1), t.monthlyTB.toFixed(2), t.ispMbps || '—']));
  rows.push(['TOTAL', g.cams, g.archived, g.avgMbps.toFixed(1), g.peakMbps.toFixed(1),
             g.monthlyTB.toFixed(2), g.ispTotalMbps]);
  rows.push([]);
  rows.push(['NOTE', `Uplink figures are per-location and size separate circuits. The ${g.ispTotalMbps} Mbps total is the sum of ${g.circuits} independent connection${g.circuits===1?'':'s'}, not one shared link.`]);
  rows.push(['Model basis', BASIS]);

  const csv = BandwidthExport.encodeCSV(rows);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}));
  a.download = `${slug(projectName())}-bandwidth-${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 0);
}

async function copySummary() {
  const g = grandTotals();
  const pad = (s,n) => String(s).padEnd(n);
  const lines = [
    `${projectName()} — Rhombus bandwidth estimate`,
    `${new Date().toLocaleDateString()} · ${state.locations.length} location${state.locations.length===1?'':'s'} · ${g.circuits} circuit${g.circuits===1?'':'s'}`,
  ];
  state.locations.forEach((l, li) => {
    const t = g.perLocation[li];
    lines.push('', `── ${l.name} ──`);
    if (!t.cams) { lines.push('  (no cameras configured)'); return; }
    lines.push(`  ${l.profile} activity, archiving ${l.archive ? 'on' : 'off'}`);
    lines.push(`  ${t.cams} cameras across ${t.models} model${t.models===1?'':'s'} (${t.archived} archiving)`);
    lines.push(`  Recommended uplink:  ${t.ispMbps} Mbps`);
    lines.push(`  Busy-hour peak:      ${t.peakMbps.toFixed(1)} Mbps`);
    lines.push(`  Sustained average:   ${t.avgMbps.toFixed(1)} Mbps`);
    lines.push(`  Monthly volume:      ${t.monthlyTB.toFixed(2)} TB`);
    rowsFor(li).forEach(m => lines.push(
      `    ${pad(m.cam.model,6)} x${pad(m.qty,4)} ${Math.round(m.avgKbps)} kbps avg, ${Math.round(m.peakKbps)} peak` +
      `  [${featureList(m)}${m.overridden ? `; ${m.activityKey}, tuned` : ''}]`));
  });
  if (g.circuits > 1) {
    lines.push('', '── Project total ──');
    lines.push(`  ${g.cams} cameras · ${g.monthlyTB.toFixed(2)} TB/month`);
    lines.push(`  ${g.ispTotalMbps} Mbps across ${g.circuits} separate circuits (not one link)`);
  }
  const button = document.getElementById('copy-summary');
  if (!button) return;
  const was = button.textContent;
  try {
    await navigator.clipboard.writeText(lines.join('\n'));
    button.textContent = 'Copied';
  } catch (error) {
    button.textContent = 'Copy failed';
  }
  setTimeout(() => { button.textContent = was; }, 1400);
}

/* Print document — rebuilt before every print so it can never go stale, and
   covering all locations since the screen only shows one. */
function renderPrintDoc() {
  const g = grandTotals();
  const date = new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});
  const num = (k,v,u,key) => `<div class="p-num ${key?'key':''}">
    <div class="k">${k}</div><div class="v">${v}</div><div class="u">${u}</div></div>`;

  let html = `<div class="p-title">${esc(projectName())}</div>
    <div class="p-meta">Rhombus upload bandwidth estimate &middot; ${date}
      &middot; ${state.locations.length} location${state.locations.length===1?'':'s'}
      &middot; ${g.circuits} circuit${g.circuits===1?'':'s'} required</div>`;

  state.locations.forEach((l, li) => {
    const t = g.perLocation[li];
    html += `<div class="p-loc"><h3>${esc(l.name)}</h3>`;
    if (!t.cams) {
      html += `<p class="p-empty">No cameras configured at this location.</p></div>`;
      return;
    }
    html += `<div class="p-sub">${l.profile} scene activity &middot;
      cloud archiving ${l.archive ? 'on' : 'off'} site-wide
      ${t.tuned ? `&middot; ${t.tuned} model${t.tuned===1?'':'s'} tuned individually` : ''}</div>
      <div class="p-nums">
        ${num('Recommended uplink', t.ispMbps, 'Mbps upload', true)}
        ${num('Busy-hour peak', t.peakMbps.toFixed(1), 'Mbps')}
        ${num('Sustained average', t.avgMbps.toFixed(1), 'Mbps')}
        ${num('All saturated', t.ceilingMbps.toFixed(1), 'Mbps max')}
        ${num('Monthly volume', t.monthlyTB.toFixed(2), 'TB')}
      </div>
      <table><thead><tr>
        <th>Model</th><th class="r">Qty</th><th>Archive</th><th>Activity</th><th>Features</th>
        <th class="r">Ceiling</th><th class="r">Avg/cam</th><th class="r">Peak/cam</th><th class="r">Subtotal</th>
      </tr></thead><tbody>`;
    rowsFor(li).forEach(m => {
      html += `<tr>
        <td><b>${m.cam.model}</b></td><td class="r">${m.qty}</td>
        <td>${m.archive ? 'On' : 'Off'}</td>
        <td>${m.activityKey}${m.overridden ? '*' : ''}</td>
        <td style="font-size:8.5px;color:#666">${esc(featureList(m))}</td>
        <td class="r">${m.ceiling.toLocaleString()}</td>
        <td class="r">${Math.round(m.avgKbps).toLocaleString()}</td>
        <td class="r">${Math.round(m.peakKbps).toLocaleString()}</td>
        <td class="r"><b>${(m.avgKbps*m.qty/1000).toFixed(2)}</b></td></tr>`;
    });
    html += `<tr class="tot"><td>Total</td><td class="r">${t.cams}</td>
      <td colspan="6" class="r">${t.avgMbps.toFixed(2)} Mbps sustained</td></tr>
      </tbody></table>
      ${t.tuned ? `<div style="font-size:8px;color:#888">* tuned away from this location's default</div>` : ''}
      </div>`;
  });

  if (g.circuits > 1) {
    html += `<div class="p-loc p-summary"><h3>Project summary</h3>
      <div class="p-sub">Every location needs its own connection. The total below is a sum of
        separate circuits, not a single shared link.</div>
      <table><thead><tr><th>Location</th><th class="r">Cameras</th><th class="r">Archiving</th>
        <th class="r">Sustained</th><th class="r">Peak</th><th class="r">Monthly</th>
        <th class="r">Uplink</th></tr></thead><tbody>`;
    g.perLocation.forEach(t => {
      html += `<tr><td>${esc(t.name)}</td><td class="r">${t.cams || '—'}</td>
        <td class="r">${t.cams ? t.archived : '—'}</td>
        <td class="r">${t.cams ? t.avgMbps.toFixed(1)+' Mbps' : '—'}</td>
        <td class="r">${t.cams ? t.peakMbps.toFixed(1)+' Mbps' : '—'}</td>
        <td class="r">${t.cams ? t.monthlyTB.toFixed(2)+' TB' : '—'}</td>
        <td class="r"><b>${t.ispMbps ? t.ispMbps+' Mbps' : '—'}</b></td></tr>`;
    });
    html += `<tr class="tot"><td>Total</td><td class="r">${g.cams}</td><td class="r">${g.archived}</td>
      <td class="r">${g.avgMbps.toFixed(1)} Mbps</td><td class="r">${g.peakMbps.toFixed(1)} Mbps</td>
      <td class="r">${g.monthlyTB.toFixed(2)} TB</td>
      <td class="r">${g.ispTotalMbps} Mbps</td></tr></tbody></table>
      <div style="font-size:8.5px;color:#666;margin-top:5px">
        ${g.ispTotalMbps} Mbps across ${g.circuits} independent circuits.</div></div>`;
  }

  html += `<div class="p-method"><b>Method.</b> Each model has a measured encoder ceiling
    (active tier x video sources). Sustained upload is that ceiling times a scene-activity factor
    derived from 40 qualifying production cameras; busy-hour peak applies the measured p95/average ratio,
    capped at the ceiling. Recommended uplink is peak x 1.3, rounded up to the nearest 50 Mbps.
    Cloud archiving on/off is the dominant variable &mdash; an 18x median swing in the reference
    fleet. AI feature overhead is an unvalidated estimate. Recommended speeds exclude non-Rhombus
    traffic sharing the same uplink.<br><b>Basis.</b> ${BASIS}.</div>`;

  document.getElementById('print-doc').innerHTML = html;
}

function printDoc() { renderPrintDoc(); window.print(); }

/* ── theme ──────────────────────────────────────────────────────────────── */
function flipTheme() {
  const dark = document.body.classList.toggle('dark');
  document.getElementById('theme').setAttribute('aria-pressed', String(dark));
  document.getElementById('ico-moon').style.display = dark ? 'none' : '';
  document.getElementById('ico-sun').style.display  = dark ? '' : 'none';
  document.querySelector('meta[name=theme-color]').content = dark ? '#15171a' : '#eeeae3';
  try { localStorage.setItem('bw-theme', dark ? 'dark' : 'light'); } catch(e) {}
}

/* ── render ─────────────────────────────────────────────────────────────── */
function render() {
  const L = loc();
  buildLocbar();
  document.getElementById('at-loc').textContent =
    state.locations.length > 1 ? `at ${L.name}` : '';
  document.getElementById('result-scope').textContent =
    state.locations.length > 1 ? `${L.name} — this site's own circuit.` : '';

  document.querySelectorAll('.opt').forEach(o => {
    const selected = o.dataset.k === L.profile;
    o.classList.toggle('on', selected);
    o.setAttribute('aria-checked', String(selected));
  });
  document.getElementById('archsw').className = 'bigsw' + (L.archive ? ' on' : '');
  document.getElementById('archsw').setAttribute('aria-checked', L.archive);
  document.getElementById('archrow').className = 'archrow' + (L.archive ? ' on' : '');

  const tunedArch = CAMERAS.filter((_, i) => L.cams[i].archive !== null).length;
  document.getElementById('archscope').innerHTML = (L.archive
    ? 'On for every model at this location — the realistic default for Enterprise sites.'
    : 'Off for every model at this location — event-only upload, roughly 18&times; lower.')
    + (tunedArch ? ` <b>${tunedArch} model${tunedArch===1?'':'s'} overriding this.</b>` : '');

  // Site-wide feature pills reflect this location; camera overrides remain independent.
  document.querySelectorAll('.fpill').forEach(p => setPressed(p, L.features[p.dataset.k]));

  CAMERAS.forEach((cam, i) => {
    const row = document.querySelector(`.pick[data-i="${i}"]`);
    if (!row) return;
    const m = camMetrics(i), c = L.cams[i];
    row.classList.toggle('live', m.qty > 0);
    const q = document.getElementById('q'+i);
    if (q && document.activeElement !== q && +q.value !== c.qty) q.value = c.qty;

    document.getElementById('bdg'+i).innerHTML = m.overridden ? '<span class="badge">tuned</span>' : '';
    document.getElementById('st'+i).textContent =
      `${m.archive ? 'archived' : 'event-only'} · ${m.activityKey.toLowerCase()}` +
      (m.activeFeatures.length ? ` · ${m.activeFeatures.length} feat` : '');

    const da = document.getElementById('da'+i).children;
    setPressed(da[0], c.archive === null);
    setPressed(da[1], c.archive === true);
    setPressed(da[2], c.archive === false);
    const dp = document.getElementById('dp'+i).children;
    setPressed(dp[0], c.profile === null);
    ACTIVITY.forEach((a, k) => setPressed(dp[k+1], c.profile === a.key));
    document.getElementById('df'+i).querySelectorAll('button').forEach(b =>
      setPressed(b, featureFor(i, b.dataset.k)));

    document.getElementById('pc'+i).textContent = Math.round(m.avgKbps).toLocaleString() + ' kbps';
    document.getElementById('pp'+i).textContent = Math.round(m.peakKbps).toLocaleString() + ' kbps';
  });

  renderResult();
  renderRollup();
}

try { if (localStorage.getItem('bw-theme') === 'dark') flipTheme(); } catch(e) {}
load();                                   // restore saved project, if any
document.getElementById('title').value = state.title;
buildOpts();
buildRef();
buildPicks();
