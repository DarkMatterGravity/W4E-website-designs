import path from 'node:path';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';
import { root, build } from './build.mjs';

async function assetFiles(folder,prefix='assets/') {
  const files={};
  for(const entry of await readdir(folder,{withFileTypes:true})) {
    const full=path.join(folder,entry.name);
    if(entry.isDirectory())Object.assign(files,await assetFiles(full,prefix+entry.name+'/'));
    else files[prefix+entry.name]=new Uint8Array(await readFile(full));
  }
  return files;
}
export async function createArchive() {
  const dist=path.join(root,'dist');
  const files=await assetFiles(path.join(dist,'assets'));
  for(const name of ['index.html','technology.html','about.html','contact.html','theme.css','styles.css','site.js','contact.php','server-config.example.php','.htaccess','robots.txt'])files[name]=new Uint8Array(await readFile(path.join(dist,name)));
  files['DEPLOYMENT.md']=new Uint8Array(await readFile(path.join(root,'DEPLOYMENT.md')));
  return zipSync(files);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  await build();
  const out=path.join(root,'exports');await mkdir(out,{recursive:true});
  const file=path.join(out,'Waste4Energy-GoDaddy.zip');await writeFile(file,await createArchive());console.log(`Exported ${file}`);
}
