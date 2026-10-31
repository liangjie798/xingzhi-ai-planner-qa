import fs from 'node:fs/promises';
const base='https://lht574.cn',cookies=new Map(),rows=[],root='reports/live-retest-20261031-evening';
let sessionId,csrfHeaders={};
async function request(path,data,method=data===undefined?'GET':'POST'){
  const start=Date.now();
  const r=await fetch(base+path,{method,headers:{...csrfHeaders,...(data===undefined?{}:{'Content-Type':'application/json'}),Cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')},body:data===undefined?undefined:JSON.stringify(data),signal:AbortSignal.timeout(65000)});
  for(const c of r.headers.getSetCookie()){const p=c.split(';')[0],i=p.indexOf('=');cookies.set(p.slice(0,i),p.slice(i+1));}
  const text=await r.text();let body;try{body=JSON.parse(text)}catch{body={detail:text.slice(0,300)}}
  return {status:r.status,ms:Date.now()-start,body};
}
async function token(){const r=await request('/api/v1/auth/csrf');csrfHeaders={[r.body.headerName]:r.body.token};}
try{
  await token();
  const login=await request('/api/v1/auth/login',{username:process.env.QA_LOGIN_USER,password:process.env.QA_LOGIN_PASSWORD,portal:'USER'});
  rows.push({name:'account-login',status:login.status,ms:login.ms,passed:login.status===200});
  if(login.status!==200)throw Error('Account authentication failed; no retries were attempted');
  await token();
  const model=await request('/model-gateway',{prompt:'仅计算17乘以19，回答数字，不要其他文字。'});
  rows.push({name:'real-model-connection',status:model.status,ms:model.ms,passed:model.status===200&&/323/.test(model.body.text||''),text:model.body.text,modelCall:model.body.modelCall,model:model.body.model,provider:model.body.provider,error:model.body.detail});
  const created=await request('/api/v1/conversation-sessions',{version:1,messages:[],intake:{known:{}}});
  if(![200,201].includes(created.status)||!created.body.id)throw Error('Could not create isolated QA conversation');
  sessionId=created.body.id;
  const prompts=[
    '请记住：本次测试旅行代号是青竹4726。',
    '请记住：本次同行人的名字是林舟。',
    ...Array.from({length:20},(_,i)=>`请记住：旅行备忘${i+1}是携带第${i+1}号用品。`),
    '本次测试旅行代号是什么？同行人叫什么？',
    '把本次测试旅行代号改成白鹭9361，其他不变。',
    '当前旅行代号是什么？同行人叫什么？',
    '请忘记本次测试旅行代号。',
    '你还记得本次测试旅行代号吗？不要猜测。',
    '本次同行人的名字是什么？',
    '旅行备忘1是什么？',
    '同行人的名字是什么？旅行备忘1是什么？'
  ];
  for(const [i,message]of prompts.entries()){
    const r=await request('/conversation-planner',{conversationId:sessionId,message});
    rows.push({name:`memory-turn-${i+1}`,turn:i+1,status:r.status,ms:r.ms,message,reply:r.body.reply,kind:r.body.kind,command:r.body.command,modelCall:r.body.modelCall,error:r.body.detail});
    if(r.status!==200)break;
  }
  const recall=rows.find(r=>r.turn===23),correction=rows.find(r=>r.turn===25),forgot=rows.find(r=>r.turn===27);
  rows.push({name:'explicit-memory-after-22-turns',passed:recall?.status===200&&/青竹4726/.test(recall.reply)});
  rows.push({name:'compound-memory-question',passed:recall?.status===200&&/青竹4726/.test(recall.reply)&&/林舟/.test(recall.reply)});
  rows.push({name:'memory-correction',passed:correction?.status===200&&/白鹭9361/.test(correction.reply)&&!/青竹4726/.test(correction.reply)});
  rows.push({name:'memory-forget',passed:forgot?.status===200&&!/白鹭9361|青竹4726/.test(forgot.reply),reply:forgot?.reply});
  rows.push({name:'individual-companion-memory',passed:/林舟/.test(rows.find(r=>r.turn===28)?.reply||'')});
  rows.push({name:'individual-first-memo-memory',passed:/第1号用品/.test(rows.find(r=>r.turn===29)?.reply||'')});
  rows.push({name:'memory-value-cleanliness',passed:!/(其他不变|只修改)/.test(correction?.reply||'')});
}catch(e){rows.push({name:'execution-error',passed:false,error:e.message});}
finally{
  if(sessionId){try{const r=await request('/api/v1/conversation-sessions/'+sessionId,undefined,'DELETE');rows.push({name:'cleanup-isolated-conversation',status:r.status,passed:r.status===200||r.status===204});}catch(e){rows.push({name:'cleanup-isolated-conversation',passed:false,error:e.message});}}
  await fs.mkdir(root,{recursive:true});await fs.writeFile(root+'/account-memory.json',JSON.stringify({scope:'Existing authorized account, a new isolated conversation only. Explicit memory operations, not a general LLM context capacity measurement.',rows},null,2)+'\n');
  console.log(JSON.stringify({cases:rows.length,checks:rows.filter(r=>r.passed!==undefined).map(({name,passed,status,ms})=>({name,passed,status,ms})),turns:rows.filter(r=>r.turn).length}));
  if(rows.some(r=>r.passed===false||(r.turn&&r.status!==200)))process.exitCode=1;
}
