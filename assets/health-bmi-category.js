(() => {
  const frame = document.querySelector('.page-frame');

  function toNumber(value) {
    const number = Number(String(value ?? '').trim());
    return Number.isFinite(number) ? number : null;
  }

  function categoryForBmi(bmi) {
    if (bmi === null) return '';
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Healthy weight';
    if (bmi < 30) return 'Overweight';
    if (bmi < 35) return 'Obesity class I';
    if (bmi < 40) return 'Obesity class II';
    return 'Obesity class III';
  }

  function install(doc) {
    const bmi = doc.getElementById('bmi');
    if (!bmi) return;

    if (!doc.getElementById('bmi-category-styles')) {
      const style = doc.createElement('style');
      style.id = 'bmi-category-styles';
      style.textContent = `
        #bmi {
          display: inline-block;
          vertical-align: baseline;
          margin-right: 10px;
        }
        #bmi-category {
          display: inline-flex;
          align-items: center;
          min-height: 30px;
          margin-top: 6px;
          padding: 4px 10px;
          border: 1px solid rgba(125,185,232,.30);
          border-radius: 999px;
          background: rgba(125,185,232,.10);
          color: #B6C9DB;
          font-family: "Gloria Hallelujah", cursive;
          font-size: .82rem;
          line-height: 1.2;
          vertical-align: baseline;
        }
        @media (max-width: 420px) {
          #bmi-category { font-size: .76rem; }
        }
      `;
      doc.head.append(style);
    }

    let category = doc.getElementById('bmi-category');
    if (!category) {
      category = doc.createElement('span');
      category.id = 'bmi-category';
      category.setAttribute('aria-live', 'polite');
      bmi.insertAdjacentElement('afterend', category);
    }

    const update = () => {
      const bmiValue = toNumber(bmi.textContent);
      const label = categoryForBmi(bmiValue);
      category.textContent = label;
      category.hidden = !label;
      if (label) {
        bmi.setAttribute('aria-label', `BMI ${bmiValue.toFixed(1)}, ${label}`);
      } else {
        bmi.removeAttribute('aria-label');
      }
    };

    update();

    if (!bmi.__categoryObserverInstalled) {
      bmi.__categoryObserverInstalled = true;
      const observer = new MutationObserver(update);
      observer.observe(bmi, { childList: true, characterData: true, subtree: true });
    }
  }

  function initialise() {
    try {
      const doc = frame?.contentDocument;
      if (!doc) return;
      install(doc);
    } catch (error) {
      console.warn('Unable to add BMI category:', error);
    }
  }

  frame?.addEventListener('load', initialise);
  if (frame?.contentDocument?.readyState === 'complete') queueMicrotask(initialise);
})();
