(() => {
  'use strict';
  const frame = document.querySelector('.page-frame');
  const URL = 'https://script.google.com/macros/s/AKfycbyrHTYuDx6upQC9dXzhE3rK_UMYeFi8J-eRyguKzHlcI2V8742rnn-DcK0AChlXzoYc/exec';
  const ns = 'http://www.w3.org/2000/svg';
  const state = { windowDays: '90', payload: null };
  const configs = [
    { id: 'wake', title: 'Wake-up Time', subtitle: 'Actual wake-up time by day; 7-day and 14-day observed averages.', source: 'wakeUpHistory', unit: 'time', color: '#7DB9E8' },
    { id: 'jacked', title: 'Jacked Plan Adherence', subtitle: 'Score out of 10 on scheduled sessions. Rest days do not count as missed.', source: 'jackedAdherenceHistory', unit: 'score', color: '#6BE784' }
  ];
  function numeric(v) {
    if (v === null || v === undefined || String(v).trim() === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  function dateStamp(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return NaN;
    const d = Date.parse(s + 'T12:00:00Z');
    return Number.isFinite(d) ? d : NaN;
  }
  function timeMinutes(s) {
    if (typeof s === 'number' && s >= 0 && s < 1) return Math.round(s * 1440);
    const m = String(s ?? '').match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!m) return null;
    const hours = Number(m[1]), minutes = Number(m[2]);
    return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
  }
  function parse(config, raw) {
    let rows = raw;
    if (typeof rows === 'string') {
      try { rows = JSON.parse(rows); } catch (e) { console.warn('Invalid ' + config.source, e); return []; }
    }
    if (!Array.isArray(rows)) return [];
    const byDay = new Map();
    rows.forEach(r => {
      const date = String(r && r.date || '');
      const stamp = dateStamp(date);
      if (!Number.isFinite(stamp)) return;
      let value, status = '';
      if (config.unit === 'time') value = timeMinutes(r.wakeTime);
      else {
        status = String(r.status || '');
        if (/rest day/i.test(status)) return;
        value = numeric(r.score);
        if (value === null || value < 0 || value > 10 || !Number.isInteger(value)) return;
        if (!status) return;
      }
      if (value === null || !Number.isFinite(value)) return;
      byDay.set(date, { date, stamp, value, status });
    });
    return [...byDay.values()].sort((a, b) => a.stamp - b.stamp);
  }
  function format(config, val) {
    if (val === null || !Number.isFinite(val)) return '—';
    if (config.unit === 'score') return val.toFixed(1) + '/10';
    const rounded = Math.round(val);
    const h = Math.floor(rounded / 60) % 24, m = rounded % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }
  function dayLabel(stamp) {
    return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(stamp));
  }
  function average(rows, days, end) {
    const points = rows.filter(p => p.stamp <= end && p.stamp > end - days * 86400000);
    return points.length ? points.reduce((n, p) => n + p.value, 0) / points.length : null;
  }
  function svgNode(doc, tag, attrs = {}, value) {
    const el = doc.createElementNS(ns, tag);
    Object.entries(attrs).forEach(([key, val]) => el.setAttribute(key, val));
    if (value !== undefined) el.textContent = value;
    return el;
  }
  function init(doc) {
    if (doc.getElementById('routine-trends')) return;
    const st = doc.createElement('style');
    st.textContent = [
      '.routine-trends { margin: 22px 0; }',
      '.routine-trends > h2 { font-size: 2.2rem; margin: 0 0 4px; color: #FFAD62; }',
      '.routine-trends > p { margin: 0 0 14px; color: var(--muted); font-size: 1.05rem; }',
      '.routine-summary { display: grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-bottom:14px; }',
      '.routine-summary > div, .routine-card { border:1px solid var(--line); background:rgba(10,32,55,.95); border-radius:18px; }',
      '.routine-summary > div { padding:12px; }',
      '.routine-summary small { color:var(--muted); display:block; font:700 .68rem system-ui,sans-serif; letter-spacing:.03em; }',
      '.routine-summary strong { font:700 1.12rem system-ui,sans-serif; display:block; margin-top:6px; color:#EAF2F8; }',
      '.routine-card { padding:18px; margin:14px 0; }',
      '.routine-head { display:flex; align-items:start; justify-content:space-between; gap:14px; }',
      '.routine-head h3 { color:#7DB9E8; font-size:1.8rem; margin:0; }',
      '.routine-card[data-chart="jacked"] .routine-head h3 { color:#6BE784; }',
      '.routine-head p { color:var(--muted); margin:3px 0 10px; font-size:1rem; }',
      '.routine-chips { display:flex; flex-wrap:wrap; gap:6px; margin:9px 0; }',
      '.routine-chips span { border-radius:10px; border:1px solid var(--line); padding:5px 9px; font:700 .75rem system-ui,sans-serif; color:var(--ink); }',
      '.routine-period { display:flex; gap:6px; flex-wrap:wrap; justify-content:flex-end; margin:0 0 8px; }',
      '.routine-period button { cursor:pointer; border:1px solid var(--line); border-radius:999px; padding:5px 10px; background:#102D49; color:#F3F7FB; font:700 .72rem system-ui,sans-serif; }',
      '.routine-period button[aria-pressed="true"] { background:#45DB70; color:#07182A; }',
      '.routine-chart { position:relative; min-height:260px; overflow:hidden; border-radius:14px; background:linear-gradient(180deg,rgba(17,52,84,.95),rgba(7,24,42,.94)); }',
      '.routine-chart svg { width:100%; height:auto; min-height:230px; display:block; }',
      '.routine-empty { margin:0; padding:65px 15px; text-align:center; color:var(--muted); font:1.05rem system-ui,sans-serif; }',
      '.routine-note { font: .75rem system-ui,sans-serif; color:var(--muted); line-height:1.5; margin:10px 0 0; }',
      '.routine-chart circle { cursor:help; }',
      '.routine-chart circle:focus { outline:2px solid #FFAD62; outline-offset:2px; }',
      '@media (max-width:680px) { .routine-summary { grid-template-columns:repeat(2,minmax(0,1fr)); } .routine-head { flex-direction:column; } .routine-card { padding:12px; } .routine-chart svg { min-height:180px; } }'
    ].join('\n');
    doc.head.appendChild(st);
    const outer = doc.createElement('section');
    outer.id = 'routine-trends';
    outer.className = 'routine-trends';
    outer.innerHTML = '<h2>Daily Routine &amp; Exercise</h2><p>Live trend views from the health log. Missing measurements remain missing.</p>' +
      '<div class="routine-summary" id="routine-cardio">' +
      '<div><small>MODERATE THIS WEEK</small><strong id="routine-moderate">—</strong></div>' +
      '<div><small>VIGOROUS THIS WEEK</small><strong id="routine-vigorous">—</strong></div>' +
      '<div><small>CARDIO EQUIVALENT</small><strong id="routine-equivalent">— / 150 min</strong></div>' +
      '<div><small>JACKED COMPLETE</small><strong id="routine-sessions">— / 3</strong></div>' +
      '</div>';
    configs.forEach(config => {
      const card = doc.createElement('section');
      card.className = 'routine-card';
      card.dataset.chart = config.id;
      card.innerHTML = '<div class="routine-head"><div><h3>' + config.title + '</h3><p>' + config.subtitle + '</p></div>' +
        '<div class="routine-period" role="group" aria-label="' + config.title + ' date range">' +
        '<button type="button" data-period="30">30 days</button>' +
        '<button type="button" data-period="90" aria-pressed="true">90 days</button>' +
        '<button type="button" data-period="all">All</button></div></div>' +
        '<div class="routine-chips" id="routine-' + config.id + '-stats" aria-live="polite"></div>' +
        '<div class="routine-chart" id="routine-' + config.id + '-chart"></div>' +
        '<p class="routine-note">' + (config.unit === 'time' ?
          '7-day and 14-day averages include only actual wake-up records. Time of day, not sleep duration.' :
          '7-day and 14-day averages use completed, partial and missed scheduled sessions. Rest days are excluded; a missed session with score 0 is included.') +
        '</p>';
      card.querySelectorAll('[data-period]').forEach(button => {
        button.addEventListener('click', () => {
          state.windowDays = button.dataset.period;
          outer.querySelectorAll('[data-period]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.period === state.windowDays)));
          render(doc);
        });
      });
      outer.appendChild(card);
    });
    const anchor = doc.querySelector('.coach');
    if (anchor) anchor.before(outer);
    else doc.querySelector('main')?.appendChild(outer);
  }
  function put(doc, id, val) {
    const el = doc.getElementById(id);
    if (el) el.textContent = val;
  }
  function renderCardio(doc, d) {
    const moderate = numeric(d.moderateCardioMinutesWeek);
    const vigorous = numeric(d.vigorousCardioMinutesWeek);
    const equivalent = numeric(d.cardioEquivalentMinutesWeek);
    const completed = numeric(d.jackedCompletedSessionsWeek);
    put(doc, 'routine-moderate', moderate === null ? '—' : Math.round(moderate) + ' min');
    put(doc, 'routine-vigorous', vigorous === null ? '—' : Math.round(vigorous) + ' min');
    put(doc, 'routine-equivalent', equivalent === null ? '— / 150 min' : Math.round(equivalent) + ' / 150 min');
    put(doc, 'routine-sessions', completed === null ? '— / 3' : completed + ' / 3');
  }
  function renderGraph(doc, config, history) {
    const wrap = doc.getElementById('routine-' + config.id + '-chart');
    const chips = doc.getElementById('routine-' + config.id + '-stats');
    if (!wrap || !chips) return;
    wrap.replaceChildren();
    chips.replaceChildren();
    const latest = history[history.length - 1];
    const addChip = (label, value) => {
      const span = doc.createElement('span');
      span.textContent = label + ': ' + value;
      chips.appendChild(span);
    };
    addChip('Latest', latest ? format(config, latest.value) : '—');
    addChip('7-day avg', latest ? format(config, average(history, 7, latest.stamp)) : '—');
    addChip('14-day avg', latest ? format(config, average(history, 14, latest.stamp)) : '—');
    addChip('Logs', String(history.length));
    if (!history.length) {
      const empty = doc.createElement('p');
      empty.className = 'routine-empty';
      empty.textContent = 'No observations received yet. New log entries will appear when the form-to-sheet data feed includes this field.';
      wrap.appendChild(empty);
      return;
    }
    const filtered = state.windowDays === 'all' ? history :
      history.filter(e => e.stamp >= history[history.length - 1].stamp - (Number(state.windowDays) - 1) * 86400000);
    if (!filtered.length) return;
    const width = 760, height = 270, padL = 68, padR = 23, padT = 18, padB = 34;
    const plotW = width - padL - padR, plotH = height - padT - padB;
    const minTime = filtered[0].stamp;
    const maxTime = filtered[filtered.length - 1].stamp;
    const spanTime = Math.max(86400000, maxTime - minTime);
    let minY, maxY, ticks;
    if (config.unit === 'score') { minY = 0; maxY = 10; ticks = [0, 2, 4, 6, 8, 10]; }
    else {
      const vals = filtered.map(p => p.value);
      minY = Math.max(0, Math.floor((Math.min(...vals) - 30) / 60) * 60);
      maxY = Math.min(1440, Math.ceil((Math.max(...vals) + 30) / 60) * 60);
      if (minY === maxY) { minY = Math.max(0, minY - 60); maxY = Math.min(1440, maxY + 60); }
      const step = maxY - minY > 360 ? 120 : 60;
      ticks = [];
      for (let t = Math.ceil(minY / step) * step; t <= maxY; t += step) ticks.push(t);
    }
    const x = p => padL + ((p.stamp - minTime) / spanTime) * plotW;
    const y = v => padT + (1 - (v - minY) / Math.max(1, maxY - minY)) * plotH;
    const svg = svgNode(doc, 'svg', { viewBox: '0 0 760 270', role: 'img', 'aria-label': config.title + ', with raw measurements and seven and fourteen day averages. ' + filtered.length + ' observed records in selected range.' });
    ticks.forEach(t => {
      const yy = y(t);
      svg.appendChild(svgNode(doc, 'line', { x1: padL, y1: yy, x2: width - padR, y2: yy, stroke: '#43617C', 'stroke-opacity': '.38' }));
      svg.appendChild(svgNode(doc, 'text', { x: padL - 10, y: yy + 4, fill: '#C7D5E3', 'text-anchor': 'end', 'font-size': '12', 'font-family': 'system-ui, sans-serif' }, config.unit === 'time' ? format(config, t) : String(t)));
    });
    const range = [filtered[0].stamp, (filtered[0].stamp + filtered[filtered.length-1].stamp)/2, filtered[filtered.length-1].stamp];
    range.forEach((t, i) => {
      svg.appendChild(svgNode(doc, 'text', { x: padL + i * plotW / 2, y: height - 9, fill: '#C7D5E3', 'text-anchor': i === 0 ? 'start' : i === 2 ? 'end' : 'middle', 'font-size': '12', 'font-family': 'system-ui, sans-serif' }, dayLabel(t)));
    });
    const rolling = filtered.map(p => ({ ...p, avg7: average(history, 7, p.stamp), avg14: average(history, 14, p.stamp) }));
    const line = (points, key, colour, thickness, opacity) => {
      if (!points.length) return;
      const d = points.map((p, i) => (i ? 'L' : 'M') + x(p).toFixed(2) + ',' + y(p[key]).toFixed(2)).join(' ');
      svg.appendChild(svgNode(doc, 'path', { d, fill: 'none', stroke: colour, 'stroke-width': thickness, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity }));
    };
    line(rolling, 'value', config.color, 2, 0.7);
    line(rolling, 'avg7', '#FFAD62', 2.7, 1);
    line(rolling, 'avg14', '#45DB70', 3.3, 1);
    rolling.forEach(p => {
      const circle = svgNode(doc, 'circle', { cx: x(p), cy: y(p.value), r: '4', fill: config.color, stroke: '#07182A', 'stroke-width': '1.5', tabindex: '0' });
      const label = dayLabel(p.stamp) + ': ' + format(config, p.value) + (p.status ? ' (' + p.status + ')' : '') + '. 7-day average: ' + format(config, p.avg7) + '; 14-day average: ' + format(config, p.avg14);
      circle.appendChild(svgNode(doc, 'title', {}, label));
      circle.setAttribute('aria-label', label);
      svg.appendChild(circle);
    });
    wrap.appendChild(svg);
    const legend = doc.createElement('div');
    legend.className = 'routine-chips';
    legend.innerHTML = '<span>● Raw readings</span><span style="color:#FFAD62">● 7-day average</span><span style="color:#45DB70">● 14-day average</span>';
    wrap.after(legend);
    const card = wrap.closest('.routine-card');
    card.querySelectorAll('.routine-legend').forEach(n => n.remove());
    legend.classList.add('routine-legend');
  }
  function render(doc) {
    const payload = state.payload;
    if (!payload) return;
    const data = payload.metrics || payload;
    renderCardio(doc, data);
    configs.forEach(c => renderGraph(doc, c, parse(c, data[c.source])));
  }
  async function load(doc) {
    try {
      const payload = typeof window.getHealthData === 'function' ? await window.getHealthData({ force: true }) :
        await fetch(URL + '?t=' + Date.now(), { cache: 'no-store' }).then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); });
      state.payload = payload;
      render(doc);
    } catch (error) {
      console.warn('Routine charts data unavailable', error);
      state.payload = {};
      render(doc);
    }
  }
  function start() {
    const doc = frame && frame.contentDocument;
    if (!doc || doc.readyState === 'loading') return;
    init(doc);
    load(doc);
    const view = doc.defaultView;
    if (view && !view.__routineChartsRefresh) {
      view.__routineChartsRefresh = true;
      view.setInterval(() => { if (!doc.hidden) load(doc); }, 60000);
      view.addEventListener('focus', () => load(doc));
    }
  }
  frame?.addEventListener('load', start);
  if (frame?.contentDocument?.readyState === 'complete') start();
})();