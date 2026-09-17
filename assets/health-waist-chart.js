(() => {
  const HEALTH_DATA_URL = 'https://script.google.com/macros/s/AKfycbyrHTYuDx6upQC9dXzhE3rK_UMYeFi8J-eRyguKzHlcI2V8742rnn-DcK0AChlXzoYc/exec';
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
        console.warn('Waist history could not be parsed:', error);
        return [];
      }
    }
    if (!Array.isArray(history)) return [];

    return history
      .map(entry => ({
        date: entry?.date || '',
        timestamp: Date.parse(`${entry?.date || ''}T12:00:00`),
        waistCm: toNumber(entry?.waistCm)
      }))
      .filter(entry => entry.date && Number.isFinite(entry.timestamp) && entry.waistCm !== null && entry.waistCm > 0)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  function formatDate(timestamp, includeYear = false) {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      ...(includeYear ? { year: 'numeric' } : {})
    }).format(new Date(timestamp));
  }

  function formatCm(value) {
    return value === null || value === undefined || !Number.isFinite(value) ? '—' : `${value.toFixed(1)} cm`;
  }

  function rollingAverage(history, index, days) {
    const end = history[index].timestamp;
    const start = end - ((days - 1) * 24 * 60 * 60 * 1000);
    const values = history
      .slice(0, index + 1)
      .filter(entry => entry.timestamp >= start && entry.timestamp <= end)
      .map(entry => entry.waistCm);
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function buildSeries(history) {
    return history.map((entry, index) => ({
      ...entry,
      avg7: rollingAverage(history, index, 7),
      avg14: rollingAverage(history, index, 14)
    }));
  }

  function injectChart(doc) {
    if (doc.getElementById('waist-trend-section')) return;

    const style = doc.createElement('style');
    style.id = 'waist-trend-styles';
    style.textContent = `
      .waist-chart-card {
        margin-bottom: 18px;
        padding: 18px;
        border: 1px solid rgba(69,219,112,.26);
        border-radius: 22px;
        background: rgba(10,32,55,.95);
        color: var(--ink);
        overflow: hidden;
      }
      .waist-chart-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 18px;
        margin-bottom: 14px;
      }
      .waist-chart-heading h2 {
        margin: 0;
        color: #45DB70 !important;
        font-size: 2rem;
        font-weight: 400;
      }
      .waist-chart-heading p {
        margin: 3px 0 0;
        color: var(--muted);
        font-size: 1.05rem;
      }
      .waist-chart-summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(72px, 1fr));
        gap: 7px;
        min-width: min(100%, 430px);
        font-family: system-ui, sans-serif;
      }
      .waist-chart-chip {
        padding: 7px 8px 8px;
        border: 1px solid var(--line);
        border-radius: 12px;
        background: rgba(15,43,70,.96);
        text-align: center;
      }
      .waist-chart-chip small {
        display: block;
        color: var(--muted);
        font-size: .64rem;
        font-weight: 700;
        letter-spacing: .045em;
        text-transform: uppercase;
      }
      .waist-chart-chip strong {
        display: block;
        margin-top: 2px;
        color: var(--ink);
        font-size: .9rem;
      }
      .waist-chart-chip.latest { box-shadow: inset 0 3px 0 #7DB9E8; }
      .waist-chart-chip.latest strong { color: #9AC9ED; }
      .waist-chart-chip.avg7 { box-shadow: inset 0 3px 0 #FF8126; }
      .waist-chart-chip.avg7 strong { color: #FFAD62; }
      .waist-chart-chip.avg14 { box-shadow: inset 0 3px 0 #45DB70; }
      .waist-chart-chip.avg14 strong { color: #6BE784; }
      .waist-chart-chip.count { box-shadow: inset 0 3px 0 #B6C9DB; }
      .waist-chart-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px 18px;
        margin: 0 0 9px;
        color: var(--muted);
        font-family: system-ui, sans-serif;
        font-size: .76rem;
      }
      .waist-legend-item { display: inline-flex; align-items: center; gap: 6px; }
      .waist-legend-line { width: 22px; height: 3px; border-radius: 999px; }
      .waist-legend-line.raw { background: #7DB9E8; }
      .waist-legend-line.avg7 { background: #FF8126; }
      .waist-legend-line.avg14 { background: #45DB70; }
      .waist-chart-wrap {
        position: relative;
        width: 100%;
        height: 310px;
        border-radius: 14px;
        background: linear-gradient(180deg, rgba(17,52,84,.95), rgba(7,24,42,.94));
        overflow: hidden;
      }
      #waist-trend-canvas {
        display: block;
        width: 100%;
        height: 100%;
        touch-action: manipulation;
      }
      .waist-chart-tooltip {
        position: absolute;
        z-index: 2;
        min-width: 150px;
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
      .waist-chart-tooltip strong { display: block; margin-bottom: 3px; font-size: .8rem; }
      .waist-chart-tooltip span { display: block; }
      .waist-chart-empty {
        display: grid;
        place-items: center;
        min-height: 180px;
        margin: 0;
        padding: 20px;
        color: var(--muted);
        font-size: 1.2rem;
        text-align: center;
      }
      @media (max-width: 720px) {
        .waist-chart-heading { flex-direction: column; }
        .waist-chart-summary { width: 100%; min-width: 0; grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      @media (max-width: 620px) {
        .waist-chart-wrap { height: 270px; }
        .waist-chart-card { padding: 16px; }
      }
    `;
    doc.head.appendChild(style);

    const section = doc.createElement('section');
    section.id = 'waist-trend-section';
    section.className = 'waist-chart-card';
    section.setAttribute('aria-labelledby', 'waist-trend-heading');
    section.innerHTML = `
      <div class="waist-chart-heading">
        <div>
          <h2 id="waist-trend-heading">Waist Circumference</h2>
          <p>Raw measurements with 7-day and 14-day rolling averages.</p>
        </div>
        <div class="waist-chart-summary" id="waist-trend-summary" hidden>
          <div class="waist-chart-chip latest"><small>Latest</small><strong id="waist-trend-latest">—</strong></div>
          <div class="waist-chart-chip avg7"><small>7-day avg</small><strong id="waist-trend-avg7">—</strong></div>
          <div class="waist-chart-chip avg14"><small>14-day avg</small><strong id="waist-trend-avg14">—</strong></div>
          <div class="waist-chart-chip count"><small>Readings</small><strong id="waist-trend-count">—</strong></div>
        </div>
      </div>
      <div class="waist-chart-meta">
        <span class="waist-legend-item"><span class="waist-legend-line raw"></span>Waist</span>
        <span class="waist-legend-item"><span class="waist-legend-line avg7"></span>7-day average</span>
        <span class="waist-legend-item"><span class="waist-legend-line avg14"></span>14-day average</span>
        <span>cm</span>
      </div>
      <div class="waist-chart-wrap" id="waist-trend-wrap">
        <canvas id="waist-trend-canvas" role="img" aria-label="Waist circumference chart in centimetres by date">Waist circumference history chart.</canvas>
        <div class="waist-chart-tooltip" id="waist-trend-tooltip" hidden aria-live="polite"></div>
        <p class="waist-chart-empty" id="waist-trend-empty" hidden>No waist circumference readings logged yet. Your first measurement will appear here automatically.</p>
      </div>
    `;

    const bpSection = doc.getElementById('bp-trend-section');
    const weightSection = doc.getElementById('weight-trend-section');
    const hero = doc.querySelector('.hero');
    if (bpSection) bpSection.after(section);
    else if (weightSection) weightSection.after(section);
    else if (hero) hero.before(section);
    else doc.querySelector('main')?.appendChild(section);
  }

  function setText(doc, id, value) {
    const element = doc.getElementById(id);
    if (element) element.textContent = value;
  }

  function hideTooltip(doc) {
    const tooltip = doc.getElementById('waist-trend-tooltip');
    if (tooltip) tooltip.hidden = true;
  }

  function positionTooltip(doc, point) {
    const tooltip = doc.getElementById('waist-trend-tooltip');
    if (!tooltip || !chartState) return;
    const entry = chartState.series[point.index];
    const safeX = Math.min(Math.max(point.x, 80), chartState.cssWidth - 80);
    tooltip.innerHTML = `
      <strong>${formatDate(entry.timestamp, true)}</strong>
      <span>Waist: ${formatCm(entry.waistCm)}</span>
      <span>7-day avg: ${formatCm(entry.avg7)}</span>
      <span>14-day avg: ${formatCm(entry.avg14)}</span>
    `;
    tooltip.style.left = `${safeX}px`;
    tooltip.style.top = `${Math.max(55, point.y)}px`;
    tooltip.hidden = false;
  }

  function installInteraction(doc) {
    const canvas = doc.getElementById('waist-trend-canvas');
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
      if (nearest && nearestDistance <= 34) positionTooltip(doc, nearest);
      else hideTooltip(doc);
    }

    canvas.addEventListener('pointermove', showNearest);
    canvas.addEventListener('pointerdown', showNearest);
    canvas.addEventListener('pointerleave', () => hideTooltip(doc));
  }

  function drawChart(doc, history, payload = {}) {
    currentHistory = history;
    const series = buildSeries(history);
    const canvas = doc.getElementById('waist-trend-canvas');
    const wrap = doc.getElementById('waist-trend-wrap');
    const empty = doc.getElementById('waist-trend-empty');
    const summary = doc.getElementById('waist-trend-summary');
    if (!canvas || !wrap || !empty || !summary) return;

    hideTooltip(doc);

    if (!series.length) {
      canvas.hidden = true;
      empty.hidden = false;
      summary.hidden = true;
      chartState = null;
      return;
    }

    canvas.hidden = false;
    empty.hidden = true;
    summary.hidden = false;

    const latest = series[series.length - 1];
    const avg7 = toNumber(payload.waist7dAvg) ?? latest.avg7;
    const avg14 = toNumber(payload.waist14dAvg) ?? latest.avg14;

    setText(doc, 'waist-trend-latest', formatCm(latest.waistCm));
    setText(doc, 'waist-trend-avg7', formatCm(avg7));
    setText(doc, 'waist-trend-avg14', formatCm(avg14));
    setText(doc, 'waist-trend-count', series.length.toString());

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
    const margin = { top: 18, right: compact ? 18 : 22, bottom: 42, left: compact ? 49 : 58 };
    const plotWidth = cssWidth - margin.left - margin.right;
    const plotHeight = cssHeight - margin.top - margin.bottom;

    const values = series.flatMap(entry => [entry.waistCm, entry.avg7, entry.avg14]).filter(Number.isFinite);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const pad = Math.max(2, (rawMax - rawMin) * 0.22);
    const yMin = Math.floor((rawMin - pad) * 2) / 2;
    const yMax = Math.ceil((rawMax + pad) * 2) / 2;
    const yRange = Math.max(4, yMax - yMin);
    const startTime = series[0].timestamp;
    const endTime = series[series.length - 1].timestamp;
    const pointCount = series.length;
    const xForIndex = index => pointCount === 1
      ? margin.left + plotWidth / 2
      : margin.left + (index / Math.max(1, pointCount - 1)) * plotWidth;
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
      context.fillText(value.toFixed(1), margin.left - 8, y);
    }

    context.fillStyle = '#B6C9DB';
    context.textAlign = 'left';
    context.fillText('cm', 10, margin.top - 6);

    if (series.length === 1) {
      context.textAlign = 'center';
      context.fillText(formatDate(series[0].timestamp), xForIndex(0), cssHeight - 17);
    } else {
      const totalDays = Math.max(1, Math.round((endTime - startTime) / (24 * 60 * 60 * 1000)));
      const desiredTicks = compact ? 4 : 6;
      const step = Math.max(1, Math.ceil((series.length - 1) / (desiredTicks - 1)));
      series.forEach((entry, index) => {
        if (index % step !== 0 && index !== series.length - 1) return;
        const x = xForIndex(index);
        context.fillStyle = '#B6C9DB';
        context.textAlign = index === 0 ? 'left' : index === series.length - 1 ? 'right' : 'center';
        context.fillText(formatDate(entry.timestamp, totalDays > 300), x, cssHeight - 17);
      });
    }

    function drawSeries(key, strokeStyle, lineWidth) {
      let started = false;
      context.beginPath();
      series.forEach((entry, index) => {
        const value = entry[key];
        if (!Number.isFinite(value)) return;
        const x = xForIndex(index);
        const y = yFor(value);
        if (!started) {
          context.moveTo(x, y);
          started = true;
        } else {
          context.lineTo(x, y);
        }
      });
      if (!started) return;
      context.strokeStyle = strokeStyle;
      context.lineWidth = lineWidth;
      context.lineJoin = 'round';
      context.lineCap = 'round';
      context.stroke();
    }

    drawSeries('waistCm', '#7DB9E8', 2.4);
    drawSeries('avg7', '#FF8126', 3.2);
    drawSeries('avg14', '#45DB70', 3.8);

    const interactivePoints = series.map((entry, index) => {
      const x = xForIndex(index);
      const y = yFor(entry.waistCm);
      context.beginPath();
      context.arc(x, y, index === series.length - 1 ? 4.8 : 3.6, 0, Math.PI * 2);
      context.fillStyle = '#7DB9E8';
      context.fill();
      context.lineWidth = 1.4;
      context.strokeStyle = 'rgba(7,24,42,.98)';
      context.stroke();
      return { index, x, y };
    });

    canvas.setAttribute(
      'aria-label',
      `Waist circumference history. Latest measurement ${formatCm(latest.waistCm)}. ` +
      `Seven-day average ${formatCm(avg7)}. Fourteen-day average ${formatCm(avg14)}.`
    );

    chartState = { cssWidth, series, interactivePoints };
    installInteraction(doc);
  }

  async function loadHistory(doc) {
    try {
      let payload;
      if (typeof window.getHealthData === 'function') {
        payload = await window.getHealthData();
      } else {
        const response = await fetch(`${HEALTH_DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        payload = await response.json();
      }
      const data = payload.metrics || payload;
      drawChart(doc, parseHistory(data.waistHistory), data);
    } catch (error) {
      console.warn('Waist progress failed to load:', error);
      drawChart(doc, []);
    }
  }

  function initialise() {
    try {
      const doc = frame?.contentDocument;
      if (!doc) return;
      injectChart(doc);
      loadHistory(doc);

      const view = doc.defaultView;
      if (view && !view.__waistChartLiveRefreshInstalled) {
        view.__waistChartLiveRefreshInstalled = true;

        const refreshLiveData = () => {
          if (doc.visibilityState !== 'hidden') loadHistory(doc);
        };

        view.setInterval(refreshLiveData, 60000);
        view.addEventListener('focus', refreshLiveData);
        doc.addEventListener('visibilitychange', () => {
          if (doc.visibilityState === 'visible') refreshLiveData();
        });
      }

      let resizeFrame;
      doc.defaultView?.addEventListener('resize', () => {
        doc.defaultView.cancelAnimationFrame(resizeFrame);
        resizeFrame = doc.defaultView.requestAnimationFrame(() => {
          if (currentHistory.length) drawChart(doc, currentHistory);
        });
      });
    } catch (error) {
      console.warn('Unable to add waist chart:', error);
    }
  }

  frame?.addEventListener('load', initialise);
  if (frame?.contentDocument?.readyState === 'complete') queueMicrotask(initialise);
})();