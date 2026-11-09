import { readFile, writeFile, mkdir, cp } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const fonts = ['Libre Baskerville', 'Montserrat', 'Georgia', 'Arial', 'Verdana', 'Trebuchet MS', 'Times New Roman'];
export const icons = ['paint-bucket', 'flame', 'droplets', 'package', 'fuel', 'sprout', 'flask-conical', 'factory', 'truck', 'recycle', 'warehouse', 'trash', 'arrow-right', 'menu', 'x', 'arrow-up-right'];
export const streamImages = ['generated-paints.webp', 'generated-carbon-black.webp', 'generated-inks.webp', 'generated-consumer-products.webp', 'generated-oily-sludges.webp', 'generated-pesticides-herbicides.webp', 'generated-isocyanates.webp', 'generated-industrial-plant-trash.webp'];
export const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function validate(data, baseline) {
  function shape(value, ref, key = '') {
    if (typeof value !== typeof ref || value === null) throw new Error(`Invalid field: ${key}`);
    if (typeof ref === 'string') {
      if (value.length > 10000) throw new Error(`Text is too long: ${key}`);
      return;
    }
    if (typeof ref === 'number') {
      if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid list numbering: ${key}`);
      return;
    }
    if (Array.isArray(ref)) {
      if (!Array.isArray(value) || value.length !== ref.length) throw new Error(`Invalid list: ${key}`);
      value.forEach((v, i) => shape(v, ref[i], `${key}.${i}`));
    } else {
      if (Object.keys(value).sort().join() !== Object.keys(ref).sort().join()) throw new Error(`Invalid fields: ${key}`);
      Object.keys(ref).forEach(k => shape(value[k], ref[k], `${key}.${k}`));
    }
  }
  shape(data, baseline);
  Object.values(data.brand.palette).forEach(v => { if (!/^#[a-f\d]{6}$/i.test(v)) throw new Error('Use six-digit hex colors.'); });
  Object.values(data.brand.fonts).forEach(v => { if (!fonts.includes(v)) throw new Error('Unsupported font.'); });
  data.home.streams.items.forEach(v => { if (!streamImages.includes(v.image)) throw new Error('Unsupported waste stream image.'); });
  data.home.challenge.points.forEach(v => { if (!icons.includes(v.icon)) throw new Error('Unsupported industry icon.'); });
  if (data.home.challenge.markets.some(v => !/^\d+(?:\.\d+)?%$/.test(v.number) || parseFloat(v.number) > 100) || !data.home.challenge.markets.some(v => parseFloat(v.number) > 0)) throw new Error('Market shares must be percentages between 0% and 100%, with a positive total.');
  data.technology.process.forEach(v => { if (!icons.includes(v.icon)) throw new Error('Unsupported icon.'); });
  const photos = ['paul-bordelon.png','jeff-gloyd.png','torry-ingram.png','grant-williams.png'];
  data.about.team.forEach(v => { if (!photos.includes(v.image)) throw new Error('Unsupported portrait.'); });
  return data;
}

const icon = name => `<svg class="icon" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><use href="assets/icons.svg#${esc(name)}"></use></svg>`;
const button = (text, href, secondary = false) => `<a class="button${secondary ? ' secondary' : ''}" href="${href}">${esc(text)}${icon('arrow-right')}</a>`;
const heading = (label, title, text = '') => `<header class="section-head reveal"><p class="section-label">${esc(label)}</p><h2>${esc(title)}</h2>${text ? `<p class="intro">${esc(text)}</p>` : ''}</header>`;
const stats = (items, cls = '') => `<div class="stats-grid ${cls}">${items.map(v => `<div class="stat-item reveal"><div class="stat-number">${esc(v.number)}</div><p class="stat-label">${esc(v.label)}</p></div>`).join('')}</div>`;
const equipmentList = (items, start = 1) => `<ol class="equipment-list" start="${esc(start)}">${items.map(item => `<li>${esc(typeof item === 'string' ? item : item.title)}${item.subitems?.length ? `<ol class="equipment-sublist" type="a">${item.subitems.map(text => `<li>${esc(text)}</li>`).join('')}</ol>` : ''}</li>`).join('')}</ol>`;
const equipmentGroup = (title, items, start, extra = '', classes = '') => `<details class="phase-group ${classes}"><summary><h3>${esc(title)}</h3><span class="phase-toggle" aria-hidden="true"></span></summary><div class="phase-group-content">${equipmentList(items, start)}${extra}</div></details>`;
const phaseGroups = groups => groups.map(group => equipmentGroup(group.title, group.items, group.start)).join('');

function marketChart(markets, title) {
  const total = markets.reduce((sum, item) => sum + parseFloat(item.number), 0);
  let offset = 0;
  const segments = [0, 2, 1].map(index => {
    const item = markets[index], share = parseFloat(item.number) / total * 100;
    const angle = (offset + share / 2) / 100 * Math.PI * 2 - Math.PI / 2;
    const x = (180 + Math.cos(angle) * 125).toFixed(2), y = (180 + Math.sin(angle) * 125).toFixed(2);
    const result = {
      segment: `<circle class="market-sector market-sector-${index}" cx="180" cy="180" r="125" pathLength="100" stroke-dasharray="${share} 100" stroke-dashoffset="${-offset}" transform="rotate(-90 180 180)"><title>${esc(item.number)} ${esc(item.label)}</title></circle>`,
      label: `<text class="market-percent market-percent-${index}" data-market-index="${index}" data-sweep-start="${offset}" data-sweep-size="${share}" data-total="${esc(item.number)}" x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" aria-hidden="true">${esc(item.number)}</text>`
    };
    offset += share;
    return result;
  });
  // Draw all ring segments before their labels so no segment can cover a label.
  const circles = segments.map(v => v.segment).join('');
  const labels = segments.map(v => v.label).join('');
  return `<div class="market-chart reveal"><svg viewBox="0 0 360 360" width="400" height="400" role="img" aria-labelledby="market-chart-title market-chart-description"><title id="market-chart-title">${esc(title)}</title><desc id="market-chart-description">${markets.map(v => `${esc(v.label)}: ${esc(v.number)}`).join('; ')}.</desc><defs><mask id="market-chart-wipe" maskUnits="userSpaceOnUse" x="0" y="0" width="360" height="360"><circle class="market-wipe" cx="180" cy="180" r="125" fill="none" stroke="white" stroke-width="80" pathLength="100" stroke-dasharray="100 100" stroke-dashoffset="0" transform="rotate(-90 180 180)"/></mask></defs><g mask="url(#market-chart-wipe)">${circles}</g>${labels}</svg></div>`;
}

