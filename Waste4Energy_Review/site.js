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
