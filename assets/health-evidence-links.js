(() => {
  const frame = document.querySelector('.page-frame');
  if (!frame) return;

  function linkifyEvidence(doc) {
    const evidence = doc.getElementById('evidence-source');
    if (!evidence) return;

    const text = evidence.textContent || '';
    if (!text.includes('https://')) return;
    if (evidence.dataset.linkifiedText === text) return;

    const urlPattern = /https:\/\/[^\s]+/g;
    const fragment = doc.createDocumentFragment();
    let lastIndex = 0;
    let match;

    while ((match = urlPattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        fragment.append(doc.createTextNode(text.slice(lastIndex, match.index)));
      }

      const link = doc.createElement('a');
      link.href = match[0];
      link.textContent = match[0];
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.style.color = '#7DB9E8';
      link.style.textDecoration = 'underline';
      link.style.textUnderlineOffset = '2px';
      fragment.append(link);

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      fragment.append(doc.createTextNode(text.slice(lastIndex)));
    }

    evidence.replaceChildren(fragment);
    evidence.dataset.linkifiedText = text;
    evidence.style.whiteSpace = 'pre-line';
  }

  function install(doc) {
    const evidence = doc.getElementById('evidence-source');
    if (!evidence || evidence.dataset.evidenceObserver === 'true') return;

    evidence.dataset.evidenceObserver = 'true';
    const observer = new doc.defaultView.MutationObserver(() => linkifyEvidence(doc));
    observer.observe(evidence, { childList: true, subtree: true, characterData: true });
    linkifyEvidence(doc);
  }

  function onFrameReady() {
    try {
      if (frame.contentDocument) install(frame.contentDocument);
    } catch (error) {
      console.warn('Health evidence links could not initialise:', error);
    }
  }

  frame.addEventListener('load', onFrameReady);
  onFrameReady();
})();
