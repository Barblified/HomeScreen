(() => {
  const frame = document.querySelector('.page-frame');
  if (!frame) return;

  function splitSentencesSafely(text) {
    const value = String(text || '').replace(/\s+/g, ' ').trim();
    if (!value) return [];

    const abbreviations = [
      'et al.', 'e.g.', 'i.e.', 'vs.', 'dr.', 'mr.', 'mrs.', 'ms.',
      'prof.', 'fig.', 'no.', 'st.', 'approx.'
    ];
    const sentences = [];
    let start = 0;

    for (let i = 0; i < value.length; i += 1) {
      const char = value[i];
      if (!'.!?'.includes(char)) continue;

      const previous = value[i - 1] || '';
      const next = value[i + 1] || '';
      if (char === '.' && /\d/.test(previous) && /\d/.test(next)) continue;

      const prefix = value.slice(Math.max(0, i - 12), i + 1).toLowerCase();
      if (abbreviations.some(abbreviation => prefix.endsWith(abbreviation))) continue;

      let nextIndex = i + 1;
      while (nextIndex < value.length && /\s/.test(value[nextIndex])) nextIndex += 1;
      const nextVisible = value[nextIndex] || '';

      if (nextVisible && /[,;:)}\]]/.test(nextVisible)) continue;
      if (nextVisible && !/[A-Z0-9]/.test(nextVisible)) continue;

      const sentence = value.slice(start, i + 1).trim();
      if (sentence) sentences.push(sentence);
      start = i + 1;
    }

    const remainder = value.slice(start).trim();
    if (remainder) sentences.push(remainder);
    return sentences;
  }

  function stitchParserFragments(items) {
    const stitched = [];

    items.forEach(item => {
      if (!stitched.length) {
        stitched.push(item);
        return;
      }

      const previous = stitched[stitched.length - 1];

      // Rejoin ordinary decimal measurements split by the primary sentence parser,
      // e.g. "111." + "6 kg" -> "111.6 kg".
      if (/\d\.$/.test(previous) && /^\d+(?:\s*(?:kg|g|h|cm|mm|kcal|%|mg)\b|\s|$)/i.test(item)) {
        stitched[stitched.length - 1] = previous + item;
        return;
      }

      // Rejoin BP pairs with decimal components,
      // e.g. "BP average is 134." + "5/72." + "5; ..."
      // -> "BP average is 134.5/72.5; ...".
      if (/\b(?:bp|blood pressure)[^.!?]*\d+\.$/i.test(previous) && /^\d+\/\d+\.$/.test(item)) {
        stitched[stitched.length - 1] = previous + item;
        return;
      }

      if (/\b(?:bp|blood pressure)[^!?]*\d+\.\d+\/\d+\.$/i.test(previous) && /^\d+(?=\s|[;,.:]|$)/.test(item)) {
        stitched[stitched.length - 1] = previous + item;
        return;
      }

      if (/\bet al\.$/i.test(previous) && /^,\s*\d{4}\b/.test(item)) {
        stitched[stitched.length - 1] = previous + item;
        return;
      }

      stitched.push(item);
    });

    return stitched;
  }

  function repairDailyAnalysis(doc) {
    const list = doc.getElementById('daily-analysis');
    if (!list) return;

    const items = Array.from(list.querySelectorAll(':scope > li'))
      .map(item => item.textContent.trim())
      .filter(Boolean);
    if (!items.length) return;

    const stitched = stitchParserFragments(items);
    const joined = stitched.join(' ').replace(/\s+([,.;:!?])/g, '$1');
    if (list.dataset.repairedSource === joined) return;

    const sentences = splitSentencesSafely(joined);
    if (!sentences.length) return;

    const fragment = doc.createDocumentFragment();
    sentences.forEach(sentence => {
      const item = doc.createElement('li');
      item.textContent = sentence;
      fragment.append(item);
    });

    list.replaceChildren(fragment);
    list.dataset.repairedSource = joined;
  }

  function installCitationStyle(doc) {
    if (doc.getElementById('nehemiah-inline-citation-style')) return;

    const style = doc.createElement('style');
    style.id = 'nehemiah-inline-citation-style';
    style.textContent = `
      .inline-citation {
        color: #F4FF00;
        font-weight: 700;
      }
    `;
    doc.head.appendChild(style);
  }

  function highlightCitationText(doc, element) {
    if (!element) return;
    const text = element.textContent || '';
    if (!text.trim()) return;
    if (element.dataset.citationSource === text) return;

    const pattern = /\(([^()]*(?:\b(?:19|20)\d{2}\b|\bet al\.\b|\bNICE\b|\bNHS\b|\bSACN\b|\bWHO\b|\bACSM\b)[^()]*)\)/gi;
    const fragment = doc.createDocumentFragment();
    let cursor = 0;
    let match;
    let found = false;

    while ((match = pattern.exec(text)) !== null) {
      found = true;
      if (match.index > cursor) fragment.append(doc.createTextNode(text.slice(cursor, match.index)));

      const citation = doc.createElement('span');
      citation.className = 'inline-citation';
      citation.textContent = match[0];
      fragment.append(citation);
      cursor = match.index + match[0].length;
    }

    if (!found) {
      element.dataset.citationSource = text;
      return;
    }

    if (cursor < text.length) fragment.append(doc.createTextNode(text.slice(cursor)));
    element.replaceChildren(fragment);
    element.dataset.citationSource = text;
  }

  function highlightInlineCitations(doc) {
    doc.querySelectorAll(
      '#daily-analysis > li, #recommended-action > li, .trend-card p, #missing-fields'
    ).forEach(element => highlightCitationText(doc, element));
  }

  function installChartPalette(doc) {
    if (doc.getElementById('nehemiah-chart-palette-fix')) return;

    const style = doc.createElement('style');
    style.id = 'nehemiah-chart-palette-fix';
    style.textContent = `
      .chart-card {
        background: #101318 !important;
        border-color: rgba(0,213,255,.34) !important;
        color: #F7F9FB !important;
      }
      .chart-heading h2 { color: #B8FF00 !important; }
      .chart-heading p,
      .chart-note,
      .chart-empty { color: #a8b3ba !important; }
      .chart-wrap { background: #101318 !important; }
      .chart-chip {
        background: #151b21 !important;
        border-color: #d8d2c4 !important;
        color: #29342e !important;
      }
      .chart-chip small { color: #a8b3ba !important; }
      .chart-chip.current { box-shadow: inset 0 3px 0 #F4FF00 !important; }
      .chart-chip.current strong { color: #F4FF00 !important; }
      .chart-chip.seven { box-shadow: inset 0 3px 0 #B8FF00 !important; }
      .chart-chip.seven strong { color: #B8FF00 !important; }
      .chart-chip.fourteen { box-shadow: inset 0 3px 0 #B8FF00 !important; }
      .chart-chip.fourteen strong { color: #B8FF00 !important; }
      .chart-tooltip {
        background: #fbf9f2 !important;
        border-color: #d8d2c4 !important;
        color: #29342e !important;
        box-shadow: 0 5px 18px rgba(0,0,0,.45), 0 0 10px rgba(0,213,255,.12) !important;
      }
    `;
    doc.head.appendChild(style);
  }

  function install(doc) {
    installChartPalette(doc);
    installCitationStyle(doc);

    const list = doc.getElementById('daily-analysis');
    if (!list || list.dataset.readabilityObserver === 'true') return;

    list.dataset.readabilityObserver = 'true';
    let repairing = false;
    const observer = new doc.defaultView.MutationObserver(() => {
      if (repairing) return;
      repairing = true;
      try {
        repairDailyAnalysis(doc);
        highlightInlineCitations(doc);
      } finally {
        repairing = false;
      }
    });
    observer.observe(list, { childList: true, subtree: true, characterData: true });
    repairDailyAnalysis(doc);
    highlightInlineCitations(doc);
  }

  function onFrameReady() {
    try {
      if (frame.contentDocument) install(frame.contentDocument);
    } catch (error) {
      console.warn('Health coach readability enhancement could not initialise:', error);
    }
  }

  frame.addEventListener('load', onFrameReady);
  onFrameReady();
})();