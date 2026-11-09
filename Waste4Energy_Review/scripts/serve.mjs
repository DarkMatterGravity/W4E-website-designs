import http from 'node:http';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { root, build, validate, fonts, icons, streamImages } from './build.mjs';
import { createArchive } from './export.mjs';

const dist = await build();
const baseline = JSON.parse(await readFile(path.join(root,'content/site.json'),'utf8'));
const csrf = randomBytes(32).toString('hex');
const port = Number(process.env.PORT || 4173);
const host = '127.0.0.1';
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json; charset=utf-8'};
let saving = false;

async function body(req) {
  let result = '';
  for await (const chunk of req) { result += chunk; if (Buffer.byteLength(result) > 250000) throw new Error('Content is too large.'); }
  return JSON.parse(result);
}
const server = http.createServer(async (req,res) => {
  const json = (status,value) => { res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'}); res.end(JSON.stringify(value)); };
  try {
    if (req.headers.host !== `${host}:${port}` && req.headers.host !== `localhost:${port}`) return json(403,{error:'Local access only.'});
    if (req.headers.origin && ![`http://${host}:${port}`,`http://localhost:${port}`].includes(req.headers.origin)) return json(403,{error:'Local access only.'});
    const url = new URL(req.url,`http://${host}:${port}`);
    if (url.pathname === '/api/content' && req.method === 'GET') return json(200,{data:JSON.parse(await readFile(path.join(root,'content/site.json'),'utf8')),csrf,fonts,icons,streamImages});
    if (url.pathname === '/api/content' && req.method === 'PUT') {
      if (req.headers['x-csrf-token'] !== csrf) return json(403,{error:'Reload the editor.'});
      if (saving) return json(409,{error:'A save is in progress.'});
      saving = true;
      try {
        const data = validate(await body(req),baseline);
        await writeFile(path.join(root,'content/site.json'),JSON.stringify(data,null,2)+'\n');
        await build();
        return json(200,{ok:true});
      } finally { saving = false; }
    }
    if (url.pathname === '/api/export' && req.method === 'GET') {
      if (saving) return json(409,{error:'Wait for the save to finish.'});
      const archive = await createArchive();
      res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="Waste4Energy-GoDaddy.zip"','Cache-Control':'no-store'});
      return res.end(Buffer.from(archive));
    }
    if (['/contact.php','/with-icon/contact.php'].includes(url.pathname)) return json(503,{ok:false}); // Never fake email delivery in static preview.
    if (!['GET','HEAD'].includes(req.method)) return json(405,{error:'Method not allowed.'});
    const admin = url.pathname === '/admin' || url.pathname.startsWith('/admin/');
    if (url.pathname === '/with-icon') { res.writeHead(302,{Location:'/with-icon/'}); return res.end(); }
    const withIcon = url.pathname.startsWith('/with-icon/');
    const base = admin ? path.join(root,'admin') : withIcon ? path.join(root,'dist-icon') : dist;
    let relative = admin ? url.pathname.replace(/^\/admin\/?/,'') : withIcon ? url.pathname.slice('/with-icon/'.length) : url.pathname.slice(1);
    if (!relative) relative = 'index.html';
    const full = path.resolve(base,decodeURIComponent(relative));
    if (!full.startsWith(base+path.sep) || full.endsWith('.php') || path.basename(full).startsWith('.')) return json(404,{error:'Not found.'});
    const bytes = await readFile(full);
    res.writeHead(200,{'Content-Type':mime[path.extname(full)] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; style-src 'self'; img-src 'self' data:; script-src 'self'; font-src 'self'; connect-src 'self'; frame-src 'self'; form-action 'self'; base-uri 'self'"});
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch(error) { json(error.code==='ENOENT'?404:400,{error:error.code==='ENOENT'?'Not found.':error.message}); }
});
server.listen(port,host,()=>console.log(`Website: http://${host}:${port}\nContent manager: http://${host}:${port}/admin/`));
