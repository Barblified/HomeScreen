(() => {
  const HEALTH_DATA_URL = 'https://script.google.com/macros/s/AKfycbwihWQw8Frs1acA1Y-CELBw0NmX4O5KFzcqU3f8TbFpSegleKyPM64TkqTyoNyAWhLP/exec';
  const ATTENTION_URL = '/HomeScreen/assets/attention-feed.json';
  const CORE_SPRITE = '/HomeScreen/assets/quick-links.svg';
  const EXTRA_SPRITE = '/HomeScreen/assets/quick-links-extra.svg';
  const isAndroid = /Android/i.test(navigator.userAgent);

  const favourites = [
    { title: 'ChatGPT', href: 'https://chatgpt.com/', icon: 'chatgpt', sprite: EXTRA_SPRITE, packageName: 'com.openai.chatgpt' },
    { title: 'Gmail', href: 'https://mail.google.com/mail/u/0/', icon: 'gmail', sprite: CORE_SPRITE, packageName: 'com.google.android.gm' },
    { title: 'WhatsApp', href: 'https://web.whatsapp.com/', icon: 'whatsapp', sprite: CORE_SPRITE, packageName: 'com.whatsapp' },
    { title: 'Bible.com', href: 'https://www.bible.com/', icon: 'bible', sprite: CORE_SPRITE, packageName: 'com.sirma.mobile.bible.android' },
    { title: 'ATHLEAN-X', href: 'https://portal.athleanx.com/dashboard/index/index/m-ax1/m-allax-12/m-beaxst/m-jacked/m-infshred/m-torched/m-xero', icon: 'athleanx', sprite: CORE_SPRITE },
    { title: 'MyFitnessPal', href: 'https://www.myfitnesspal.com/', icon: 'myfitnesspal', sprite: CORE_SPRITE, packageName: 'com.myfitnesspal.android' },
    { title: 'Spotify', href: 'https://open.spotify.com/', icon: 'spotify', sprite: CORE_SPRITE, packageName: 'com.spotify.music' },
    { title: 'YouTube', href: 'https://www.youtube.com/', icon: 'youtube', sprite: CORE_SPRITE, packageName: 'com.google.android.youtube' }
  ];

  const categories = [
    {
      name: 'AI & Research',
      description: 'Reasoning, search and specialist research tools.',
      links: [
        { title: 'Claude', href: 'https://claude.ai/', icon: 'claude', sprite: EXTRA_SPRITE },
        { title: 'OSINT Framework', href: 'https://osintframework.com/', icon: 'osintframework', sprite: EXTRA_SPRITE },
        { title: 'Perplexity', href: 'https://perplexity.ai/', icon: 'perplexity', sprite: EXTRA_SPRITE },
        { title: 'PimEyes', href: 'https://pimeyes.com/', icon: 'pimeyes', sprite: EXTRA_SPRITE },
        { title: 'Quiver Quant', href: 'https://www.quiverquant.com/', icon: 'quiverquant', sprite: EXTRA_SPRITE }
      ]
    },
    {
      name: 'Work & Productivity',
      description: 'Scheduling, forms and practical utilities.',
      links: [
        { title: 'Alt Codes', href: 'https://www.alt-codes.net/', icon: 'altcodes', sprite: CORE_SPRITE },
        { title: 'CalendarBridge', href: 'https://app.calendarbridge.com/dashboard', icon: 'calendarbridge', sprite: CORE_SPRITE },
        { title: 'Calendly', href: 'https://calendly.com/app/scheduling/meeting_types/user/me', icon: 'calendly', sprite: CORE_SPRITE },
        { title: 'DeskSpacing', href: 'https://deskspacing.com/', icon: 'deskspacing', sprite: EXTRA_SPRITE },
        { title: 'Google Form', href: 'https://docs.google.com/forms/d/e/1FAIpQLSc2ueNtIKAbUeFeBTWG5Mzopj5nhDQ9InBgz8zCeOI6dbmuuw/viewform', icon: 'googleforms', sprite: CORE_SPRITE }
      ]
    },
    {
      name: 'Travel & Tracking',
      description: 'Travel planning and live movement tracking.',
      links: [
        { title: 'AccuWeather', href: 'https://www.accuweather.com/', icon: 'accuweather', sprite: CORE_SPRITE, packageName: 'com.accuweather.android' },
        { title: 'Booking.com', href: 'https://www.booking.com/', icon: 'booking', sprite: EXTRA_SPRITE },
        { title: 'Flightradar24', href: 'https://www.flightradar24.com/', icon: 'flightradar24', sprite: EXTRA_SPRITE },
        { title: 'Signalbox', href: 'https://signalbox.io/', icon: 'signalbox', sprite: EXTRA_SPRITE },
        { title: 'Skiplagged', href: 'https://skiplagged.com/', icon: 'skiplagged', sprite: EXTRA_SPRITE },
        { title: 'VesselFinder', href: 'https://www.vesselfinder.com/', icon: 'vesselfinder', sprite: EXTRA_SPRITE }
      ]
    },
    {
      name: 'Learning & Skills',
      description: 'Structured learning and practical skill-building.',
      links: [
        { title: 'edX', href: 'https://www.edx.org/', icon: 'edx', sprite: EXTRA_SPRITE },
        { title: 'Hacksplaining', href: 'https://www.hacksplaining.com/', icon: 'hacksplaining', sprite: EXTRA_SPRITE },
        { title: 'MuscleWiki', href: 'https://musclewiki.com/', icon: 'musclewiki', sprite: EXTRA_SPRITE }
      ]
    },
    {
      name: 'Life & Leisure',
      description: 'Family, entertainment, hobbies and useful rabbit holes.',
      links: [
        { title: 'Compass', href: 'https://leenmillsprimary-uk.compass.education/', icon: 'compass', sprite: CORE_SPRITE, packageName: 'com.jdlf.compass' },
        { title: 'Disney+', href: 'https://www.disneyplus.com/', icon: 'disneyplus', sprite: CORE_SPRITE, packageName: 'com.disney.disneyplus' },
        { title: 'Explore.org', href: 'https://explore.org/', icon: 'explore', sprite: EXTRA_SPRITE },
        { title: 'Franco Specialty Coffee', href: 'https://www.francospecialty.coffee/', icon: 'franco', sprite: CORE_SPRITE },
        { title: 'GeekPrank', href: 'https://geekprank.com/', icon: 'geekprank', sprite: EXTRA_SPRITE },
        { title: 'Heinnie Haynes', href: 'https://heinnie.com/', icon: 'heinnie', sprite: CORE_SPRITE },
        { title: 'Make Me a Cocktail', href: 'https://makemeacocktail.com/', icon: 'makemeacocktail', sprite: EXTRA_SPRITE },
        { title: 'myNoise', href: 'https://mynoise.net/', icon: 'mynoise', sprite: EXTRA_SPRITE }
      ]
    }
  ];

  const discovery = [
    { title: 'Explore.org', href: 'https://explore.org/', icon: 'explore', sprite: EXTRA_SPRITE, reason: 'Drop into a live nature camera and watch somewhere else in the world for a few minutes.' },
    { title: 'myNoise', href: 'https://mynoise.net/', icon: 'mynoise', sprite: EXTRA_SPRITE, reason: 'Build a soundscape for focus, calm or background texture.' },
    { title: 'Hacksplaining', href: 'https://www.hacksplaining.com/', icon: 'hacksplaining', sprite: EXTRA_SPRITE, reason: 'Learn one security concept interactively instead of reading a long article.' },
    { title: 'GeekPrank', href: 'https://geekprank.com/', icon: 'geekprank', sprite: EXTRA_SPRITE, reason: 'A deliberately unserious five-minute detour.' },
    { title: 'Make Me a Cocktail', href: 'https://makemeacocktail.com/', icon: 'makemeacocktail', sprite: EXTRA_SPRITE, reason: 'Turn whatever is in the cupboard into an idea for later.' },
    { title: 'edX', href: 'https://www.edx.org/', icon: 'edx', sprite: EXTRA_SPRITE, reason: 'Pick a subject and follow a structured learning trail.' }
  ];

  function buildAndroidIntent(webUrl, packageName) {
    const url = new URL(webUrl);
    const target = `${url.host}${url.pathname}${url.search}${url.hash}`;
    return `intent://${target}#Intent;scheme=${url.protocol.replace(':', '')};package=${packageName};S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
  }

  function makeIcon(link) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    const ref = `${link.sprite}#${link.icon}`;
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    use.setAttribute('href', ref);
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', ref);
    svg.appendChild(use);
    return svg;
  }

  function makeLink(link, className = 'tool-link') {
    const anchor = document.createElement('a');
    anchor.className = className;
    anchor.href = link.href;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.title = link.title;
    anchor.setAttribute('aria-label', `Open ${link.title}`);
    anchor.append(makeIcon(link));

    const label = document.createElement('span');
    label.textContent = link.title;
    anchor.append(label);

    if (isAndroid && link.packageName) {
      anchor.addEventListener('click', event => {
        event.preventDefault();
        window.top.location.href = buildAndroidIntent(link.href, link.packageName);
      });
    }

    return anchor;
  }

  function renderFavourites() {
    const container = document.getElementById('favourites-grid');
    if (!container) return;
    favourites.forEach(link => container.append(makeLink(link, 'favourite-link')));
  }

  function renderCategories() {
    const container = document.getElementById('link-groups');
    if (!container) return;
    const mobile = window.matchMedia('(max-width: 760px)').matches;

    categories.forEach(category => {
      const details = document.createElement('details');
      details.className = 'link-group';
      if (!mobile) details.open = true;

      const summary = document.createElement('summary');
      summary.innerHTML = `<span>${category.name}</span><small>${category.description}</small>`;
      details.append(summary);

      const grid = document.createElement('div');
      grid.className = 'tool-grid';
      [...category.links]
        .sort((a, b) => a.title.localeCompare(b.title, 'en-GB', { sensitivity: 'base' }))
        .forEach(link => grid.append(makeLink(link)));
      details.append(grid);
      container.append(details);
    });
  }

  function severityRank(value) {
    return ({ urgent: 0, today: 1, important: 2, later: 3 })[value] ?? 4;
  }

  function severityLabel(value) {
    return ({ urgent: 'Urgent', today: 'Today', important: 'Important', later: 'Later' })[value] || 'Info';
  }

  function makeAttentionItem(item) {
    const wrapper = document.createElement(item.detail ? 'details' : 'a');
    wrapper.className = `attention-item severity-${item.severity || 'important'}`;

    if (!item.detail) {
      wrapper.href = item.href || '#';
      if (item.href) {
        wrapper.target = '_blank';
        wrapper.rel = 'noopener noreferrer';
      }
    }

    const header = document.createElement(item.detail ? 'summary' : 'div');
    header.className = 'attention-item-header';
    header.innerHTML = `
      <span class="severity-chip">${severityLabel(item.severity)}</span>
      <strong>${item.title || 'Attention item'}</strong>
    `;
    wrapper.append(header);

    if (item.summary) {
      const summary = document.createElement('p');
      summary.textContent = item.summary;
      wrapper.append(summary);
    }

    const metaParts = [item.source, item.when].filter(Boolean);
    if (metaParts.length) {
      const meta = document.createElement('small');
      meta.className = 'attention-meta';
      meta.textContent = metaParts.join(' · ');
      wrapper.append(meta);
    }

    if (item.detail) {
      const detail = document.createElement('div');
      detail.className = 'attention-detail';
      detail.textContent = item.detail;
      if (item.href) {
        const sourceLink = document.createElement('a');
        sourceLink.href = item.href;
        sourceLink.target = '_blank';
        sourceLink.rel = 'noopener noreferrer';
        sourceLink.textContent = 'Open source';
        detail.append(document.createElement('br'), sourceLink);
      }
      wrapper.append(detail);
    }

    return wrapper;
  }

  async function renderAttention() {
    const primary = document.getElementById('attention-primary');
    const overflow = document.getElementById('attention-overflow');
    const more = document.getElementById('attention-more');
    const status = document.getElementById('attention-status');
    if (!primary || !overflow || !more || !status) return;

    try {
      const response = await fetch(`${ATTENTION_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const items = Array.isArray(payload.items) ? payload.items : [];

      if (!payload.connected) {
        status.innerHTML = '<strong>Feed ready</strong><span>No live attention feed has been published yet. Scheduled workflows can populate this slot without another redesign.</span>';
        more.hidden = true;
        return;
      }

      if (!items.length) {
        status.classList.add('all-clear');
        status.innerHTML = '<strong>All clear</strong><span>Nothing currently needs action and there are no material alerts.</span>';
        if (payload.updatedAt) {
          const stamp = document.getElementById('attention-updated');
          if (stamp) stamp.textContent = `Updated ${new Date(payload.updatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`;
        }
        more.hidden = true;
        return;
      }

      status.hidden = true;
      const sorted = [...items].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
      const urgent = sorted.filter(item => item.severity === 'urgent');
      const remaining = sorted.filter(item => item.severity !== 'urgent');
      const visible = [...urgent];

      for (const item of remaining) {
        if (visible.length >= 5) break;
        if (item.severity === 'today' || item.severity === 'important') visible.push(item);
      }

      if (!visible.length) visible.push(...remaining.slice(0, 5));
      const hidden = sorted.filter(item => !visible.includes(item));

      visible.forEach(item => primary.append(makeAttentionItem(item)));
      hidden.forEach(item => overflow.append(makeAttentionItem(item)));
      more.hidden = hidden.length === 0;
      const count = document.getElementById('attention-count');
      if (count) count.textContent = `${items.length} item${items.length === 1 ? '' : 's'}`;

      if (payload.updatedAt) {
        const stamp = document.getElementById('attention-updated');
        if (stamp) stamp.textContent = `Updated ${new Date(payload.updatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}`;
      }
    } catch (error) {
      console.warn('Attention feed failed to load:', error);
      status.innerHTML = '<strong>Attention feed unavailable</strong><span>The rest of HomeScreen is unaffected.</span>';
      more.hidden = true;
    }
  }

  function toNumber(value) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const number = Number(String(value).replace(/,/g, '').trim());
    return Number.isFinite(number) ? number : null;
  }

  function parseHistory(value) {
    let history = value;
    if (typeof history === 'string') {
      try { history = JSON.parse(history); } catch { return []; }
    }
    if (!Array.isArray(history)) return [];
    return history
      .map(entry => ({
        date: entry?.date || '',
        timestamp: Date.parse(`${entry?.date || ''}T12:00:00`),
        weightKg: toNumber(entry?.weightKg)
      }))
      .filter(entry => entry.date && Number.isFinite(entry.timestamp) && entry.weightKg !== null && entry.weightKg > 0)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  function rolling(history, windowDays, minimumReadings) {
    const span = (windowDays - 1) * 86400000;
    return history.map(entry => {
      const start = entry.timestamp - span;
      const readings = history.filter(candidate => candidate.timestamp >= start && candidate.timestamp <= entry.timestamp);
      return {
        ...entry,
        averageKg: readings.length >= minimumReadings
          ? readings.reduce((sum, reading) => sum + reading.weightKg, 0) / readings.length
          : null
      };
    });
  }

  function latestAverage(series) {
    for (let index = series.length - 1; index >= 0; index -= 1) {
      if (series[index].averageKg !== null) return { index, value: series[index].averageKg };
    }
    return null;
  }

  async function renderHealthSummary() {
    const status = document.getElementById('health-status');
    try {
      const response = await fetch(`${HEALTH_DATA_URL}?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      const data = payload.metrics || payload;
      const history = parseHistory(data.weightHistory);
      if (!history.length) throw new Error('No weight history');

      const latest = history[history.length - 1];
      const sevenSeries = rolling(history, 7, 4);
      const fourteenSeries = rolling(history, 14, 8);
      const seven = latestAverage(sevenSeries);
      const fourteen = latestAverage(fourteenSeries);

      document.getElementById('health-current').textContent = `${latest.weightKg.toFixed(1)} kg`;
      document.getElementById('health-seven').textContent = seven ? `${seven.value.toFixed(1)} kg` : '—';
      document.getElementById('health-fourteen').textContent = fourteen ? `${fourteen.value.toFixed(1)} kg` : '—';

      let trendText = 'Trend not available yet';
      let trendClass = 'trend-flat';
      if (seven) {
        let previous = null;
        for (let index = seven.index - 1; index >= 0; index -= 1) {
          if (sevenSeries[index].averageKg !== null) {
            previous = sevenSeries[index].averageKg;
            break;
          }
        }
        if (previous !== null) {
          const delta = seven.value - previous;
          if (Math.abs(delta) < 0.05) {
            trendText = '7-day trend stable';
          } else if (delta < 0) {
            trendText = `7-day trend down ${Math.abs(delta).toFixed(1)} kg`;
            trendClass = 'trend-down';
          } else {
            trendText = `7-day trend up ${delta.toFixed(1)} kg`;
            trendClass = 'trend-up';
          }
        }
      }

      status.className = `health-trend ${trendClass}`;
      status.textContent = trendText;
    } catch (error) {
      console.warn('Health summary failed to load:', error);
      status.className = 'health-trend trend-flat';
      status.textContent = 'Health data unavailable';
    }
  }

  function renderDiscovery() {
    const today = new Date();
    const seed = Number(`${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`);
    const pick = discovery[seed % discovery.length];
    const container = document.getElementById('discovery-pick');
    if (!container) return;

    const link = makeLink(pick, 'discovery-link');
    const reason = document.createElement('p');
    reason.textContent = pick.reason;
    container.append(link, reason);

    const list = document.getElementById('discovery-list');
    if (list) discovery.forEach(item => list.append(makeLink(item)));
  }

  function renderDate() {
    const target = document.getElementById('today-label');
    if (!target) return;
    target.textContent = new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(new Date());
  }

  renderDate();
  renderFavourites();
  renderCategories();
  renderDiscovery();
  renderAttention();
  renderHealthSummary();
})();
