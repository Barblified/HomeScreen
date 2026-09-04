(() => {
  const frame = document.querySelector('.page-frame');

  function formatDate(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0')
    ].join('');
  }

  function configureThreeDayCalendar() {
    try {
      const doc = frame?.contentDocument;
      const calendar = doc?.querySelector('.calendar-frame');
      if (!doc || !calendar) return;

      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 3);

      const startDate = formatDate(start);
      const endDate = formatDate(end);
      const src = `https://calendar.google.com/calendar/embed?src=tguyler11%40gmail.com&ctz=Europe%2FLondon&mode=WEEK&dates=${startDate}%2F${endDate}&wkst=2&showTabs=0&showCalendars=0&showTz=0`;

      if (calendar.src !== src) calendar.src = src;
      calendar.title = 'Google Calendar three-day view';

      const heading = doc.getElementById('calendar-heading');
      if (heading) {
        heading.textContent = '3 Day Calendar';
        const headingRow = heading.closest('.section-heading');
        const descriptor = headingRow?.querySelector(':scope > p');
        if (descriptor) descriptor.textContent = 'Today + next two days';
      }
    } catch (error) {
      console.warn('Unable to configure three-day calendar view:', error);
    }
  }

  frame?.addEventListener('load', configureThreeDayCalendar);
  if (frame?.contentDocument?.readyState === 'complete') {
    queueMicrotask(configureThreeDayCalendar);
  }
})();
