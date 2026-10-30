async (owner,targets)=>{
 const out=[];
 for(const t of targets){const p=await owner.context().newPage();await p.setViewportSize({width:1440,height:1000});await p.goto(t.entry||t.url,{waitUntil:'domcontentloaded',timeout:15000}).catch(()=>{});await p.waitForTimeout(2200);
 const d=await p.evaluate(()=>({inputs:[...document.querySelectorAll('input')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({id:e.id,name:e.name,placeholder:e.placeholder,type:e.type,value:e.value})),links:[...document.querySelectorAll('a[href]')].filter(e=>e.getBoundingClientRect().width>0&&/flight|ticket|book|tripreserve|ibe/i.test(e.href)).map(e=>({text:e.innerText.trim().slice(0,120),href:e.href})).slice(0,80),buttons:[...document.querySelectorAll('button,input[type=button],input[type=submit]')].filter(e=>e.getBoundingClientRect().width>0).map(e=>({text:e.innerText||e.value,id:e.id,cls:e.className})).slice(0,40),dialogs:[...document.querySelectorAll('[role=dialog],.modal.in')].map(e=>e.innerText.slice(-1600))}));out.push({id:t.id,url:p.url(),...d});await p.close();}
 return out;
}
