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

  function repairDailyAnalysis(doc) {
    const list = doc.getElementById('daily-analysis');
    if (!list) return;

    const items = Array.from(list.querySelectorAll(':scope > li'))
      .map(item => item.textContent.trim())
      .filter(Boolean);
    if (!items.length) return;

    const joined = items.join(' ').replace(/\s+([,.;:!?])/g, '$1');
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
    list.dataset.repairedSource = sentences.join(' ');
  }

  function install(doc) {
    const list = doc.getElementById('daily-analysis');
    if (!list || list.dataset.readabilityObserver === 'true') return;

    list.dataset.readabilityObserver = 'true';
    let repairing = false;
    const observer = new doc.defaultView.MutationObserver(() => {
      if (repairing) return;
      repairing = true;
      try {
        repairDailyAnalysis(doc);
      } finally {
        repairing = false;
      }
    });
    observer.observe(list, { childList: true, subtree: true, characterData: true });
    repairDailyAnalysis(doc);
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
