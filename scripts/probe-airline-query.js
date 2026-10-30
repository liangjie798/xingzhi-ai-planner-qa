async (owner,targets)=>{
 const rows=[],context=owner.context();
 for(const target of targets){
  const existingPages=new Set(context.pages());
  const page=await context.newPage(),started=Date.now(),row={id:target.id,name:target.name,url:target.url,origin:target.origin,destination:target.destination,checkedAt:new Date().toISOString(),quoteVerified:false,actions:[]};
  page.setDefaultTimeout(3500);page.setDefaultNavigationTimeout(18000);
  await page.setViewportSize({width:1440,height:1000});
  const stop=async()=>{const text=await page.locator('body').innerText();if(/请完成.*验证|拖动滑块|访问过于频繁|拒绝访问|Access Denied|Forbidden|验证您是真人|滑动验证|请依次点击/.test(text))throw new Error('visible-access-or-verification-challenge');return text;};
  async function choose(field,city){
   await field.click({timeout:3500});
   if(await field.isEditable())await field.fill(city,{timeout:3500});
   await page.waitForTimeout(400);
   const bounds=await field.boundingBox();
   const candidates=page.getByText(new RegExp('^'+city+'(?:$|.*(?:机场|[A-Z]{3}))'));
   let selected=false;
   for(let n=0;n<Math.min(await candidates.count(),35);n++){
    const e=candidates.nth(n),box=await e.boundingBox();
    if(box&&bounds&&box.y>=bounds.y-50&&box.y<=bounds.y+650&&Math.abs(box.x-bounds.x)<550&&await e.isVisible()){
     await e.click({timeout:2500});selected=true;break;
    }
   }
   if(!selected){await field.press('ArrowDown');await field.press('Enter');await page.waitForTimeout(250);}
   const value=await field.inputValue();row.actions.push({field:city,selectedFromVisibleOption:selected,value});
   if(!value.includes(city))throw new Error('city-selection-mismatch:'+city+' -> '+value);
   await page.keyboard.press('Escape');
  }
  try{
   await page.goto(target.entry||target.url,{waitUntil:'domcontentloaded',timeout:18000});
   await page.waitForTimeout(5500);await stop();
   for(let pass=0;pass<3;pass++){
    const body=await page.locator('body').innerText();
    if(body.includes('我已阅读并同意')&&body.includes('隐私')){
     const boxes=page.getByRole('checkbox').filter({visible:true});
     if(await boxes.count()<=2)for(let n=0;n<await boxes.count();n++)await boxes.nth(n).check({timeout:1200}).catch(()=>{});
    }
    const notices=page.getByText(/^(?:确\s*定|知道了|我知道了|我已阅读并同意|已阅读并同意|我已阅读并确认|同意并继续购票|继续购票|继续|同意|关闭|Close|×|X)$/).filter({visible:true});
    for(let n=(await notices.count())-1;n>=0;n--)await notices.nth(n).click({timeout:1600}).catch(()=>{});await page.waitForTimeout(500);
   }
   // Prefer public booking links when homepages contain only marketing navigation.
   let from=(target.from?page.locator(target.from):page.getByPlaceholder(/出发城市|出发地|出发机场|出发站/)).filter({visible:true}).first();
   if(!await from.count()){
    const link=page.getByRole('link',{name:/^(?:机票预订|航班预订|搜索机票)$/}).first();
    const href=await link.getAttribute('href').catch(()=>null);
    if(href&&/^https?:|^\//.test(href)){await page.goto(new URL(href,page.url()).href,{waitUntil:'domcontentloaded',timeout:15000});await page.waitForTimeout(2500);from=(target.from?page.locator(target.from):page.getByPlaceholder(/出发城市|出发地|出发机场|出发站/)).filter({visible:true}).first();}
   }
   const to=(target.to?page.locator(target.to):page.getByPlaceholder(/到达城市|目的城市|目的地|到达地|到达机场/)).filter({visible:true}).first();
   await from.waitFor({state:'visible',timeout:5000}).catch(()=>{});
   if(!await from.count()||!await to.count())throw new Error('query-form-not-interactable');
   await choose(from,target.origin);await choose(to,target.destination);await stop();
   const date=(target.date?page.locator(target.date):page.getByPlaceholder(/出发日期|去程日期|请选择出发日期/)).filter({visible:true}).first();
   if(await date.count()){
    const value=await date.inputValue();
    if(!value||/2026[-/]10[-/]30/.test(value)){
     if(await date.isEditable())await date.fill('2026-10-31').catch(()=>{});
     else{await date.click({timeout:3000});await page.waitForTimeout(800);const thirtyOne=page.getByText(/^31(?:\s*\d+)?$/).filter({visible:true});for(let n=0;n<await thirtyOne.count();n++)if(await thirtyOne.nth(n).isVisible()){await thirtyOne.nth(n).click({timeout:2500});break;}}
    }
    row.date=await date.inputValue();
   }
   await page.waitForTimeout(500);await page.keyboard.press('Escape');
   if(await page.getByRole('gridcell').filter({visible:true}).count()){const days=page.getByRole('gridcell').filter({visible:true}).filter({hasText:/^31(?:\s|$)/});if(await days.count())await days.first().click({timeout:3500});}
   let search=(target.search?page.locator(target.search):page.getByRole('button',{name:/^(?:search\s*)?(?:开始预订|查询预订|查找航班|立即查询|查询航班|搜索航班|机票查询|查询机票|搜索机票|搜索航班|立即购票|购票|查\s*询|搜\s*索|立即搜索|立即预订|航班查询)$/i})).filter({visible:true}).last();
   if(!await search.count())search=page.getByText(/^(?:开始预订|查询预订|查找航班|立即查询|查询航班|航班查询|搜索航班|立即购票|查\s*询|搜\s*索|搜索机票)$/).filter({visible:true}).last();
   if(!await search.count())throw new Error('search-control-not-found');
   await search.click({timeout:5000});row.submitted=true;
   await page.waitForTimeout(3500);
   await page.waitForFunction(()=>{const t=document.body.innerText;return /请完成.*验证|拖动滑块|访问过于频繁|Access Denied|没有.*航班|无符合|无直达|经济舱|公务舱|¥\s*\d+/.test(t)},{},{timeout:10000}).catch(()=>{});
   row.text=(await stop()).slice(0,40000);row.outcome='submitted-result-needs-review';
  }catch(e){row.outcome=e.message.includes('visible-access')?'verification-blocked':row.submitted?'submitted-but-incomplete':'could-not-submit';row.error=(e.name+': '+e.message).slice(0,1800);}
  row.finalUrl=page.url().replace(/;jsessionid=[^?&#]*/ig,';jsessionid=[redacted]');row.title=await page.title().catch(()=>'');
  if(!row.text)row.text=(await page.locator('body').innerText({timeout:1000}).catch(()=>'')).slice(0,10000);
  await page.screenshot({path:`output/playwright/all-airlines-20261030/${target.id}-query.png`,timeout:4000}).catch(()=>{});
  row.alternatePages=[];
  for(const extra of context.pages().filter(p=>!existingPages.has(p)&&p!==page).slice(0,3)){
   await extra.waitForLoadState('domcontentloaded',{timeout:5000}).catch(()=>{});
   const text=await extra.locator('body').innerText({timeout:2000}).catch(()=>'');
   row.alternatePages.push({url:extra.url(),title:await extra.title().catch(()=>''),text:text.slice(0,40000)});
   await extra.screenshot({path:`output/playwright/all-airlines-20261030/${target.id}-query-popup-${row.alternatePages.length}.png`,timeout:3000}).catch(()=>{});
  }
  row.ms=Date.now()-started;rows.push(row);
  await Promise.all(context.pages().filter(p=>!existingPages.has(p)).map(p=>p.close().catch(()=>{})));
 }
 return rows;
}
