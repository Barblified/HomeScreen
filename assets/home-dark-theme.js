(() => {
  const frame = document.querySelector('.page-frame');

  function applyDarkTheme() {
    try {
      const doc = frame?.contentDocument;
      if (!doc || doc.getElementById('home-dark-theme')) return;

      const link = doc.createElement('link');
      link.id = 'home-dark-theme';
      link.rel = 'stylesheet';
      link.href = '/HomeScreen/assets/home-dark-theme.css';
      doc.head.appendChild(link);
    } catch (error) {
      console.warn('Unable to apply HomeScreen dark theme:', error);
    }
  }

  frame?.addEventListener('load', applyDarkTheme);
  if (frame?.contentDocument?.readyState === 'complete') {
    queueMicrotask(applyDarkTheme);
  }
})();
