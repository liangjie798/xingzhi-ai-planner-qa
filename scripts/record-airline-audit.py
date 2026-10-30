from pathlib import Path
import json,re,csv,shutil,collections,hashlib,sys
from urllib.parse import urlsplit,urlunsplit,parse_qsl,urlencode
sys.stdout.reconfigure(encoding='utf-8')
root=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path(__file__).resolve().parents[2];src=root/'output/playwright/all-airlines-20261030';dst=root/'xingzhi-ai-planner-qa/reports/airlines-20261030';dst.mkdir(parents=True,exist_ok=True)
(dst/'evidence').mkdir(exist_ok=True);(dst/'screenshots').mkdir(exist_ok=True)
def sanitize(value):
 if isinstance(value,dict):return {k:sanitize(v) for k,v in value.items()}
 if isinstance(value,list):return [sanitize(v) for v in value]
 if isinstance(value,str):
  value=re.sub(r';jsessionid=[^?&#\s\"\']+', ';jsessionid=[redacted]',value,flags=re.I)
  value=re.sub(r'((?:telassaSessionId|telassaId|telassaRootId)(?:%3D|=))[^&\s\"\']+',r'\1[redacted]',value,flags=re.I)
  value=re.sub(r'([?&])ark-trace-(?:id|baggage)=[^\s\"\']+',r'\1trace=[redacted]',value,flags=re.I)
  value=re.sub(r'([?&](?:escK|access_token|csrf|token|signature)=)[^&\s\"\']+',r'\1[redacted]',value,flags=re.I)
  value=re.sub(r'\x1b\[[0-9;]*m','',value)
 return value
for f in src.glob('*.json'):
 if f.name=='open-result-pages.json':continue
 try:data=json.loads(f.read_text(encoding='utf-8-sig'))
 except Exception:continue
 (dst/'evidence'/f.name).write_text(json.dumps(sanitize(data),ensure_ascii=False,indent=2),encoding='utf-8')
for name in ['ceair-result','chongqing-homepage','capital-manual','united-manual','chongqing-result','qingdao-result','spring-result','jiangxi-result']:
 s=(src/(name+'.txt')).read_text(encoding='utf-8-sig');data=json.loads(s.split('### Result')[1].split('### Ran')[0].strip());(dst/'evidence'/(name+'.json')).write_text(json.dumps(sanitize(data),ensure_ascii=False,indent=2),encoding='utf-8')
orphans=json.loads((src/'open-result-pages.json').read_text(encoding='utf-8-sig'));hna=next(x for x in orphans if 'new.hnair.com' in x['url']);hna['url']=hna['url'].split('?')[0];(dst/'evidence/hainan-result.json').write_text(json.dumps(hna,ensure_ascii=False,indent=2),encoding='utf-8')
old=root/'output/playwright/airline-feasibility-20261030'
for name in ['csair-result.json','csair-rows.json','xiamen-result.json','summary.json']:
 data=json.loads((old/name).read_text(encoding='utf-8-sig'));(dst/'evidence'/name).write_text(json.dumps(sanitize(data),ensure_ascii=False,indent=2),encoding='utf-8')