export function renderPage(data, page) {
  const { brand, navigation: n, home: h, technology: t, about: a, contact: c } = data;
  const urls = {home:'index.html',technology:'technology.html',about:'about.html',contact:'contact.html'};
  const links = Object.entries(urls).map(([key, url]) => `<a href="${url}"${page === key ? ' aria-current="page"' : ''}>${esc(n[key])}</a>`).join('');
  const cta = `<section class="cta container">${heading(c.label, c.heading)}<div class="button-row">${button(c.consultation,'contact.html?request=consultation')}${button(c.evaluation,'contact.html?request=evaluation',true)}</div></section>`;
  let content;
  if (page === 'home') content = `<section class="hero"><div class="hero-main"><img class="hero-bg" src="assets/Hero_crisp.jpg" alt="" fetchpriority="high"><canvas class="hero-depth" aria-hidden="true"></canvas><div class="hero-shade"></div><div class="hero-content"><img class="hero-logo" src="assets/W4E_Logo.png" width="1268" height="438" alt="${esc(brand.name)}"><h1>${esc(h.hero.heading)}</h1><p class="hero-subtitle">${esc(h.hero.text)}</p><div class="button-row">${button(h.hero.primary,'contact.html?request=consultation')}${button(h.hero.secondary,'technology.html',true)}</div></div></div>${stats(h.stats,'hero-stats')}</section>
  <section class="section light"><div class="container challenge-grid"><div class="challenge-copy">${heading(h.challenge.label,h.challenge.heading)}<div class="challenge-points">${h.challenge.points.map((v,i)=>`<article class="challenge-point reveal"><div class="challenge-symbol">${icon(v.icon)}</div><p${i===1?' class="source-growth"':''}>${esc(v.text)}</p></article>`).join('')}</div></div><div class="market-panel">${heading('',h.challenge.marketHeading)}${marketChart(h.challenge.markets,h.challenge.marketHeading)}<ul class="market-legend">${h.challenge.markets.map((v,i)=>`<li class="market-legend-item stat-item reveal"><span class="market-swatch market-swatch-${i}" aria-hidden="true"></span><span class="stat-number">${esc(v.number)}</span><span class="market-label">${esc(v.label)}</span></li>`).join('')}</ul></div></div></section>
  <section class="section container solution">${heading(h.solution.label,h.solution.heading,h.solution.text)}<div class="solution-image"><img src="assets/Building_The_future.png" alt="" loading="lazy"></div><div class="features">${h.solution.features.map(v=>`<article class="feature reveal"><h3>${esc(v.title)}</h3><p>${esc(v.text)}</p></article>`).join('')}</div><div class="center-link">${button(h.solution.link,'technology.html',true)}</div></section>
  <section class="section light"><div class="container">${heading(h.streams.label,h.streams.heading)}<div class="streams-grid">${h.streams.items.map(v=>`<article class="stream-card reveal"><img class="stream-image" src="assets/${esc(v.image)}" alt="${esc(v.title)}" loading="lazy" width="220" height="220"><h3>${esc(v.title)}</h3></article>`).join('')}</div></div></section>${cta}`;
  if (page === 'technology') content = `<section class="page-intro container technology-intro">${heading(t.label,t.heading).replace('<h2>','<h1>').replace('</h2>','</h1>')}</section>
  <section class="section diagram-section"><div class="container"><a class="diagram-link reveal" href="assets/Process_Illustration.jpeg" target="_blank" rel="noopener" aria-label="${esc(t.diagram.open)}"><img src="assets/Process_Illustration.jpeg" width="1584" height="672" alt="${esc(t.diagram.alt)}"></a></div></section>
  <section class="section process"><div class="container">${heading(n.technology,t.processHeading)}<div class="process-grid">${t.process.map((v,i)=>`<article class="process-step reveal"><div class="step-icon">${icon(v.icon)}</div><span class="step-index">0${i+1}</span><h3>${esc(v.title)}</h3></article>`).join('')}</div></div></section>
  <section class="section container">${heading(t.site.label,t.site.heading)}${stats(t.site.facts)}<a class="plan-image reveal" href="assets/site-plan.png" target="_blank" rel="noopener"><img src="assets/site-plan.png" alt="${esc(t.site.label)}" loading="lazy"></a><div class="plans"><article class="phase-plan phase-one">${heading('',t.site.phase1)}${phaseGroups(t.site.phase1Groups)}<a href="assets/receiving-plan.png" target="_blank" rel="noopener"><img src="assets/receiving-plan.png" alt="${esc(t.site.phase1)}" loading="lazy"></a></article><article class="phase-plan phase-two">${heading('',t.site.phase2)}${phaseGroups(t.site.phase2Groups)}${equipmentGroup(t.site.unknown,t.site.unknownItems,15,`<a href="assets/equipment-plan.png" target="_blank" rel="noopener"><img src="assets/equipment-plan.png" alt="${esc(t.site.unknown)}" loading="lazy"></a>`,'unknown-equipment')}<a href="assets/blending-plan.png" target="_blank" rel="noopener"><img src="assets/blending-plan.png" alt="${esc(t.site.phase2)}" loading="lazy"></a></article></div></section>${cta}`;
  if (page === 'about') content = `<section class="page-intro container">${heading(a.label,a.heading,a.intro).replace('<h2>','<h1>').replace('</h2>','</h1>')}</section><section class="section light"><div class="container">${heading(a.label,a.teamHeading)}<div class="team-grid">${a.team.map(v=>`<article class="team-card reveal"><div class="portrait" tabindex="0" role="img" aria-label="${esc(v.name)}"><span class="portrait-ring" aria-hidden="true"></span><span class="portrait-photo" aria-hidden="true"><span class="portrait-zoom"><img src="assets/${esc(v.image)}" alt="" loading="lazy"></span></span></div><h3>${esc(v.name)}</h3><p class="role">${esc(v.role)}</p>${v.bio.map(s=>`<p>${esc(s)}</p>`).join('')}</article>`).join('')}</div></div></section>
  <section class="section roadmap"><img src="assets/vision-processing.jpeg" alt="" class="roadmap-bg" loading="lazy"><div class="container">${heading(a.vision.label,a.vision.heading,a.vision.text)}<div class="timeline">${a.vision.locations.map((v,i)=>`<div class="timeline-item reveal"><span>0${i+1}</span><h3>${esc(v)}</h3></div>`).join('')}</div></div></section><section class="section container">${heading(a.vision.label,a.vision.mapHeading)}<a class="plan-image focus-map" href="assets/areas-of-focus-v2.png" target="_blank" rel="noopener"><img src="assets/areas-of-focus-v2.png" alt="${esc(a.vision.mapAlt)}" loading="lazy"></a></section>${cta}`;
  if (page === 'contact') content = `<section class="page-intro container contact-intro">${heading(c.label,c.heading).replace('<h2>','<h1>').replace('</h2>','</h1>')}</section><section class="container contact-section"><form id="contact-form" class="contact-form" action="contact.php" method="post"><div class="form-grid">${[['name','text',true,'name'],['email','email',true,'email'],['company','text',false,'organization'],['phone','tel',false,'tel']].map(([key,type,required,auto])=>`<label>${esc(c.form[key])}${required?' <span aria-hidden="true">*</span>':''}<input type="${type}" name="${key}" autocomplete="${auto}" maxlength="${key==='email'?254:200}"${required?' required':''}></label>`).join('')}</div><label>${esc(c.form.type)}<select name="request"><option value="consultation">${esc(c.consultation)}</option><option value="evaluation">${esc(c.evaluation)}</option></select></label><label>${esc(c.form.message)} <span aria-hidden="true">*</span><textarea name="message" rows="6" maxlength="10000" required></textarea></label><div class="honey" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div><input type="hidden" name="started" value=""><button class="button" type="submit" data-sending="${esc(c.form.sending)}">${esc(c.form.submit)}${icon('arrow-right')}</button><p id="form-status" role="status" aria-live="polite" data-success="${esc(c.form.success)}" data-failure="${esc(c.form.failure)}"></p></form></section>`;
  const title = page === 'home' ? brand.name : `${n[page]} | ${brand.name}`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(page==='home'?h.hero.text:page==='technology'?t.description:page==='about'?a.intro:c.heading)}"><link rel="icon" href="assets/icons.svg" type="image/svg+xml"><link rel="stylesheet" href="assets/fonts.css"><link rel="stylesheet" href="theme.css"><link rel="stylesheet" href="styles.css"><script src="site.js" defer></script>${page === 'home' ? '<script src="hero-depth.js" defer></script>' : ''}</head><body><a class="skip-link" href="#main">${esc(n[page])}</a><nav class="navigation${page === 'home' ? ' navigation-home' : ''}" aria-label="Main navigation">${page === 'home' ? '' : `<a class="brand" href="index.html" aria-label="${esc(brand.name)}"><img src="assets/W4E_Logo.png" width="1268" height="438" alt="${esc(brand.name)}"></a>`}<button class="menu-toggle" type="button" aria-label="Menu" aria-expanded="false" aria-controls="nav-links">${icon('menu')}</button><div id="nav-links" class="nav-links">${links}</div><a href="contact.html" class="nav-cta">${esc(n.cta)}${icon('arrow-up-right')}</a></nav><main id="main">${content}</main><footer><a class="footer-brand" href="index.html"><img src="assets/W4E_Logo.png" alt="${esc(brand.name)}" width="1268" height="438" loading="lazy"></a><div class="footer-links">${links}</div><p>© ${esc(brand.legalName)}</p></footer></body></html>`;
}

