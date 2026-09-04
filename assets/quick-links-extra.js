(() => {
  const frame = document.querySelector('.page-frame');
  const ICON_SPRITE = '/HomeScreen/assets/quick-links-extra.svg';
  const REMOVE_TITLES = new Set([
    'E.ggTimer',
    'Google Calendar',
    'Nehemiah',
    'Netflix',
    'Outlook',
    'Teams'
  ]);

  const NEW_LINKS = [
    { id: 'booking-quick-link', title: 'Booking.com', label: 'Booking.com', href: 'https://www.booking.com/', iconId: 'booking' },
    { id: 'chatgpt-quick-link', title: 'ChatGPT', label: 'ChatGPT', href: 'https://chatgpt.com/', iconId: 'chatgpt' },
    { id: 'claude-quick-link', title: 'Claude', label: 'Claude', href: 'https://claude.ai/', iconId: 'claude' },
    { id: 'deskspacing-quick-link', title: 'DeskSpacing', label: 'DeskSpacing', href: 'https://deskspacing.com/', iconId: 'deskspacing' },
    { id: 'edx-quick-link', title: 'edX', label: 'edX', href: 'https://www.edx.org/', iconId: 'edx' },
    { id: 'explore-quick-link', title: 'Explore.org', label: 'Explore.org', href: 'https://explore.org/', iconId: 'explore' },
    { id: 'flightradar24-quick-link', title: 'Flightradar24', label: 'Flightradar24', href: 'https://www.flightradar24.com/', iconId: 'flightradar24' },
    { id: 'geekprank-quick-link', title: 'GeekPrank', label: 'GeekPrank', href: 'https://geekprank.com/', iconId: 'geekprank' },
    { id: 'hacksplaining-quick-link', title: 'Hacksplaining', label: 'Hacksplaining', href: 'https://www.hacksplaining.com/', iconId: 'hacksplaining' },
    { id: 'makemeacocktail-quick-link', title: 'Make Me a Cocktail', label: 'Make Me a Cocktail', href: 'https://makemeacocktail.com/', iconId: 'makemeacocktail' },
    { id: 'musclewiki-quick-link', title: 'MuscleWiki', label: 'MuscleWiki', href: 'https://musclewiki.com/', iconId: 'musclewiki' },
    { id: 'mynoise-quick-link', title: 'myNoise', label: 'myNoise', href: 'https://mynoise.net/', iconId: 'mynoise' },
    { id: 'osintframework-quick-link', title: 'OSINT Framework', label: 'OSINT Framework', href: 'https://osintframework.com/', iconId: 'osintframework' },
    { id: 'perplexity-quick-link', title: 'Perplexity', label: 'Perplexity', href: 'https://perplexity.ai/', iconId: 'perplexity' },
    { id: 'pimeyes-quick-link', title: 'PimEyes', label: 'PimEyes', href: 'https://pimeyes.com/', iconId: 'pimeyes' },
    { id: 'quiverquant-quick-link', title: 'Quiver Quant', label: 'Quiver Quant', href: 'https://www.quiverquant.com/', iconId: 'quiverquant' },
    { id: 'signalbox-quick-link', title: 'Signalbox', label: 'Signalbox', href: 'https://signalbox.io/', iconId: 'signalbox' },
    { id: 'skiplagged-quick-link', title: 'Skiplagged', label: 'Skiplagged', href: 'https://skiplagged.com/', iconId: 'skiplagged' },
    { id: 'vesselfinder-quick-link', title: 'VesselFinder', label: 'VesselFinder', href: 'https://www.vesselfinder.com/', iconId: 'vesselfinder' }
  ];

  function makeIcon(doc, iconId) {
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const use = doc.createElementNS('http://www.w3.org/2000/svg', 'use');
    const ref = `${ICON_SPRITE}#${iconId}`;
    svg.classList.add('quick-link-extra-icon');
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    use.setAttribute('href', ref);
    use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', ref);
    svg.appendChild(use);
    return svg;
  }

  function ensureStyles(doc) {
    if (doc.getElementById('labelled-quick-link-styles')) return;
    const style = doc.createElement('style');
    style.id = 'labelled-quick-link-styles';
    style.textContent = `
      .quick-link.quick-link-labelled {
        width: auto !important;
        min-width: 92px;
        max-width: 178px;
        height: 46px;
        padding: 0 10px;
        gap: 7px;
        text-decoration: none;
      }
      .quick-link-labelled .quick-link-extra-icon {
        display: block;
        width: 23px;
        height: 23px;
        flex: 0 0 23px;
      }
      .quick-link-labelled .quick-link-label {
        display: block;
        min-width: 0;
        color: #23403D;
        font-family: system-ui, sans-serif;
        font-size: 11.5px;
        font-weight: 700;
        line-height: 1.05;
        text-align: left;
        white-space: normal;
      }
      @media (max-width: 650px) {
        .quick-link.quick-link-labelled {
          min-width: 84px;
          max-width: 150px;
          height: 44px;
          padding: 0 8px;
          gap: 6px;
        }
        .quick-link-labelled .quick-link-extra-icon {
          width: 21px;
          height: 21px;
          flex-basis: 21px;
        }
        .quick-link-labelled .quick-link-label {
          font-size: 10.5px;
        }
      }
    `;
    doc.head.appendChild(style);
  }

  function addOrUpdateLink(doc, quickLinks, config) {
    let link = doc.getElementById(config.id);
    if (!link) {
      link = doc.createElement('a');
      link.id = config.id;
      quickLinks.appendChild(link);
    }

    link.className = 'quick-link quick-link-labelled';
    link.href = config.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = config.title;
    link.setAttribute('aria-label', `Open ${config.title}`);
    link.dataset.sortName = config.title;

    const label = doc.createElement('span');
    label.className = 'quick-link-label';
    label.textContent = config.label;
    link.replaceChildren(makeIcon(doc, config.iconId), label);
  }

  function alphabetise(quickLinks) {
    const links = [...quickLinks.querySelectorAll('a.quick-link')];
    links.sort((a, b) => {
      const first = a.dataset.sortName || a.title || '';
      const second = b.dataset.sortName || b.title || '';
      return first.localeCompare(second, 'en-GB', { sensitivity: 'base' });
    });
    links.forEach(link => quickLinks.appendChild(link));
  }

  function enhance() {
    try {
      const doc = frame?.contentDocument;
      const quickLinks = doc?.querySelector('.quick-links');
      if (!doc || !quickLinks) return;

      ensureStyles(doc);

      [...quickLinks.querySelectorAll('a.quick-link')]
        .filter(link => REMOVE_TITLES.has(link.title))
        .forEach(link => link.remove());

      NEW_LINKS.forEach(config => addOrUpdateLink(doc, quickLinks, config));
      alphabetise(quickLinks);
    } catch (error) {
      console.warn('Unable to expand HomeScreen quick links:', error);
    }
  }

  frame?.addEventListener('load', enhance);
  if (frame?.contentDocument?.readyState === 'complete') {
    queueMicrotask(enhance);
  }
})();