for f in src.glob('*.png'):shutil.copy2(f,dst/'screenshots'/f.name)
for name in ['csair-results.png','csair-CZ3107.png','xiamen-results.png']:shutil.copy2(old/name,dst/'screenshots'/name)
inv=json.loads((src/'inventory.json').read_text(encoding='utf-8-sig'));inv[10]['url']='https://www.chongqingairlines.cn/'
# Human review is authoritative; generic harness completion does not verify a quotation.
quotes={
 3:('上海→北京','2026-10-31','MU5137','09:25–11:50',500,'税费口径未核验','ceair-result.json','结果含共享及其他航司，不按航班号前缀推断实际承运人'),
 7:('广州→北京大兴','2026-10-31','CZ3107','21:00–次日00:05',910,'税费口径未核验','csair-result.json','列表14条；跨日必须单独保存'),
 11:('重庆→昆明','2026-11-04','CZ2117 / OQ2117','07:20–08:50',310,'税费口径未核验','chongqing-result.json','官网明确实际承运重庆、缔约承运南航'),
 12:('厦门→北京大兴','2026-10-31','MF8103','21:00–23:40',680,'起价；日历明确不含税，航班最终总价未核验','xiamen-result.json','列表7条；MF3617由MU5169承运、经停合肥，不算厦航直飞'),
 13:('北京首都→海口','2026-10-31','HU7182','13:00–16:50',3770,'起价；税费口径未核验','hainan-result.json','部分舱位同时出现原价和优惠价，未核实优惠资格；样例选单一展示价格'),
 15:('西安→乌鲁木齐','2026-10-31','9H8329','07:45–11:30',330,'起价；税费口径未核验','caac-15-query.json','页面已进入结果，原通用脚本因导航后旧输入框失效报超时，人工复核确认报价'),
 16:('天津→西安','2026-10-31','GS7673','10:20–12:30',700,'起价；税费口径未核验','caac-16-query.json','售罄公务舱出现 Infinity，必须拒收非有限数值'),
 21:('济南→广州','2026-10-31','SC1173','08:00–10:55',1118,'税费口径未核验','caac-21-query.json','证据在 alternatePages 结果页；日历1020与本航班1118不可混同'),
 23:('北京大兴→温州','2026-10-31','KN5961','08:00–10:20',410,'税费口径未核验','united-manual.json','KN5915为经停；仅列样例直达航班'),
 24:('深圳→北京首都','2026-10-31','ZH9107','14:30–17:45',600,'税费口径未核验','caac-24-query.json','19个营销航班号，不等于19架本航司独立执飞飞机'),
 28:('西安→上海虹桥','2026-11-25','9C8676','21:30–23:40',290,'起价；税费口径未核验','spring-result.json','从官网公开特价链接进入结果页；不是原失败用例的上海→沈阳条件'),
 31:('上海虹桥→长沙','2026-11-02','HO1085','21:50–23:50',320,'官网明确不含税起价','promotion-results.json','首页推广价302，进入本次结果为320；结果还含共享航班，不能复用首页价'),
 35:('昆明→济南','2026-11-04','KY8201','09:10–12:15',452,'税费口径未核验','promotion-results.json','结果截图日期为11月4日；另一班KY8239经停荆州'),
 45:('青岛→沈阳','2026-10-31','QW9779','06:50–08:30',260,'税费口径未核验','qingdao-result.json','通过正常勾选两项隐私/Cookie同意后使用特价入口；会员价另列，不混用'),
 52:('南昌→厦门','2026-10-31','RY8917','18:30–20:00',270,'起价；税费口径未核验','jiangxi-result.json','U舱仅剩6张，明确无免费托运行李；不能与含行李产品直接比较'),
 55:('桂林→海口','2026-10-31','GT1140','23:15–次日00:45',690,'官网明确不含税起价','caac-55-query.json','超值经济舱D2，20KG免费托运行李，剩6张；普通经济舱售罄')}
