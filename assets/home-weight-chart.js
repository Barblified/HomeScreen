(() => {
  const HEALTH_DATA_URL = "https://script.google.com/macros/s/AKfycbwihWQw8Frs1acA1Y-CELBw0NmX4O5KFzcqU3f8TbFpSegleKyPM64TkqTyoNyAWhLP/exec";
  const frame = document.querySelector('.page-frame');
  let historyCache = [];
  let chartState = null;

  function toNumber(value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const number = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(number) ? number : null;
  }

  function formatKg(value) {
    const number = toNumber(value);
    return number === null ? '—' : `${number.toFixed(1)} kg`;
  }

  function parseWeightHistory(value) {
    let history = value;
    if (typeof history === 'string') {
      try {
        history = JSON.parse(history);
      } catch (error) {
        console.warn('Homepage weight history could not be parsed:', error);
        return [];
      }
    }
    if (!Array.isArray(history)) return [];

    return history
      .map(entry => {
        const weightKg = toNumber(entry?.weightKg);
        const timestamp = Date.parse(`${entry?.date || ''}T12:00:00`);
        return { date: entry?.date || '', timestamp, weightKg };
      })
      .filter(entry => entry.date && Number.isFinite(entry.timestamp) && entry.weightKg !== null && entry.weightKg > 0)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  function buildRollingAverageSeries(history, windowDays, minimumReadings) {
    const windowMs = (windowDays - 1) * 24 * 60 * 60 * 1000;
    return history.map(entry => {
      const windowStart = entry.timestamp - windowMs;
      const readings = history.filter(candidate =>
        candidate.timestamp >= windowStart && candidate.timestamp <= entry.timestamp
      );
      if (readings.length < minimumReadings) {
        return { ...entry, averageKg: null, readingCount: readings.length };
      }
      const averageKg = readings.reduce((sum, reading) => sum + reading.weightKg, 0) / readings.length;
      return { ...entry, averageKg, readingCount: readings.length };
    });
  }

  function latestAvailable(series) {
    for (let index = series.length - 1; index >= 0; index -= 1) {
      if (series[index].averageKg !== null) return series[index];
    }
    return null;
  }

  function formatDate(timestamp, includeYear = false) {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      ...(includeYear ? { year: 'numeric' } : {})
    }).format(new Date(timestamp));
  }

  function injectChart(doc) {
    if (doc.getElementById('home-weight-trend-section')) return;

    const style = doc.createElement('style');
    style.id = 'home-weight-trend-styles';
    style.textContent = `
      .home-weight-card {
        margin: 0 0 30px;
        padding: 22px 24px 24px;
        border: 1px solid rgba(44,181,201,.22);
        border-left: 6px solid #2CB5C9;
        border-radius: 14px;
        background: rgba(255,255,255,.88);
        box-shadow: 0 4px 14px rgba(35,64,61,.12);
        overflow: hidden;
      }
      .home-weight-heading {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 12px;
      }
      .home-weight-heading h3 {
        margin: 0;
        color: #2CB5C9 !important;
      }
      .home-weight-heading p {
        margin: 4px 0 0;
        color: #5E7A78;
        font-size: 22px;
        line-height: 1.15;
      }
      .home-weight-summary {
        display: grid;
        grid-template-columns: repeat(3, minmax(88px, 1fr));
        gap: 8px;
        min-width: min(100%, 330px);
        font-family: system-ui, sans-serif;
      }
      .home-weight-chip {
        padding: 8px 10px 9px;
        border: 1px solid rgba(35,64,61,.12);
        border-radius: 12px;
        background: rgba(255,249,241,.9);
        text-align: center;
      }
      .home-weight-chip small {
        display: block;
        color: #5E7A78;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .05em;
        text-transform: uppercase;
      }
      .home-weight-chip strong {
        display: block;
        margin-top: 2px;
        font-size: 14px;
      }
      .home-weight-chip.current { box-shadow: inset 0 3px 0 #2CB5C9; }
      .home-weight-chip.current strong { color: #168FA2; }
      .home-weight-chip.seven { box-shadow: inset 0 3px 0 #FF8A3D; }
      .home-weight-chip.seven strong { color: #E87428; }
      .home-weight-chip.fourteen { box-shadow: inset 0 3px 0 #2F7D4A; }
      .home-weight-chip.fourteen strong { color: #2F7D4A; }
      .home-weight-note {
        margin: 0 0 9px;
        color: #5E7A78;
        font-family: system-ui, sans-serif;
        font-size: 12px;
      }
      .home-weight-wrap {
        position: relative;
        width: 100%;
        height: 310px;
        border-radius: 14px;
        background: linear-gradient(180deg, rgba(126,214,247,.20), rgba(255,249,241,.72));
        overflow: hidden;
      }
      #home-weight-trend-canvas {
        display: block;
        width: 100%;
        height: 100%;
        touch-action: manipulation;
      }
      .home-weight-tooltip {
        position: absolute;
        z-index: 2;
        min-width: 158px;
        padding: 9px 11px;
        border: 1px solid rgba(35,64,61,.15);
        border-radius: 11px;
        background: rgba(255,249,241,.98);
        box-shadow: 0 6px 18px rgba(35,64,61,.13);
        color: #23403D;
        font-family: system-ui, sans-serif;
        font-size: 12px;
        line-height: 1.42;
        pointer-events: none;
        transform: translate(-50%, calc(-100% - 10px));
      }
      .home-weight-tooltip strong { display: block; margin-bottom: 3px; font-size: 13px; }
      .home-weight-tooltip span { display: block; }
      .home-weight-empty {
        display: grid;
        place-items: center;
        min-height: 180px;
        margin: 0;
        color: #5E7A78;
        font-size: 24px;
        text-align: center;
      }
      @media (max-width: 760px) {
        .home-weight-heading { flex-direction: column; }
        .home-weight-summary { width: 100%; min-width: 0; }
        .home-weight-wrap { height: 270px; }
        .home-weight-card { margin-bottom: 22px; padding: 18px; }
      }
      @media (max-width: 390px) {
        .home-weight-chip { padding-inline: 5px; }
        .home-weight-chip strong { font-size: 12px; }
      }
    `;
    doc.head.appendChild(style);

    const section = doc.createElement('section');
    section.id = 'home-weight-trend-section';
    section.className = 'home-weight-card';
    section.setAttribute('aria-labelledby', 'home-weight-trend-heading');
    section.innerHTML = `
      <div class="home-weight-heading">
        <div>
          <h3 id="home-weight-trend-heading">Weight Progress</h3>
          <p>Daily weigh-ins with short- and medium-term trends.</p>
        </div>
        <div class="home-weight-summary" id="home-weight-trend-summary" hidden>
          <div class="home-weight-chip current"><small>Current</small><strong id="home-weight-current">—</strong></div>
          <div class="home-weight-chip seven"><small>7-day avg</small><strong id="home-weight-seven">—</strong></div>
          <div class="home-weight-chip fourteen"><small>14-day avg</small><strong id="home-weight-fourteen">—</strong></div>
        </div>
      </div>
      <p class="home-weight-note">7-day average needs 4 readings · 14-day average needs 8.</p>
      <div class="home-weight-wrap" id="home-weight-trend-wrap">
        <canvas id="home-weight-trend-canvas" role="img" aria-label="Weight progress chart showing individual weigh-ins plus 7-day and 14-day rolling averages in kilograms by date">Weight history chart.</canvas>
        <div class="home-weight-tooltip" id="home-weight-tooltip" hidden aria-live="polite"></div>
        <p class="home-weight-empty" id="home-weight-empty" hidden>Not enough valid weight logs to draw the trend yet.</p>
      </div>
    `;

    const main = doc.querySelector('.main');
    if (main) main.before(section);
  }

  function setText(doc, id, value) {
    const element = doc.getElementById(id);
    if (element) element.textContent = value;
  }

  function hideTooltip(doc) {
    const tooltip = doc.getElementById('home-weight-tooltip');
    if (tooltip) tooltip.hidden = true;
  }

  function positionTooltip(doc, point) {
    const tooltip = doc.getElementById('home-weight-tooltip');
    if (!tooltip || !chartState) return;
    const { cssWidth, history, sevenDaySeries, fourteenDaySeries } = chartState;
    const raw = history[point.index];
    const seven = sevenDaySeries[point.index]?.averageKg ?? null;
    const fourteen = fourteenDaySeries[point.index]?.averageKg ?? null;
    const safeX = Math.min(Math.max(point.x, 84), cssWidth - 84);
    tooltip.innerHTML = `
      <strong>${formatDate(raw.timestamp, true)}</strong>
      <span>Weight: ${formatKg(raw.weightKg)}</span>
      <span>7-day: ${seven === null ? 'Not available' : formatKg(seven)}</span>
      <span>14-day: ${fourteen === null ? 'Not available' : formatKg(fourteen)}</span>
    `;
    tooltip.style.left = `${safeX}px`;
    tooltip.style.top = `${Math.max(58, point.y)}px`;
    tooltip.hidden = false;
  }

  function installInteraction(doc) {
    const canvas = doc.getElementById('home-weight-trend-canvas');
    if (!canvas || canvas.dataset.interactionReady === 'true') return;
    canvas.dataset.interactionReady = 'true';

    function showNearest(event) {
      if (!chartState?.interactivePoints?.length) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      let nearest = null;
      let nearestDistance = Infinity;
      chartState.interactivePoints.forEach(point => {
        const distance = Math.hypot(point.x - x, point.y - y);
        if (distance < nearestDistance) {
          nearest = point;
          nearestDistance = distance;
        }
      });
      if (nearest && nearestDistance <= 30) positionTooltip(doc, nearest);
      else hideTooltip(doc);
    }

    canvas.addEventListener('pointermove', showNearest);
    canvas.addEventListener('pointerdown', showNearest);
    canvas.addEventListener('pointerleave', () => hideTooltip(doc));
  }

  function drawChart(doc, history) {
    historyCache = history;
    const canvas = doc.getElementById('home-weight-trend-canvas');
    const wrap = doc.getElementById('home-weight-trend-wrap');
    const empty = doc.getElementById('home-weight-empty');
    const summary = doc.getElementById('home-weight-trend-summary');
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
    const sevenDaySeries = buildRollingAverageSeries(history, 7, 4);
    const fourteenDaySeries = buildRollingAverageSeries(history, 14, 8);
    const latestSeven = latestAvailable(sevenDaySeries);
    const latestFourteen = latestAvailable(fourteenDaySeries);

    setText(doc, 'home-weight-current', formatKg(latest.weightKg));
    setText(doc, 'home-weight-seven', latestSeven ? formatKg(latestSeven.averageKg) : '—');
    setText(doc, 'home-weight-fourteen', latestFourteen ? formatKg(latestFourteen.averageKg) : '—');

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

    const weights = history.map(entry => entry.weightKg);
    const rawMin = Math.min(...weights);
    const rawMax = Math.max(...weights);
    const rawRange = rawMax - rawMin;
    const desiredSpan = Math.max(4, Math.ceil((rawRange + 1) * 2) / 2);
    const midpoint = (rawMin + rawMax) / 2;
    let yMin = Math.floor((midpoint - desiredSpan / 2) * 2) / 2;
    let yMax = yMin + desiredSpan;
    if (rawMin < yMin + 0.2) {
      yMin = Math.floor((rawMin - 0.4) * 2) / 2;
      yMax = yMin + desiredSpan;
    }
    if (rawMax > yMax - 0.2) {
      yMax = Math.ceil((rawMax + 0.4) * 2) / 2;
      yMin = yMax - desiredSpan;
    }

    const yRange = Math.max(1, yMax - yMin);
    const startTime = history[0].timestamp;
    const endTime = history[history.length - 1].timestamp;
    const timeRange = Math.max(1, endTime - startTime);
    const xFor = timestamp => margin.left + ((timestamp - startTime) / timeRange) * plotWidth;
    const yFor = weight => margin.top + ((yMax - weight) / yRange) * plotHeight;

    context.font = `${compact ? 10 : 11}px system-ui, sans-serif`;
    context.textBaseline = 'middle';
    context.lineWidth = 1;

    for (let index = 0; index <= 4; index += 1) {
      const ratio = index / 4;
      const y = margin.top + ratio * plotHeight;
      const value = yMax - ratio * yRange;
      context.beginPath();
      context.moveTo(margin.left, y);
      context.lineTo(margin.left + plotWidth, y);
      context.strokeStyle = 'rgba(35,64,61,.085)';
      context.stroke();
      context.fillStyle = '#5E7A78';
      context.textAlign = 'right';
      context.fillText(value.toFixed(1), margin.left - 8, y);
    }

    context.fillStyle = '#5E7A78';
    context.textAlign = 'left';
    context.fillText('kg', 7, margin.top - 6);

    const dayMs = 24 * 60 * 60 * 1000;
    const tickInterval = (compact ? 14 : 7) * dayMs;
    let tick = startTime;
    let tickIndex = 0;
    while (tick <= endTime + dayMs / 2) {
      const x = xFor(tick);
      context.fillStyle = '#5E7A78';
      context.textAlign = tickIndex === 0 ? 'left' : 'center';
      context.fillText(formatDate(tick), x, cssHeight - 17);
      tick += tickInterval;
      tickIndex += 1;
    }

    function drawSeries(series, valueKey, strokeStyle, lineWidth) {
      let drawing = false;
      context.beginPath();
      context.setLineDash([]);
      series.forEach(entry => {
        const value = entry[valueKey];
        if (value === null || value === undefined) {
          drawing = false;
          return;
        }
        const x = xFor(entry.timestamp);
        const y = yFor(value);
        if (!drawing) {
          context.moveTo(x, y);
          drawing = true;
        } else {
          context.lineTo(x, y);
        }
      });
      context.strokeStyle = strokeStyle;
      context.lineWidth = lineWidth;
      context.lineJoin = 'round';
      context.lineCap = 'round';
      context.stroke();
    }

    drawSeries(sevenDaySeries, 'averageKg', '#FF8A3D', 3);
    drawSeries(fourteenDaySeries, 'averageKg', '#2F7D4A', 4.5);

    const interactivePoints = history.map((entry, index) => {
      const x = xFor(entry.timestamp);
      const y = yFor(entry.weightKg);
      context.beginPath();
      context.arc(x, y, index === history.length - 1 ? 4.5 : 3.5, 0, Math.PI * 2);
      context.fillStyle = '#2CB5C9';
      context.fill();
      context.lineWidth = 1.4;
      context.strokeStyle = 'rgba(255,249,241,.98)';
      context.stroke();
      return { index, x, y };
    });

    canvas.setAttribute(
      'aria-label',
      `Weight progress. Current ${latest.weightKg.toFixed(1)} kilograms. ` +
      `7-day average ${latestSeven ? latestSeven.averageKg.toFixed(1) + ' kilograms' : 'not available'}. ` +
      `14-day average ${latestFourteen ? latestFourteen.averageKg.toFixed(1) + ' kilograms' : 'not available'}.`
    );

    chartState = { cssWidth, history, sevenDaySeries, fourteenDaySeries, interactivePoints };
    installInteraction(doc);
  }

  async function loadHistory(doc) {
    try {
      const response = await fetch(`${HEALTH_DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const data = payload.metrics || payload;
      drawChart(doc, parseWeightHistory(data.weightHistory));
    } catch (error) {
      console.warn('Homepage weight progress failed to load:', error);
      drawChart(doc, []);
    }
  }

  function initialise() {
    try {
      const doc = frame?.contentDocument;
      if (!doc || doc.readyState === 'loading') return;
      injectChart(doc);
      loadHistory(doc);

      let resizeFrame;
      doc.defaultView?.addEventListener('resize', () => {
        doc.defaultView.cancelAnimationFrame(resizeFrame);
        resizeFrame = doc.defaultView.requestAnimationFrame(() => {
          if (historyCache.length) drawChart(doc, historyCache);
        });
      }, { once: false });
    } catch (error) {
      console.warn('Unable to add homepage weight chart:', error);
    }
  }

  frame?.addEventListener('load', initialise);
  if (frame?.contentDocument?.readyState === 'complete') initialise();
})();
