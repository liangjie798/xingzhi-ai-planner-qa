import { pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import path from 'node:path';
const source=process.env.SOURCE_DIR||'G:/Ai Web/amap-jsapi';
const base=path.join(source,'Frontend/src/lib/');
const {AIRLINE_PROVIDERS}=await import(pathToFileURL(path.join(base,'airline-providers.ts')));
const {resolveAirportCity}=await import(pathToFileURL(path.join(base,'airport-cities.ts')));
const {probeAirline,closeAirlineBrowser}=await import(pathToFileURL(path.join(base,'airline-browser-server.ts')));
const targets=[['CZ','广州','北京','2026-10-31'],['MF','厦门','北京','2026-10-31'],['MU','上海','北京','2026-10-31'],['OQ','重庆','昆明','2026-11-04'],['9H','西安','乌鲁木齐','2026-10-31'],['GS','天津','西安','2026-10-31'],['SC','济南','广州','2026-10-31'],['KN','北京','温州','2026-10-31'],['9C','西安','上海','2026-11-25'],['RY','南昌','厦门','2026-10-31']];
const selected=new Set((process.argv[2]||'').split(',').filter(Boolean));
const out=path.resolve('G:/Ai Web/output/airline-agent-live');await fs.mkdir(out,{recursive:true});
const results=[];
try{for(const [code,origin,destination,date] of targets.filter(t=>!selected.size||selected.has(t[0]))){
 const query={origin,destination,date,from:resolveAirportCity(origin),to:resolveAirportCity(destination)};
 let observation;
 const result=await probeAirline(AIRLINE_PROVIDERS.find(p=>p.code===code),query,AbortSignal.timeout(28_000),async page=>{observation=page;await fs.writeFile(path.join(out,code+'-page.json'),JSON.stringify(page,null,2));});
 results.push({code,query,result});console.log(JSON.stringify({code,state:result.attempt.state,quotes:result.quotes.length,pageDate:observation?.pageDate,origin:observation?.originLabel,destination:observation?.destinationLabel,rows:observation?.rows.length,sample:result.quotes.slice(0,1)}));
 await fs.writeFile(path.join(out,'results.json'),JSON.stringify(results,null,2));
}}finally{await closeAirlineBrowser();}
