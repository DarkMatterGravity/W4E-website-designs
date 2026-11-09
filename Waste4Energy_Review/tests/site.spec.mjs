import { test, expect } from '@playwright/test';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { root, build } from '../scripts/build.mjs';
import { unzipSync, strFromU8 } from 'fflate';

for(const size of [{width:1440,height:1000},{width:390,height:844},{width:320,height:740}]){
  test(`four pages load without missing assets or horizontal overflow at ${size.width}px`,async({page})=>{
    await page.setViewportSize(size);
    const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
    for(const route of ['/','/technology.html','/about.html','/contact.html']){
      await page.goto(route);await page.waitForLoadState('networkidle');
      await expect(page.locator('h1')).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.locator('img').evaluateAll(imgs=>imgs.forEach(i=>i.loading='eager'));
      await expect.poll(()=>page.locator('img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0))).toBe(true);
      await page.screenshot({path:path.join(root,`../.local/${route==='/'?'home':route.slice(1,-5)}-${size.width}.png`),fullPage:true});
    }
    expect(errors).toEqual([]);
  });
}
test('mobile menu navigates, closes and exposes its expanded state',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('/');
  const toggle=page.getByRole('button',{name:'Menu',exact:true});
  await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');
  await page.locator('#nav-links').getByRole('link',{name:'Technology',exact:true}).click();await expect(page).toHaveURL(/technology.html/);
  await toggle.click();await page.keyboard.press('Escape');await expect(toggle).toHaveAttribute('aria-expanded','false');
});
test('normal motion reveals content as the visitor scrolls',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
  await expect(page.locator('.hero-content')).toHaveCSS('opacity','1');
  const cards=page.locator('.stream-card');await cards.first().scrollIntoViewIfNeeded();await expect(cards.first()).toHaveCSS('opacity','1');
  await expect(cards.first()).toHaveCSS('transition-timing-function', /cubic-bezier\(0\.16, 1, 0\.3, 1\)/);
  expect(await cards.evaluateAll(nodes=>new Set(nodes.slice(0,4).map(n=>n.dataset.revealStep)).size)).toBeGreaterThan(1);
  await page.locator('.solution-image').scrollIntoViewIfNeeded();await expect(page.locator('.solution-image')).toHaveCSS('opacity','1');
  await page.goto('/about.html');
  const map=page.locator('.plan-image');await expect(map).toHaveClass(/reveal/);await expect(map).toHaveCSS('opacity','0');
  await map.scrollIntoViewIfNeeded();await expect(map).toHaveClass(/visible/);await expect(map).toHaveCSS('opacity','1');
});
test('Get Started rolls over to a white fill with a black border and text',async({page})=>{
  await page.goto('/');const cta=page.locator('.nav-cta');await cta.hover();
  await expect(cta).toHaveCSS('background-color','rgb(255, 255, 255)');
  await expect(cta).toHaveCSS('border-top-color','rgb(0, 0, 0)');
  await expect(cta).toHaveCSS('color','rgb(0, 0, 0)');
  await page.mouse.move(0,200);await cta.focus();await expect(cta).toHaveCSS('background-color','rgb(255, 255, 255)');
});
test('hero depth responds in both directions, keeps text steady and disables for reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
  const hero=page.locator('.hero-main'),canvas=hero.locator('canvas');
  await expect(hero).toHaveClass(/hero-depth-ready/);await expect(page.locator('.hero-content')).toHaveCSS('opacity','1');
  const textPosition=await page.locator('.hero-content').boundingBox(),bounds=await hero.boundingBox();
  const before=await canvas.screenshot();
  await page.mouse.move(bounds.x+bounds.width*.85,bounds.y+bounds.height*.25);
  await expect.poll(async()=>!(await canvas.screenshot()).equals(before)).toBe(true);
  const right=await canvas.screenshot();
  await page.mouse.move(bounds.x+bounds.width*.15,bounds.y+bounds.height*.8);
  await expect.poll(async()=>!(await canvas.screenshot()).equals(right)).toBe(true);
  expect(await page.locator('.hero-content').boundingBox()).toEqual(textPosition);
  expect(await canvas.evaluate(e=>e.getContext('webgl').getError())).toBe(0);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(hero).not.toHaveClass(/hero-depth-ready/);await expect(hero.locator('.hero-bg')).toHaveCSS('visibility','visible');
});
test('home figures tally on every entry and preserve suffixes',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
  const market=page.locator('.market-legend .stat-number');
  await expect(market.first().locator('[aria-hidden]')).toHaveText('0%');
  await market.first().scrollIntoViewIfNeeded();
  await expect(market.first().locator('[aria-hidden]')).toHaveText('67%');
  await expect(market.nth(1).locator('[aria-hidden]')).toHaveText('23%');await expect(market.nth(2).locator('[aria-hidden]')).toHaveText('9%');
  const first=page.locator('.hero-stats .stat-number').first();await first.scrollIntoViewIfNeeded();await expect(first.locator('[aria-hidden]')).toHaveText('254M');
  await market.first().scrollIntoViewIfNeeded();await expect(market.first().locator('[aria-hidden]')).toHaveText('67%');
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await expect(page.locator('.hero-stats .stat-number').first()).toHaveText('254M');await expect(page.locator('.stat-number [aria-hidden]')).toHaveCount(0);
});
test('donut wipes clockwise on every entry and tallies its percentages with the sector growth',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
  const chart=page.locator('.market-chart'),wipe=chart.locator('.market-wipe');
  await expect(wipe).toHaveAttribute('stroke-dashoffset','100');
  await chart.scrollIntoViewIfNeeded();await expect(chart).toHaveAttribute('data-chart-state','animating');
  await expect.poll(async()=>Number(await wipe.getAttribute('stroke-dashoffset'))).toBeLessThan(100);
  await expect(chart).toHaveAttribute('data-chart-state','complete');await expect(wipe).toHaveAttribute('stroke-dashoffset','0');
  await expect(chart.locator('.market-percent-0')).toHaveText('67%');await expect(chart.locator('.market-percent-1')).toHaveText('23%');await expect(chart.locator('.market-percent-2')).toHaveText('9%');
  await page.locator('.hero').scrollIntoViewIfNeeded();await expect(chart).toHaveAttribute('data-chart-state','waiting');await chart.scrollIntoViewIfNeeded();await expect(chart).toHaveAttribute('data-chart-state','animating');await expect(chart).toHaveAttribute('data-chart-state','complete');
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await expect(page.locator('.market-wipe')).toHaveAttribute('stroke-dashoffset','0');
});
test('solution photograph drifts on scroll without exposing its edges and respects reduced motion',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/');
  const frame=page.locator('.solution-image'),photo=frame.locator('img');
  await frame.scrollIntoViewIfNeeded();await expect(frame).toHaveClass(/parallax-active/);
  await expect(photo).not.toHaveCSS('transform','none');
  const before=await photo.evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m42);
  await page.mouse.wheel(0,150);
  await expect.poll(async()=>Math.abs(await photo.evaluate(e=>new DOMMatrix(getComputedStyle(e).transform).m42)-before)).toBeGreaterThan(35);
  expect(await frame.evaluate(e=>{const a=e.getBoundingClientRect(),b=e.querySelector('img').getBoundingClientRect();return b.top<=a.top&&b.bottom>=a.bottom})).toBe(true);
  await page.emulateMedia({reducedMotion:'reduce'});await expect(frame).not.toHaveClass(/parallax-active/);await expect(photo).toHaveCSS('transform','none');
});
test('phase notes expand independently and Unknown Equipment belongs to Phase 2',async({page})=>{
  await page.goto('/technology.html');
  await expect(page.locator('.process-step')).toHaveCount(4);await expect(page.locator('.process-step ul')).toHaveCount(0);
  await expect(page.locator('.phase-one .phase-group h3')).toHaveText('Receiving Building');
  const firstGroup=page.locator('.phase-one .phase-group');await expect(firstGroup).not.toHaveAttribute('open','');
  await firstGroup.locator('summary').click();await expect(firstGroup).toHaveAttribute('open','');
  const phaseOne=page.locator('.phase-one .phase-group .phase-group-content > .equipment-list > li');await expect(phaseOne).toHaveCount(10);
  await expect(phaseOne.nth(7).locator('.equipment-sublist > li')).toHaveCount(8);
  await expect(phaseOne.nth(9).locator('.equipment-sublist > li')).toHaveCount(4);
  await expect(page.locator('.phase-two .phase-group h3')).toHaveText(['Receiving Building','Blending & Densification','Unknown Equipment']);
  const phaseTwo=page.locator('.phase-two .phase-group');await expect(phaseTwo.first().locator('.equipment-list > li')).toHaveCount(5);
  await expect(phaseTwo.nth(1).locator('.equipment-list')).toHaveAttribute('start','6');
  await expect(phaseTwo.nth(1).locator('.equipment-list > li').first()).toHaveText('Building');
  await expect(phaseTwo.nth(1).locator('.equipment-list > li')).toHaveCount(9);
  await phaseTwo.first().locator('summary').click();await expect(phaseTwo.first()).toHaveAttribute('open','');
  const unknown=page.locator('.phase-two .unknown-equipment');await expect(unknown.locator('.equipment-list')).not.toBeVisible();
  expect(await unknown.evaluate(e=>e.tagName)).toBe('DETAILS');
  await unknown.locator('summary').focus();await page.keyboard.press('Enter');await expect(unknown).toHaveAttribute('open','');
  await expect(unknown.locator('.equipment-list')).toBeVisible();await expect(unknown.locator('.equipment-list')).toHaveAttribute('start','15');
  await expect(unknown.locator('.equipment-list > li')).toHaveCount(12);
  await expect(unknown.locator('.equipment-list > li').first()).toHaveText('Packaging Machine (gaylord/bags)');
  await expect(unknown.locator('.equipment-list > li').last()).toHaveText('Product Classification Loop');
  await page.keyboard.press('Enter');await expect(unknown).not.toHaveAttribute('open','');
  await expect(phaseTwo.first()).toHaveAttribute('open','');
  await expect(page.locator('.unknown-equipment h2')).toHaveCount(0);
});
test('executive portraits clip to circles, keep their hover zoom and loop an eased ring rotation',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('/about.html');
  const portrait=page.locator('.portrait').first(),zoom=portrait.locator('.portrait-zoom'),ring=portrait.locator('.portrait-ring');
  await portrait.scrollIntoViewIfNeeded();await expect(portrait).toHaveCSS('border-radius','50%');await expect(portrait.locator('.portrait-photo')).toHaveCSS('overflow','hidden');
  await portrait.hover();await expect(zoom).toHaveCSS('transform','matrix(1.07, 0, 0, 1.07, 0, 0)');
  const motion=await ring.evaluate(node=>{
    const animation=node.getAnimations()[0];animation.pause();
    const timing=animation.effect.getTiming();animation.currentTime=600;const turning=getComputedStyle(node).transform;
    animation.currentTime=1800;const stopped=getComputedStyle(node).transform;
    animation.currentTime=2300;const holding=getComputedStyle(node).transform;
    return{loop:timing.iterations===Infinity,turning,stopped,holding};
  });
  expect(motion.loop).toBe(true);expect(motion.turning).not.toBe(motion.stopped);expect(motion.holding).toBe(motion.stopped);
  await expect(zoom).toHaveCSS('transform','matrix(1.07, 0, 0, 1.07, 0, 0)');
  await page.mouse.move(0,0);await expect(zoom).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 0)');await expect(ring).toHaveCSS('animation-name','none');
  await page.emulateMedia({reducedMotion:'reduce'});await portrait.hover();await expect(ring).toHaveCSS('animation-name','none');await expect(zoom).toHaveCSS('transform','none');
});
test('contact form selects request, validates and never claims an undelivered message was sent',async({page})=>{
  await page.goto('/contact.html?request=evaluation');await expect(page.locator('select[name=request]')).toHaveValue('evaluation');
  await page.getByRole('button',{name:'Contact Us'}).click();await expect(page.locator('input[name=name]:invalid')).toHaveCount(1);
  await page.getByLabel('Name',{exact:false}).fill('Review tester');await page.getByLabel('Email',{exact:false}).fill('review@example.com');await page.getByLabel('Message',{exact:false}).fill('Local form behavior test.');
  await page.getByRole('button',{name:'Contact Us'}).click();await expect(page.getByRole('status')).toContainText('could not be sent');await expect(page.getByRole('button',{name:'Contact Us'})).toBeEnabled();await expect(page.getByLabel('Message',{exact:false})).toHaveValue('Local form behavior test.');
});
test('content manager persists edits, exports them and restores the source',async({page,request})=>{
  const original=(await (await request.get('/api/content')).json());
  try{
    await page.goto('/admin/');await expect(page.getByRole('status')).toHaveText('Ready');
    await page.getByLabel('Heading',{exact:true}).first().fill('Edited review headline');
    await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.getByRole('status')).toContainText('Saved to');
    await expect(page.frameLocator('iframe').locator('h1')).toHaveText('Edited review headline');
    await page.locator('#tabs').getByRole('button',{name:'Colors & fonts'}).click();
    await page.getByLabel('Teal',{exact:true}).fill('#185C69');await page.getByLabel('Heading',{exact:true}).selectOption('Georgia');
    await page.getByRole('button',{name:'Save changes',exact:true}).click();await expect(page.getByRole('status')).toContainText('Saved to');
    const saved=JSON.parse(await readFile(path.join(root,'content/site.json'),'utf8'));expect(saved.home.hero.heading).toBe('Edited review headline');expect(saved.brand.palette.teal).toBe('#185C69');
    const response=await request.get('/api/export');expect(response.ok()).toBe(true);const files=unzipSync(new Uint8Array(await response.body()));
    expect(strFromU8(files['index.html'])).toContain('Edited review headline');expect(strFromU8(files['theme.css'])).toContain('Georgia');expect(files['contact.php']).toBeTruthy();expect(files['.htaccess']).toBeTruthy();expect(files['admin/index.html']).toBeUndefined();
  }finally{await writeFile(path.join(root,'content/site.json'),JSON.stringify(original.data,null,2)+'\n');await build();}
});
test('local editor rejects cross-origin writes and incomplete imported data',async({request})=>{
  const r=await request.get('/api/content');const state=await r.json();
  expect((await request.put('/api/content',{data:state.data})).status()).toBe(403);
  expect((await request.put('/api/content',{headers:{'X-CSRF-Token':state.csrf,'Origin':'https://example.com'},data:state.data})).status()).toBe(403);
  expect((await request.put('/api/content',{headers:{'X-CSRF-Token':state.csrf},data:{}})).status()).toBe(400);
});