barriers={17:('verification-required','正确提交北京→杭州、10月31日后出现“请依次点击”验证，已停止','capital-manual.json'),29:('login-required','华夏正常提交查询后转入会员登录页','caac-29-query.json'),30:('session-expired','深圳→南通，11月1日结果提示会话已过期，请重新登录','caac-30-query.json'),36:('tls-error','ERR_CERT_DATE_INVALID；未忽略证书校验','caac-36-query.json'),42:('login-required','从杭州→长春11月1日公开特价入口转入登录页','promotion-results.json'),48:('verification-required','福州→昆明，10月31日正常提交后出现请依次点击验证，停止查询','caac-48-query.json'),56:('login-required','哈尔滨→珠海，10月31日提示请先登录；不能据此判定无航班','caac-56-query.json'),61:('login-required','呼和浩特→锡林浩特，10月31日提示请先登录；不能据此判定无航班','caac-61-query.json')}
notes={18:'通用脚本操作后未进入具体航班列表，推广价不作为报价',19:'修正异步日历后已提交，但未取得具体航班结果，待站点适配',25:'查询后表单显示此处不可空白；输入城市文字未形成有效机场选择',26:'目前误进入航班动态，已查到BK3065/BK2735时刻，但没有票价；不算查价成功',27:'已补测关闭出行提醒并选择城市日期，提交尝试后仍未进入具体航班结果；需专用适配',33:'公告“关于登录滑块验证码操作的提示”不是本次验证挑战；表单操作未完成',34:'城市选择与图标搜索需专用适配；未取得具体航班报价',39:'官网重定向至airxizang.com，提醒窗口遮挡表单；待专用适配',44:'脚本目标无锡，却进入芒市LUM结果，路线不一致，拒绝计为成功',47:'修正异步日历后已提交，但未取得具体航班结果，推广日历不作为报价',48:'日历/城市控件尚未完成可靠提交，推广日历不作为报价',49:'贵阳目的地选择失效为空，未取得可信结果',50:'homePageReminder告知框遮挡操作，待专用关闭流程',53:'城市选择为自定义控件；点击后未取得可操作城市列表，尚未完成查询',54:'页面显示暂无数据，但城市编码未确认；不判定此航线无航班'}
review=[]
for x in inv:
 n=x['index'];r={**x,'quoteVerified':False,'status':'needs-site-adapter','statusLabel':'操作未完成/待适配','reason':notes.get(n,'独立承运人尚未核实'),'evidence':f'evidence/caac-{n}-query.json' if (src/f'caac-{n}-query.json').exists() else None,'homepageAttempted':(src/f'caac-{n}.json').exists() or n==11,'queryAttempted':(src/f'caac-{n}-query.json').exists() or n in [7,11,12]}
 if n in quotes:
  route,date,flight,times,price,basis,evidence,reason=quotes[n];r.update(status='quote-observed',statusLabel='已取得具体航班展示报价',quoteVerified=True,route=route,departureDate=date,exampleFlight=flight,exampleTime=times,displayPriceCny=price,priceBasis=basis,reason=reason,evidence='evidence/'+evidence)
 elif n in barriers:
  status,reason,evidence=barriers[n];r.update(status=status,statusLabel={'verification-required':'点选验证限制','login-required':'需登录','session-expired':'会话过期','tls-error':'TLS证书错误'}[status],reason=reason,evidence='evidence/'+evidence)
 elif n==1:r.update(status='policy-restricted',statusLabel='协议限制，未自动查价',reason='已核对官网协议对未经许可抓取的限制；不运行自动票价采集',evidence=None)
 elif x['category']=='cargo-no-passenger-query':r.update(status='not-applicable-cargo',statusLabel='货运，不适用客票查价',reason='本轮客运票价范围不适用；不宣称独立网站已实测',evidence=None)
 elif x['category']=='group-entry-needs-carrier-confirmation':r.update(status='group-entry-unverified',statusLabel='集团入口，承运人待核实',reason='仅整理集团关联入口；集团报价不能证明该法人主体已独立测通',evidence=None)
 review.append(r)
