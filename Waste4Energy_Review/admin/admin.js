let data, csrf, fonts, icons, streamImages, dirty=false, active='home';
const editor=document.querySelector('#editor');
const status=document.querySelector('#status');
const tabs=document.querySelector('#tabs');
const save=document.querySelector('#save');
const label=s=>s.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,s=>s.toUpperCase());
function set(path,value){let node=data;for(const key of path.slice(0,-1))node=node[key];node[path.at(-1)]=value;dirty=true;status.textContent='Unsaved changes';}
function fields(value,path,parent){
  if(typeof value==='string'){
    const wrap=document.createElement('label');wrap.className='field';wrap.textContent=label(path.at(-1));
    let input;
    const options=path.includes('fonts')?fonts:path.at(-1)==='icon'?icons:path.at(-1)==='image'?(path.includes('streams')?streamImages:['paul-bordelon.png','jeff-gloyd.png','torry-ingram.png','grant-williams.png']):null;
    if(options){input=document.createElement('select');for(const v of options){const o=document.createElement('option');o.value=v;o.textContent=v;input.append(o);}}
    else input=document.createElement(value.length>100 || ['text','intro','message','alt','mapAlt'].includes(path.at(-1))?'textarea':'input');
    input.setAttribute('aria-label',label(path.at(-1)));input.value=value;input.addEventListener('input',()=>set(path,input.value));
    if(path.includes('palette')){
      const row=document.createElement('div');row.className='color-field';
      const picker=document.createElement('input');picker.type='color';picker.value=value;picker.setAttribute('aria-label',`${path.at(-1)} color picker`);
      picker.addEventListener('input',()=>{input.value=picker.value;set(path,picker.value);});
      input.addEventListener('input',()=>{if(/^#[a-f\d]{6}$/i.test(input.value))picker.value=input.value;});
      input.pattern='#[a-fA-F0-9]{6}';input.required=true;row.append(picker,input);wrap.append(row);
    }else wrap.append(input);
    parent.append(wrap);return;
  }
  for(const [key,v] of Object.entries(value)){
    if(typeof v==='string')fields(v,[...path,key],parent);
    else{const group=document.createElement('fieldset');const legend=document.createElement('legend');legend.textContent=Array.isArray(value)?`${Number(key)+1}${v.name?' · '+v.name:v.title?' · '+v.title:''}`:label(key);group.append(legend);fields(v,[...path,key],group);parent.append(group);}
  }
}
function render(){
  editor.replaceChildren();fields(data[active],[active],editor);tabs.replaceChildren();
  for(const key of Object.keys(data)){const b=document.createElement('button');b.type='button';b.textContent=key==='brand'?'Colors & fonts':label(key);if(key===active)b.setAttribute('aria-current','true');b.addEventListener('click',()=>{active=key;render();});tabs.append(b);}
}
function preview(){const page=document.querySelector('#page').value;document.querySelector('iframe').src='/'+page+'?v='+Date.now();document.querySelector('#open').href='/'+page;}
document.querySelector('#page').addEventListener('change',preview);
editor.addEventListener('submit',e=>e.preventDefault());
save.addEventListener('click',async()=>{
  if(!editor.reportValidity())return;
  save.disabled=true;status.textContent='Saving…';
  try{const response=await fetch('/api/content',{method:'PUT',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw new Error(result.error);dirty=false;status.textContent='Saved to content/site.json';preview();}catch(e){status.textContent='Could not save: '+e.message;}finally{save.disabled=false;}
});
document.querySelector('#backup').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='w4e-content.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
document.querySelector('#import').addEventListener('click',()=>document.querySelector('#file').click());
document.querySelector('#file').addEventListener('change',async e=>{try{const next=JSON.parse(await e.target.files[0].text());if(!next.brand||!next.home||!next.technology||!next.about||!next.contact||!next.navigation)throw new Error('Choose a W4E content backup.');data=next;dirty=true;render();status.textContent='Imported. Save to validate and apply.';}catch(e){status.textContent='Could not import: '+e.message;}});
document.querySelector('#export').addEventListener('click',e=>{if(dirty){e.preventDefault();status.textContent='Save your changes before exporting.';}});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
fetch('/api/content').then(r=>{if(!r.ok)throw new Error('Server unavailable.');return r.json();}).then(result=>{({data,csrf,fonts,icons,streamImages}=result);render();status.textContent='Ready';}).catch(e=>status.textContent='Could not load: '+e.message);