for (const route of ['/', '/with-icon/']) {
  test(`A/B logos and replay from both scroll directions: ${route}`, async({page})=>{
    await page.emulateMedia({reducedMotion:'no-preference'});await page.goto(route);
    await expect(page.locator('.hero-logo')).toBeVisible();
    expect(await page.locator('.hero-logo').evaluate(e=>e.tagName.toLowerCase())).toBe(route==='/'?'svg':'img');
    const counter=page.locator('.hero-stats .stat-number').first();
    await counter.scrollIntoViewIfNeeded();await expect(counter).toHaveAttribute('data-counter-state','complete');
    const chart=page.locator('.market-chart');await chart.scrollIntoViewIfNeeded();await expect(chart).toHaveAttribute('data-chart-state','complete');
    await expect(counter).toHaveAttribute('data-counter-state','waiting');
    await counter.scrollIntoViewIfNeeded();await expect(counter).toHaveAttribute('data-counter-state','animating');await expect(counter).toHaveAttribute('data-counter-state','complete');
    await page.evaluate(()=>scrollTo(0,0));await expect(chart).toHaveAttribute('data-chart-state','waiting');
    await chart.scrollIntoViewIfNeeded();await expect(chart).toHaveAttribute('data-chart-state','animating');await expect(chart).toHaveAttribute('data-chart-state','complete');
    await page.locator('footer').scrollIntoViewIfNeeded();await expect(chart).toHaveAttribute('data-chart-state','waiting');
    await chart.scrollIntoViewIfNeeded();await expect(chart).toHaveAttribute('data-chart-state','animating');await expect(chart).toHaveAttribute('data-chart-state','complete');
    const photo=page.locator('.solution-image');await photo.scrollIntoViewIfNeeded();await expect(photo).toHaveClass(/visible/);
    await page.locator('footer').scrollIntoViewIfNeeded();await expect(photo).not.toHaveClass(/visible/);
    await photo.scrollIntoViewIfNeeded();await expect(photo).toHaveClass(/visible/);
  });
}
