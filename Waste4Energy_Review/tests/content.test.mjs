import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { root, renderPage, validate } from '../scripts/build.mjs';

const data=JSON.parse(await readFile(path.join(root,'content/site.json'),'utf8'));
test('source content lands on the intended pages without template placeholders',()=>{
  const home=renderPage(data,'home'), technology=renderPage(data,'technology'), about=renderPage(data,'about');
  for(const item of data.home.streams.items)assert.ok(home.includes(item.title));
  for(const member of data.about.team){assert.ok(about.includes(member.name));assert.ok(about.includes(member.role));assert.ok(!home.includes(member.role));}
  assert.ok(technology.includes('Process_Illustration.jpeg'));
  assert.ok(technology.includes('Phase 2 Additions'));
  assert.ok(technology.includes('Unknown Equipment'));
  for(const page of ['home','technology','about','contact'])assert.doesNotMatch(renderPage(data,page),/Lorem ipsum|Placeholder|555|\$56B|undefined|href="#"/i);
});
test('editor text is escaped and unsafe theme or asset changes are rejected',()=>{
  const copy=structuredClone(data);copy.home.hero.heading='<script>alert(1)</script>';
  assert.ok(renderPage(copy,'home').includes('&lt;script&gt;'));
  copy.brand.palette.teal='red;}body{display:none';assert.throws(()=>validate(copy,data));
  copy.brand.palette.teal=data.brand.palette.teal;copy.brand.fonts.heading='";url(https://x)';assert.throws(()=>validate(copy,data));
  copy.brand.fonts.heading=data.brand.fonts.heading;copy.about.team[0].image='../secret';assert.throws(()=>validate(copy,data));
});
test('every public page link and asset resolves within the export',async()=>{
  for(const page of ['index','technology','about','contact']){
    const html=await readFile(path.join(root,`dist/${page}.html`),'utf8');
    for(const match of html.matchAll(/(?:src|href|action)="([^"]+)"/g)){
      const value=match[1].split(/[?#]/)[0];if(!value)continue;
      await access(path.join(root,'dist',value));
    }
  }
});