export async function build() {
  const data = JSON.parse(await readFile(path.join(root,'content/site.json'),'utf8'));
  validate(data,data);
  const dist = path.join(root,'dist');
  await mkdir(dist,{recursive:true});
  await cp(path.join(root,'assets'),path.join(dist,'assets'),{recursive:true});
  for (const page of ['home','technology','about','contact']) await writeFile(path.join(dist,page==='home'?'index.html':`${page}.html`),renderPage(data,page));
  const palette = Object.entries(data.brand.palette).map(([k,v])=>`--${k}:${v};`).join('');
  const theme = `:root{${palette}--heading-font:"${data.brand.fonts.heading}",Georgia,serif;--body-font:"${data.brand.fonts.body}",Arial,sans-serif;}`;
  await writeFile(path.join(dist,'theme.css'),theme);
  for (const file of ['styles.css','site.js','hero-depth.js','contact.php','server-config.example.php','.htaccess']) await cp(path.join(root,file),path.join(dist,file));
  // Version changed assets so returning reviewers receive the latest styling and motion.
  const versions = await Promise.all(['styles.css','site.js','hero-depth.js','theme.css','assets/fonts.css','assets/icons.svg'].map(async name => [name,createHash('sha256').update(await readFile(path.join(dist,name))).digest('hex').slice(0,10)]));
  for (const name of ['index.html','technology.html','about.html','contact.html']) {
    const file = path.join(dist,name);
    let html = await readFile(file,'utf8');
    for (const [asset,version] of versions) html = html.replaceAll(`="${asset}"`,`="${asset}?v=${version}"`).replaceAll(`="${asset}#`,`="${asset}?v=${version}#`);
    await writeFile(file,html);
  }
  await writeFile(path.join(dist,'robots.txt'),'User-agent: *\nDisallow: /\n');
  // Reviews stay out of search results; deployment instructions explain removing robots.txt.
  return dist;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(`Built ${await build()}`);
}
