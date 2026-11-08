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
  document.querySelectorAll('.solution-image, .plan-image, .source-growth, .center-link, .button-row, .plans > article, .equipment-details, .contact-form').forEach(node => node.classList.add('reveal'));
  const targets = [...document.querySelectorAll('.reveal')].filter(node => {
    // A parent already animates its contents; avoid compounding the movement.
    if (node.parentElement.closest('.reveal')) { node.classList.add('visible'); return false; }
    return true;
  });
  const observer = new IntersectionObserver(entries => {
    const sections = new Map();
    entries.filter(entry => entry.isIntersecting).forEach(entry => {
      const section = entry.target.closest('section') || entry.target.parentElement;
      if (!sections.has(section)) sections.set(section, []);
      sections.get(section).push(entry);
    });
    sections.forEach(batch => {
      batch.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
      batch.forEach((entry, index) => {
        entry.target.dataset.revealStep = String(Math.min(index, 4));
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    });
  }, { threshold: .08, rootMargin: '0px 0px -32px 0px' });
  targets.forEach(node => observer.observe(node));
  document.documentElement.classList.add('motion');
}
// Keep the final numbers available to assistive technology while the visual
// figures tally once, only when they actually enter the viewport.
const counterReduced = matchMedia('(prefers-reduced-motion: reduce)');
if (document.querySelector('.hero') && 'IntersectionObserver' in window && !counterReduced.matches) {
  const counters = new IntersectionObserver(entries => {
    entries.filter(entry => entry.isIntersecting).forEach(entry => {
      const node = entry.target, original = node.dataset.total;
      const match = original.match(/^([+-]?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
      counters.unobserve(node);
      if (!match) return;
      const value = Number(match[2].replaceAll(',', ''));
      const decimals = (match[2].split('.')[1] || '').length;
      const format = new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      const visual = node.querySelector('[aria-hidden]');
      const start = performance.now() + Number(node.closest('.stat-item')?.dataset.revealStep || 0) * 65;
      function tally(time) {
        if (counterReduced.matches) { visual.textContent = original; return; }
        const progress = Math.max(0, Math.min(1, (time - start) / 1150));
        const eased = 1 - Math.pow(1 - progress, 3);
        visual.textContent = progress === 1 ? original : match[1] + format.format(value * eased) + match[3];
        if (progress < 1) requestAnimationFrame(tally);
      }
      requestAnimationFrame(tally);
    });
  }, { threshold: .35, rootMargin: '0px 0px -24px 0px' });
  document.querySelectorAll('.stat-number').forEach(node => {
    if (node.closest('.market-legend')) return;
    const original = node.textContent.trim();
    if (!/^([+-]?)(\d[\d,]*(?:\.\d+)?)(.*)$/.test(original)) return;
    node.dataset.total = original;
    const spoken = document.createElement('span'); spoken.className = 'sr-only'; spoken.textContent = original;
    const visual = document.createElement('span'); visual.setAttribute('aria-hidden', 'true'); visual.textContent = original.replace(/[\d,.]+/, '0');
    node.replaceChildren(spoken, visual); counters.observe(node);
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
    let frame = 0;
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
      chart.dataset.chartState = 'complete'; observer.unobserve(chart);
    }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.unobserve(chart); chart.dataset.chartState = 'animating';
      const start = performance.now() + Number(chart.dataset.revealStep || 0) * 65;
      function animate(time) {
        if (counterReduced.matches) { finish(); return; }
        const progress = Math.max(0, Math.min(1, (time - start) / 1800));
        update((1 - Math.pow(1 - progress, 3)) * 100);
        if (progress < 1) frame = requestAnimationFrame(animate); else finish();
      }
      frame = requestAnimationFrame(animate);
    }, {threshold:.25,rootMargin:'0px 0px -24px 0px'});
    update(0); chart.dataset.chartState = 'waiting'; observer.observe(chart);
    counterReduced.addEventListener('change', () => { if (counterReduced.matches) finish(); });
  });
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
