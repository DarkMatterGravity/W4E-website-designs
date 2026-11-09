const toggle = document.querySelector('.menu-toggle');
const links = document.querySelector('#nav-links');
function closeMenu() { links?.classList.remove('open'); toggle?.setAttribute('aria-expanded', 'false'); }
toggle?.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open)); links.classList.toggle('open', open);
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeMenu(); toggle?.focus(); } });
document.addEventListener('click', e => { if (!e.target.closest('.navigation')) closeMenu(); });
links?.addEventListener('click', e => { if (e.target.closest('a')) closeMenu(); });
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  // Reveal headings in reading order, then images, cards and actions as they enter.
  document.querySelectorAll('.section-head').forEach(header => {
    header.classList.remove('reveal');
    [...header.children].forEach(node => node.classList.add('reveal'));
  });
  document.querySelectorAll('.hero-content, .solution-image, .plan-image, .source-growth, .center-link, .button-row, .plans > article, .equipment-details, .contact-form').forEach(node => node.classList.add('reveal'));
  const targets = [...document.querySelectorAll('.reveal')].filter(node => {
    // A parent already animates its contents; avoid compounding the movement.
    if (node.parentElement.closest('.reveal')) { node.classList.add('visible'); return false; }
    return true;
  });
  const observer = new IntersectionObserver(entries => {
    entries.filter(entry => !entry.isIntersecting).forEach(entry => { entry.target.classList.remove('visible'); delete entry.target.dataset.revealStep; });
    const sections = new Map();
    entries.filter(entry => entry.isIntersecting && !entry.target.classList.contains('visible')).forEach(entry => {
      const section = entry.target.closest('section') || entry.target.parentElement;
      if (!sections.has(section)) sections.set(section, []);
      sections.get(section).push(entry);
    });
    sections.forEach(batch => {
      batch.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
      batch.forEach((entry, index) => {
        entry.target.dataset.revealStep = String(Math.min(index, 4));
        entry.target.classList.add('visible');

      });
    });
  }, { threshold: 0 });
  targets.forEach(node => observer.observe(node));
  document.documentElement.classList.add('motion');
}
// Each new viewport entry starts a fresh tally; screen readers retain the final value.
const counterReduced = matchMedia('(prefers-reduced-motion: reduce)');
if ('IntersectionObserver' in window && !counterReduced.matches) {
  const states = new Map();
  const counters = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const node = entry.target, state = states.get(node);
      if (!entry.isIntersecting) {
        cancelAnimationFrame(state.frame); state.active = false;
        state.visual.textContent = state.original.replace(/[\d,.]+/, '0');
        node.dataset.counterState = 'waiting'; return;
      }
      if (state.active) return;
      state.active = true; node.dataset.counterState = 'animating';
      const start = performance.now();
      function tally(time) {
        const progress = counterReduced.matches ? 1 : Math.min(1, (time - start) / 1150);
        state.visual.textContent = progress === 1 ? state.original : state.match[1] + state.format.format(state.value * (1 - (1-progress)**3)) + state.match[3];
        if (progress < 1) state.frame = requestAnimationFrame(tally);
        else node.dataset.counterState = 'complete';
      }
      state.frame = requestAnimationFrame(tally);
    });
  }, {threshold:0});
  document.querySelectorAll('.stat-number').forEach(node => {
    if (node.closest('.market-legend')) return;
    const original = node.textContent.trim(), match = original.match(/^([+-]?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
    if (!match) return;
    node.dataset.total = original;
    const spoken = document.createElement('span'); spoken.className = 'sr-only'; spoken.textContent = original;
    const visual = document.createElement('span'); visual.setAttribute('aria-hidden', 'true'); visual.textContent = original.replace(/[\d,.]+/, '0');
    const decimals = (match[2].split('.')[1] || '').length;
    states.set(node,{original,match,visual,value:Number(match[2].replaceAll(',','')),format:new Intl.NumberFormat('en-US',{minimumFractionDigits:decimals,maximumFractionDigits:decimals}),frame:0,active:false});
    node.replaceChildren(spoken,visual); counters.observe(node);
  });
  counterReduced.addEventListener('change', () => {
    if (!counterReduced.matches) return;
    counters.disconnect(); states.forEach(state => { cancelAnimationFrame(state.frame); state.visual.textContent = state.original; });
  });
}
// A single clockwise sweep drives each sector and its two percentage labels.
// Static and reduced-motion views retain the complete, source-backed chart.
if ('IntersectionObserver' in window && !counterReduced.matches) {
  document.querySelectorAll('.market-chart').forEach(chart => {
    const wipe = chart.querySelector('.market-wipe');
    if (!wipe) return;
    const legend = chart.closest('.market-panel').querySelectorAll('.market-legend .stat-number');
    const records = [...chart.querySelectorAll('.market-percent')].map(label => {
      const original = label.dataset.total;
      const number = legend[Number(label.dataset.marketIndex)];
      number.dataset.total = original;
      const spoken = document.createElement('span'); spoken.className = 'sr-only'; spoken.textContent = original;
      const visual = document.createElement('span'); visual.setAttribute('aria-hidden', 'true');
      number.replaceChildren(spoken, visual);
      const decimals = (original.replace('%', '').split('.')[1] || '').length;
      return {label, visual, original, value:parseFloat(original), start:Number(label.dataset.sweepStart), size:Number(label.dataset.sweepSize), format:new Intl.NumberFormat('en-US',{minimumFractionDigits:decimals,maximumFractionDigits:decimals})};
    });
    let frame = 0, legendFrame = 0, chartVisible = false, legendVisible = false;
    function update(sweep) {
      wipe.setAttribute('stroke-dashoffset', String(100 - sweep));
      records.forEach(record => {
        const progress = record.size ? Math.max(0, Math.min(1, (sweep - record.start) / record.size)) : 1;
        const text = progress === 1 ? record.original : record.format.format(record.value * progress) + '%';
        record.label.textContent = text; record.visual.textContent = text;
        // Reveal the in-ring number only once the wipe reaches its position.
        record.label.setAttribute('opacity', String(Math.max(0, Math.min(1, (progress - .45) / .15))));
      });
    }
    function finish() {
      cancelAnimationFrame(frame); frame = 0; update(100);
      chart.dataset.chartState = 'complete';
    }
    function playChart() {
      cancelAnimationFrame(frame); cancelAnimationFrame(legendFrame); update(0);
      chart.dataset.chartState = 'animating';
      const start = performance.now();
      function animate(time) {
        if (counterReduced.matches) { finish(); return; }
        const progress = Math.min(1, (time-start)/1800);
        update((1-(1-progress)**3)*100);
        if (progress < 1) frame = requestAnimationFrame(animate); else finish();
      }
      frame = requestAnimationFrame(animate);
    }
    function playLegend() {
      cancelAnimationFrame(legendFrame);
      const start = performance.now();
      function tally(time) {
        const progress = counterReduced.matches ? 1 : Math.min(1,(time-start)/1150);
        records.forEach(record => { record.visual.textContent = progress === 1 ? record.original : record.format.format(record.value*(1-(1-progress)**3))+'%'; });
        if (progress < 1) legendFrame = requestAnimationFrame(tally);
      }
      legendFrame = requestAnimationFrame(tally);
    }
    const legendBox = chart.closest('.market-panel').querySelector('.market-legend');
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target === chart) {
          const entering = entry.isIntersecting && !chartVisible;
          chartVisible = entry.isIntersecting;
          if (entering) playChart();
          else if (!chartVisible) {
            cancelAnimationFrame(frame); frame = 0;
            wipe.setAttribute('stroke-dashoffset','100');
            records.forEach(record => record.label.setAttribute('opacity','0'));
            chart.dataset.chartState = 'waiting';
            if (legendVisible) playLegend();
          }
        } else {
          const entering = entry.isIntersecting && !legendVisible;
          legendVisible = entry.isIntersecting;
          if (entering && chart.dataset.chartState !== 'animating') playLegend();
          else if (!legendVisible) {
            cancelAnimationFrame(legendFrame);
            if (!chartVisible) records.forEach(record => record.visual.textContent = '0%');
          }
        }
      });
    }, {threshold:0});
    update(0); chart.dataset.chartState = 'waiting'; observer.observe(chart); observer.observe(legendBox);
    counterReduced.addEventListener('change', () => {
      if (counterReduced.matches) { observer.disconnect(); cancelAnimationFrame(legendFrame); finish(); }
    });
  });
}
const solutionImage = document.querySelector('.solution-image');
if (solutionImage && 'IntersectionObserver' in window) {
  const photo = solutionImage.querySelector('img');
  let active = false, frame = 0;
  function renderParallax() {
    frame = 0;
    if (!active || counterReduced.matches) return;
    const rect = solutionImage.getBoundingClientRect();
    const limit = matchMedia('(max-width:760px)').matches ? 90 : 180;
    // Compensate for 40% of the frame's scroll: the photo visibly travels
    // more slowly than the surrounding page, rather than barely shifting.
    const offset = Math.max(-limit, Math.min(limit, (innerHeight / 2 - rect.top - rect.height / 2) * .4));
    photo.style.transform = `translate3d(0,${offset.toFixed(2)}px,0)`;
  }
  function requestParallax() {
    if (active && !frame && !counterReduced.matches) frame = requestAnimationFrame(renderParallax);
  }
  function syncParallaxPreference() {
    solutionImage.classList.toggle('parallax-active', !counterReduced.matches);
    if (counterReduced.matches) {
      cancelAnimationFrame(frame); frame = 0; photo.style.removeProperty('transform');
    } else requestParallax();
  }
  new IntersectionObserver(entries => {
    active = entries[0].isIntersecting;
    if (active) requestParallax(); else { cancelAnimationFrame(frame); frame = 0; }
  }).observe(solutionImage);
  addEventListener('scroll', requestParallax, {passive:true});
  addEventListener('resize', requestParallax, {passive:true});
  counterReduced.addEventListener('change', syncParallaxPreference);
  syncParallaxPreference();
}
const form = document.querySelector('#contact-form');
if (form) {
  form.elements.started.value = String(Date.now());
  const request = new URLSearchParams(location.search).get('request');
  if (['consultation', 'evaluation'].includes(request)) form.elements.request.value = request;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector('button[type="submit"]');
    const status = document.querySelector('#form-status');
    const original = button.innerHTML;
    button.disabled = true; button.textContent = button.dataset.sending; status.textContent = '';
    try {
      const response = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error('Delivery failed');
      status.textContent = status.dataset.success;
      form.reset(); form.elements.started.value = String(Date.now());
    } catch { status.textContent = status.dataset.failure; }
    finally { button.disabled = false; button.innerHTML = original; }
  });
}
