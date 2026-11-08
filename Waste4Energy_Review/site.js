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
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
  }), { threshold: .08 });
  document.querySelectorAll('.reveal').forEach(node => observer.observe(node));
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
