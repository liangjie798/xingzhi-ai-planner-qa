async (page,targets)=>{
 const rows=[],context=page.context();
 for(const target of targets){
  const page=await context.newPage();
  const row={...target,checkedAt:new Date().toISOString(),stage:'homepage',quoteVerified:false},started=Date.now();
  try{
   let response;
   try{response=await page.goto(target.url,{waitUntil:'domcontentloaded',timeout:18000});}
   catch(e){if(!e.message.includes('interrupted by another navigation'))throw e;row.navigationWarning=e.message.split('\n')[0];await page.waitForLoadState('domcontentloaded',{timeout:10000});}
   row.status=response?.status();
   await page.waitForFunction(()=>document.body&&document.body.innerText.length>150,{},{timeout:4500}).catch(()=>{});
   await page.waitForTimeout(1200);
   row.finalUrl=page.url().replace(/;jsessionid=[^?&#]*/ig,';jsessionid=[redacted]');row.title=await page.title();
   row.text=(await page.locator('body').innerText({timeout:3000})).slice(0,13000);
   row.inputs=await page.locator('input,select').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().width>0).map(e=>({tag:e.tagName,type:e.type,id:e.id,name:e.name,placeholder:e.placeholder,value:e.type==='password'?'[redacted]':e.value,readonly:e.readOnly,label:e.getAttribute('aria-label')})).slice(0,35));
   row.links=await page.locator('a').evaluateAll(es=>es.filter(e=>/机票|航班预订|立即查询|查询航班|购票|预订行程/.test(e.innerText)).slice(0,14).map(e=>({text:e.innerText.slice(0,80),href:e.href})));
   row.frames=page.frames().map(frame=>frame.url());
   row.blocked=/请完成.*验证|人机验证|拖动滑块|访问过于频繁|拒绝访问|Access Denied|Forbidden|unusual traffic|验证您是真人/.test(row.text);
   row.outcome=row.status>=400?'http-error':row.blocked?'verification-or-access-notice':row.inputs.some(e=>/城市|出发|到达|日期/.test([e.label,e.placeholder,e.id,e.name].join(' ')))?'query-form-found':row.text.length<150?'blank-or-script-only':'homepage-readable';
   await page.screenshot({path:`output/playwright/all-airlines-20261030/${target.id}-homepage.png`,timeout:5000}).catch(()=>{});
  }catch(e){row.outcome='navigation-failed';row.error=e.name+': '+e.message.split('\n')[0];}
  row.ms=Date.now()-started;rows.push(row);await page.close();
 }
 return rows;
}
