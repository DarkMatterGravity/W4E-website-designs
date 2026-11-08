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
});
test('Get Started rolls over to a white fill with a black border and text',async({page})=>{
  await page.goto('/');const cta=page.locator('.nav-cta');await cta.hover();
  await expect(cta).toHaveCSS('background-color','rgb(255, 255, 255)');
  await expect(cta).toHaveCSS('border-top-color','rgb(0, 0, 0)');
  await expect(cta).toHaveCSS('color','rgb(0, 0, 0)');
  await page.mouse.move(0,200);await cta.focus();await expect(cta).toHaveCSS('background-color','rgb(255, 255, 255)');
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