summary={'auditDate':'2026-10-30','registry':'CAAC transport airline directory, 4 pages','totalEntities':65,'counts':dict(collections.Counter(r['status'] for r in review)),'homepageAttempts':sum(r['homepageAttempted'] for r in review),'queryAttempts':sum(r['queryAttempted'] for r in review),'liveProjectModified':False,'deployed':False,'limitations':['One or a few sample routes per passenger website, not all routes','No final payment total verification','No cloud-host test, durability or concurrency test','Group entities not independently verified','No captcha bypass, login or order creation'],'results':review}
(dst/'results.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
with (dst/'airline-matrix.csv').open('w',encoding='utf-8-sig',newline='') as f:
 keys=['index','name','category','url','status','statusLabel','quoteVerified','homepageAttempted','queryAttempted','route','departureDate','exampleFlight','exampleTime','displayPriceCny','priceBasis','reason','evidence'];w=csv.DictWriter(f,fieldnames=keys,extrasaction='ignore');w.writeheader();w.writerows(review)
labels={'quote-observed':'具体航班展示报价已复核','needs-site-adapter':'操作未完成，待专用适配','login-required':'需登录','verification-required':'点选验证','session-expired':'会话过期','tls-error':'TLS证书错误','policy-restricted':'协议限制，未自动查价','not-applicable-cargo':'货运，不适用','group-entry-unverified':'集团入口，承运主体待核实'}
lines=['# 国内航司官网实测 · 2026-10-30','','本轮是采集可行性与障碍审计。以民航局四页目录的65个运输航空公司条目为清单，**不能解读为65家客运航司全部测通**。未修改应用 Agent、未删除飞常准、未部署。','',f'本机 Microsoft Edge + Playwright CLI；{summary["homepageAttempts"]}个独立客运网站进行访问和查询尝试。部分尝试止于导航/TLS或表单操作，查询尝试不等于成功提交，更不等于取得报价。','', '## 结果统计','','| 结果 | 数量 |','| --- | ---: |']
lines += [f'| {labels[k]} | {v} |' for k,v in summary['counts'].items()]
lines += ['', '**结论：已验证部分站点的单次公开报价采集可行；当前证据不支持“所有航司免费无人值守查价”，也不足以直接替换生产票价服务。** 登录、点选验证、证书错误不能用虚构价格兜底；未完成的城市选择/日期/弹窗操作也不能冒充上游失败。','','## 已复核报价样例','','单程、1成人。价格为测试当时页面显示值，均未进入旅客填写、订单或支付，不保证含税总额及最终可购买性。多数查询日期为10月31日；其他日期逐条列出，不能跨日期比较。','','| 航司 | 航线 / 日期 | 航班 / 时间 | 页面价格 | 价格口径 | 证据 |','| --- | --- | --- | ---: | --- | --- |']
for r in review:
 if r['quoteVerified']:lines.append(f'| {r["name"]} | {r["route"]} / {r["departureDate"]} | {r["exampleFlight"]} / {r["exampleTime"]} | ¥{r["displayPriceCny"]} | {r["priceBasis"]} | [页面文本]({r["evidence"]}) |')
lines += ['','## 接入前必须解决的问题','','- **数值**：天津航空售罄舱位出现`Infinity`，只接受有限正数，并检查该舱位可售状态。','- **口径**：区分裸票价、含税总价、会员优惠与推广日历。吉祥首页302元，进入结果为320元；不能沿用首页价。','- **承运人**：保留营销航班号、实际承运人、经停/中转、跨日信息。重庆官网展示CZ/OQ双号；厦航共享航班由东航承运。','- **条件一致**：结果必须与出发地、目的地、日期、乘客一致；瑞丽脚本从目标无锡错选到芒市的结果已经拒收。','- **失败分型**：需登录、需人工验证、会话过期、TLS错误、无数据、解析失败分别返回；城市编码不明确时不能返回“无航班”。','- **稳定性**：每站专用适配、低并发、超时、缓存、熔断和来源时间；需在实际部署环境重复验证。一次本机成功不等于长期服务可用。','- **权限**：国航按已核对的协议限制不执行自动抓取。其他站点的公开可访问性也不自动构成持续商业采集授权。','','## 65项完整清单','','| 序号 | 公司 | 状态 | 说明 |','| ---: | --- | --- | --- |']
for r in review:lines.append(f'| {r["index"]} | {r["name"]} | {r["statusLabel"]} | {r["reason"]} |')
lines += ['','## 可复现用例与执行边界','','1. TC-INV：打开民航局目录四页，核对65项名称；货运与集团入口单列，不补造客票。','2. TC-HOME：各独立客运域名导航、记录重定向和TLS状态、保存首页截图；不将HTTP 200或首页推广价算作实时报价。','3. TC-QUERY：使用公开查询表单或公开特价链接，选择城市建议、日期、单程1成人，提交后核对结果条件。','4. TC-QUOTE：核对至少一个具体航班号、两端时刻、结果日期、对应舱位价格和税费口径；人工审阅后才将quoteVerified标真。','5. TC-BARRIER：遇登录、点选验证、会话过期或TLS错误保存证据并停止；不登录、不绕过、不忽略TLS。','6. TC-QUALITY：检查共享/经停/跨日、会员限制、行李、售罄/Infinity；未验证最终支付总额。','7. TC-ADAPTER：脚本点击失败要与真实业务限制分开；修正弹窗、城市建议、异步日历、弹出结果标签页后重试。','','已执行通用表单多轮重试、人工修正、公开推广入口补测。`submitted-result-needs-review`只表示脚本提交阶段完成；`results.json`人工复核才是最终结论。原始通用脚本中的`quoteVerified:false`保留，不用脚本阶段状态冒充核实结果。','','未测：全部航线/日期、出票库存锁定、支付价、登录后查询、压力/并发、跨日持续运行、云服务器环境；13个集团条目的独立承运主体未验证。未发现航班/价格的站点不判定没有航班。','','## 材料与复跑','','- [65项CSV](airline-matrix.csv)、[机器结果](results.json)、[网页文本](evidence/)、[截图](screenshots/)。','- 测试脚本位于仓库`scripts/probe-all-airlines.js`、`probe-airline-query.js`、`probe-airline-promo.js`，为本次低频QA探测，不是生产采集工具。','- PowerShell包装脚本可通过参数传入工作目录与Playwright CLI路径，复跑前需检查本机安装位置，并将目标清单放到工作目录`output/playwright/all-airlines-20261030/`；测试条件/日期也必须更新，不能拿旧日期直接复跑。','- 不公开Cookie、存储状态、HAR或会话跟踪参数；海南结果URL已去除跟踪和会话查询参数。','','## 官方来源','','- [民航局目录第1页](https://www.caac.gov.cn/GYMH/MHGK/HKGS/)、[第2页](https://www.caac.gov.cn/GYMH/MHGK/HKGS/index_1.html)、[第3页](https://www.caac.gov.cn/GYMH/MHGK/HKGS/index_2.html)、[第4页](https://www.caac.gov.cn/GYMH/MHGK/HKGS/index_3.html)。','- [国航网站服务协议](https://webresource.airchina.com.cn/zh-CN/content/website/account-protocal/)。','- [重庆航空官网](https://www.chongqingairlines.cn/)；集团与独立承运人的边界以本报告实际验证为限。','']
(dst/'README.md').write_text('\n'.join(lines),encoding='utf-8')
print(json.dumps({k:v for k,v in summary.items() if k!='results'},ensure_ascii=False));print('Report:',dst,'screenshots:',len(list((dst/'screenshots').glob('*.png'))))

# Preserve LF in public text evidence; reports/** is intentionally marked -text.
for artifact in dst.rglob("*"):
 if artifact.suffix in [".json", ".md", ".csv"]:
  artifact.write_bytes(artifact.read_bytes().replace(b"\r\n", b"\n"))
manifest=[]
for artifact in sorted(dst.rglob("*")):
 if artifact.is_file() and artifact.name!="SHA256SUMS":
  manifest.append(hashlib.sha256(artifact.read_bytes()).hexdigest()+"  "+artifact.relative_to(dst).as_posix())
(dst/"SHA256SUMS").write_bytes(("\n".join(manifest)+"\n").encode())
