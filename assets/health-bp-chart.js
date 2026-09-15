(() => {
  const HEALTH_DATA_URL = 'https://script.google.com/macros/s/AKfycbwihWQw8Frs1acA1Y-CELBw0NmX4O5KFzcqU3f8TbFpSegleKyPM64TkqTyoNyAWhLP/exec';
  const frame = document.querySelector('.page-frame');
  let chartState = null;
  let currentHistory = [];

  function toNumber(value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const number = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(number) ? number : null;
  }

  function parseHistory(value) {
    let history = value;
    if (typeof history === 'string') {
      try { history = JSON.parse(history); }
      catch (error) {
        console.warn('Blood pressure history could not be parsed:', error);
        return [];
      }
    }
    if (!Array.isArray(history)) return [];

    return history
      .map(entry => ({
        date: entry?.date || '',
        timestamp: Date.parse(`${entry?.date || ''}T12:00:00`),
        systolic: toNumber(entry?.systolic),
        diastolic: toNumber(entry?.diastolic)
      }))
      .filter(entry =>
        entry.date &&
        Number.isFinite(entry.timestamp) &&
        entry.systolic !== null &&
        entry.diastolic !== null &&
        entry.systolic > 0 &&
        entry.diastolic > 0
      )
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  function formatDate(timestamp, includeYear = false) {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      ...(includeYear ? { year: 'numeric' } : {})
    }).format(new Date(timestamp));
  }

  function formatReading(systolic, diastolic) {
    if (systolic === null || diastolic === null) return '—';
    return `${Math.round(systolic)}/${Math.round(diastolic)}`;
  }

  function compute28DayAverage(history) {
    if (!history.length) return { systolic: null, diastolic: null };
    const latestTime = history[history.length - 1].timestamp;
    const start = latestTime - (27 * 24 * 60 * 60 * 1000);
    const readings = history.filter(entry => entry.timestamp >= start && entry.timestamp <= latestTime);
    if (!readings.length) return { systolic: null, diastolic: null };
    return {
      systolic: readings.reduce((sum, item) => sum + item.systolic, 0) / readings.length,
      diastolic: readings.reduce((sum, item) => sum + item.diastolic, 0) / readings.length
    };
  }

  function injectChart(doc) {
    if (doc.getElementById('bp-trend-section')) return;

    const style = doc.createElement('style');
    style.id = 'bp-trend-styles';
    style.textContent = `
      .bp-chart-card {
        margin-bottom: 18px;
        padding: 18px;
        border: 1px solid rgba(125,185,232,.28);
        border-radius: 22px;
        background: rgba(10,32,55,.95);
        color: var(--ink);
        overflow: hidden;
      }
      .bp-chart-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 14px;
      }
      .bp-chart-heading h2 {
        margin: 0;
        color: #7DB9E8 !important;
        font-size: 2rem;
        font-weight: 400;
      }
      .bp-chart-heading p {
        margin: 3px 0 0;
        color: var(--muted);
        font-size: 1.05rem;
      }
      .bp-chart-summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(82px, 1fr));
        gap: 7px;
        min-width: min(100%, 330px);
        font-family: system-ui, sans-serif;
      }
      .bp-chart-chip {
        padding: 7px 10px 8px;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: rgba(15,43,70,.96);
        text-align: center;
      }
      .bp-chart-chip small {
        display: block;
        color: var(--muted);
        font-size: .66rem;
        font-weight: 700;
        letter-spacing: .045em;
        text-transform: uppercase;
      }
      .bp-chart-chip strong {
        display: block;
        margin-top: 2px;
        color: var(--ink);
        font-size: .94rem;
      }
      .bp-chart-chip.latest { box-shadow: inset 0 3px 0 #FF8126; }
      .bp-chart-chip.latest strong { color: #FFAD62; }
      .bp-chart-chip.average { box-shadow: inset 0 3px 0 #7DB9E8; }
      .bp-chart-chip.average strong { color: #9AC9ED; }
      .bp-chart-chip.count { box-shadow: inset 0 3px 0 #45DB70; }
      .bp-chart-chip.count strong { color: #45DB70; }
      .bp-chart-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px 18px;
        margin: 0 0 9px;
        color: var(--muted);
        font-family: system-ui, sans-serif;
        font-size: .76rem;
      }
      .bp-legend-item { display: inline-flex; align-items: center; gap: 6px; }
      .bp-legend-line { width: 22px; height: 3px; border-radius: 999px; }
      .bp-legend-line.systolic { background: #FF8126; }
      .bp-legend-line.diastolic { background: #7DB9E8; }
      .bp-chart-wrap {
        position: relative;
        width: 100%;
        height: 310px;
        border-radius: 14px;
        background: linear-gradient(180deg, rgba(17,52,84,.95), rgba(7,24,42,.94));
        overflow: hidden;
      }
      #bp-trend-canvas {
        display: block;
        width: 100%;
        height: 100%;
        touch-action: manipulation;
      }
      .bp-chart-tooltip {
        position: absolute;
        z-index: 2;
        min-width: 154px;
        padding: 9px 11px;
        border: 1px solid var(--line);
        border-radius: 11px;
        background: rgba(10,32,55,.98);
        box-shadow: 0 8px 20px rgba(0,0,0,.28);
        color: var(--ink);
        font-family: system-ui, sans-serif;
        font-size: .75rem;
        line-height: 1.42;
        pointer-events: none;
        transform: translate(-50%, calc(-100% - 10px));
      }
      .bp-chart-tooltip strong { display: block; margin-bottom: 3px; font-size: .8rem; }
      .bp-chart-tooltip span { display: block; }
      .bp-chart-empty {
        display: grid;
        place-items: center;
        min-height: 180px;
        margin: 0;
        color: var(--muted);
        font-size: 1.2rem;
        text-align: center;
      }
      @media (max-width: 620px) {
        .bp-chart-heading { flex-direction: column; }
        .bp-chart-summary { width: 100%; min-width: 0; }
        .bp-chart-wrap { height: 270px; }
        .bp-chart-card { padding: 16px; }
      }
      @media (max-width: 390px) {
        .bp-chart-chip { padding-inline: 6px; }
        .bp-chart-chip strong { font-size: .86rem; }
      }
    `;
    doc.head.appendChild(style);

    const section = doc.createElement('section');
    section.id = 'bp-trend-section';
    section.className = 'bp-chart-card';
    section.setAttribute('aria-labelledby', 'bp-trend-heading');
    section.innerHTML = `
      <div class="bp-chart-heading">
        <div>
          <h2 id="bp-trend-heading">Blood Pressure</h2>
          <p>Systolic and diastolic readings over time.</p>
        </div>
        <div class="bp-chart-summary" id="bp-trend-summary" hidden>
          <div class="bp-chart-chip latest">
            <small>Latest</small>
            <strong id="bp-trend-latest">—</strong>
          </div>
          <div class="bp-chart-chip average">
            <small>28-day avg</small>
            <strong id="bp-trend-average">—</strong>
          </div>
          <div class="bp-chart-chip count">
            <small>Readings</small>
            <strong id="bp-trend-count">—</strong>
          </div>
        </div>
      </div>
      <div class="bp-chart-meta">
        <span class="bp-legend-item"><span class="bp-legend-line systolic"></span>Systolic</span>
        <span class="bp-legend-item"><span class="bp-legend-line diastolic"></span>Diastolic</span>
        <span>mmHg</span>
      </div>
      <div class="bp-chart-wrap" id="bp-trend-wrap">
        <canvas id="bp-trend-canvas" role="img" aria-label="Blood pressure chart showing systolic and diastolic readings in millimetres of mercury by date">Blood pressure history chart.</canvas>
        <div class="bp-chart-tooltip" id="bp-trend-tooltip" hidden aria-live="polite"></div>
        <p class="bp-chart-empty" id="bp-trend-empty" hidden>Not enough blood pressure readings to draw the trend yet.</p>
      </div>
    `;

    const weightSection = doc.getElementById('weight-trend-section');
    const hero = doc.querySelector('.hero');
    if (weightSection) weightSection.after(section);
    else if (hero) hero.before(section);
    else doc.querySelector('main')?.appendChild(section);
  }

  function setText(doc, id, value) {
    const element = doc.getElementById(id);
    if (element) element.textContent = value;
  }

  function hideTooltip(doc) {
    const tooltip = doc.getElementById('bp-trend-tooltip');
    if (tooltip) tooltip.hidden = true;
  }

  function positionTooltip(doc, point) {
    const tooltip = doc.getElementById('bp-trend-tooltip');
    if (!tooltip || !chartState) return;
    const entry = chartState.history[point.index];
    const safeX = Math.min(Math.max(point.x, 82), chartState.cssWidth - 82);
    tooltip.innerHTML = `
      <strong>${formatDate(entry.timestamp, true)}</strong>
      <span>Systolic: ${Math.round(entry.systolic)} mmHg</span>
      <span>Diastolic: ${Math.round(entry.diastolic)} mmHg</span>
      <span>Reading: ${formatReading(entry.systolic, entry.diastolic)}</span>
    `;
    tooltip.style.left = `${safeX}px`;
    tooltip.style.top = `${Math.max(58, Math.min(point.systolicY, point.diastolicY))}px`;
    tooltip.hidden = false;
  }

  function installInteraction(doc) {
    const canvas = doc.getElementById('bp-trend-canvas');
    if (!canvas || canvas.dataset.interactionReady === 'true') return;
    canvas.dataset.interactionReady = 'true';

    function showNearest(event) {
      if (!chartState?.interactivePoints?.length) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      let nearest = null;
      let nearestDistance = Infinity;
      chartState.interactivePoints.forEach(point => {
        const distance = Math.abs(point.x - x);
        if (distance < nearestDistance) {
          nearest = point;
          nearestDistance = distance;
        }
      });
      if (nearest && nearestDistance <= 32) positionTooltip(doc, nearest);
      else hideTooltip(doc);
    }

    canvas.addEventListener('pointermove', showNearest);
    canvas.addEventListener('pointerdown', showNearest);
    canvas.addEventListener('pointerleave', () => hideTooltip(doc));
  }

  function drawChart(doc, history, payload = {}) {
    currentHistory = history;
    const canvas = doc.getElementById('bp-trend-canvas');
    const wrap = doc.getElementById('bp-trend-wrap');
    const empty = doc.getElementById('bp-trend-empty');
    const summary = doc.getElementById('bp-trend-summary');
    if (!canvas || !wrap || !empty || !summary) return;

    hideTooltip(doc);

    if (history.length < 2) {
      canvas.hidden = true;
      empty.hidden = false;
      summary.hidden = true;
      chartState = null;
      return;
    }

    canvas.hidden = false;
    empty.hidden = true;
    summary.hidden = false;

    const latest = history[history.length - 1];
    const fallbackAverage = compute28DayAverage(history);
    const avgSystolic = toNumber(payload.bpSystolic28dAvg) ?? fallbackAverage.systolic;
    const avgDiastolic = toNumber(payload.bpDiastolic28dAvg) ?? fallbackAverage.diastolic;

    setText(doc, 'bp-trend-latest', formatReading(latest.systolic, latest.diastolic));
    setText(doc, 'bp-trend-average', formatReading(avgSystolic, avgDiastolic));
    setText(doc, 'bp-trend-count', history.length.toString());

    const rect = wrap.getBoundingClientRect();
    const cssWidth = Math.max(300, Math.floor(rect.width));
    const cssHeight = Math.max(220, Math.floor(rect.height));
    const pixelRatio = Math.min(doc.defaultView?.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(cssWidth * pixelRatio);
    canvas.height = Math.floor(cssHeight * pixelRatio);

    const context = canvas.getContext('2d');
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, cssWidth, cssHeight);

    const compact = cssWidth < 520;
    const margin = { top: 18, right: compact ? 18 : 22, bottom: 42, left: compact ? 47 : 56 };
    const plotWidth = cssWidth - margin.left - margin.right;
    const plotHeight = cssHeight - margin.top - margin.bottom;

    const values = history.flatMap(entry => [entry.systolic, entry.diastolic]);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const yMin = Math.floor((rawMin - 8) / 10) * 10;
    const yMax = Math.ceil((rawMax + 8) / 10) * 10;
    const yRange = Math.max(20, yMax - yMin);
    const startTime = history[0].timestamp;
    const endTime = history[history.length - 1].timestamp;
    const timeRange = Math.max(1, endTime - startTime);

    const xFor = timestamp => margin.left + ((timestamp - startTime) / timeRange) * plotWidth;
    const yFor = value => margin.top + ((yMax - value) / yRange) * plotHeight;

    context.font = `${compact ? 10 : 11}px system-ui, sans-serif`;
    context.textBaseline = 'middle';
    context.lineWidth = 1;

    const horizontalLines = 5;
    for (let index = 0; index <= horizontalLines; index += 1) {
      const ratio = index / horizontalLines;
      const y = margin.top + ratio * plotHeight;
      const value = yMax - ratio * yRange;
      context.beginPath();
      context.moveTo(margin.left, y);
      context.lineTo(margin.left + plotWidth, y);
      context.strokeStyle = 'rgba(190,214,235,.12)';
      context.stroke();
      context.fillStyle = '#B6C9DB';
      context.textAlign = 'right';
      context.fillText(`${Math.round(value)}`, margin.left - 8, y);
    }

    context.fillStyle = '#B6C9DB';
    context.textAlign = 'left';
    context.fillText('mmHg', 7, margin.top - 6);

    const dayMs = 24 * 60 * 60 * 1000;
    const tickInterval = (compact ? 21 : 14) * dayMs;
    let tick = startTime;
    let tickIndex = 0;
    while (tick <= endTime + dayMs / 2) {
      const x = xFor(tick);
      context.fillStyle = '#B6C9DB';
      context.textAlign = tickIndex === 0 ? 'left' : 'center';
      context.fillText(formatDate(tick), x, cssHeight - 17);
      tick += tickInterval;
      tickIndex += 1;
    }

    function drawSeries(key, strokeStyle, lineWidth) {
      context.beginPath();
      history.forEach((entry, index) => {
        const x = xFor(entry.timestamp);
        const y = yFor(entry[key]);
        if (index === 0) context.moveTo(x, y);
        else context.lineTo(x, y);
      });
      context.strokeStyle = strokeStyle;
      context.lineWidth = lineWidth;
      context.lineJoin = 'round';
      context.lineCap = 'round';
      context.stroke();
    }

    drawSeries('systolic', '#FF8126', 3.5);
    drawSeries('diastolic', '#7DB9E8', 3.5);

    const interactivePoints = history.map((entry, index) => {
      const x = xFor(entry.timestamp);
      const systolicY = yFor(entry.systolic);
      const diastolicY = yFor(entry.diastolic);

      for (const [y, fill] of [[systolicY, '#FF8126'], [diastolicY, '#7DB9E8']]) {
        context.beginPath();
        context.arc(x, y, index === history.length - 1 ? 4.5 : 3.5, 0, Math.PI * 2);
        context.fillStyle = fill;
        context.fill();
        context.lineWidth = 1.4;
        context.strokeStyle = 'rgba(7,24,42,.98)';
        context.stroke();
      }

      return { index, x, systolicY, diastolicY };
    });

    canvas.setAttribute(
      'aria-label',
      `Blood pressure history. Latest reading ${formatReading(latest.systolic, latest.diastolic)} millimetres of mercury. ` +
      `28-day average ${formatReading(avgSystolic, avgDiastolic)}.`
    );

    chartState = { cssWidth, history, interactivePoints };
    installInteraction(doc);
  }

  async function loadHistory(doc) {
    try {
      const response = await fetch(`${HEALTH_DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const data = payload.metrics || payload;
      drawChart(doc, parseHistory(data.bpHistory), data);
    } catch (error) {
      console.warn('Blood pressure progress failed to load:', error);
      drawChart(doc, []);
    }
  }

  function initialise() {
    try {
      const doc = frame?.contentDocument;
      if (!doc) return;
      injectChart(doc);
      loadHistory(doc);

      let resizeFrame;
      doc.defaultView?.addEventListener('resize', () => {
        doc.defaultView.cancelAnimationFrame(resizeFrame);
        resizeFrame = doc.defaultView.requestAnimationFrame(() => {
          if (currentHistory.length) loadHistory(doc);
        });
      });
    } catch (error) {
      console.warn('Unable to add blood pressure chart:', error);
    }
  }

  frame?.addEventListener('load', initialise);
  if (frame?.contentDocument?.readyState === 'complete') queueMicrotask(initialise);
})();
