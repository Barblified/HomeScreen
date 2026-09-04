(() => {
  const frame = document.querySelector('.page-frame');

  function configureDayCalendar() {
    try {
      const doc = frame?.contentDocument;
      const calendar = doc?.querySelector('.calendar-frame');
      if (!doc || !calendar) return;

      const src = 'https://calendar.google.com/calendar/embed?src=tguyler11%40gmail.com&ctz=Europe%2FLondon&mode=DAY&wkst=2&showTabs=0&showCalendars=0&showTz=0';

      if (calendar.src !== src) calendar.src = src;
      calendar.title = 'Google Calendar day view';

      const heading = doc.getElementById('calendar-heading');
      if (heading) {
        heading.textContent = 'Day Calendar';
        const headingRow = heading.closest('.section-heading');
        const descriptor = headingRow?.querySelector(':scope > p');
        if (descriptor) descriptor.textContent = 'Today';
      }
    } catch (error) {
      console.warn('Unable to configure calendar day view:', error);
    }
  }

  frame?.addEventListener('load', configureDayCalendar);
  if (frame?.contentDocument?.readyState === 'complete') {
    queueMicrotask(configureDayCalendar);
  }
})();
