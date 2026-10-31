"""Run on the existing ECS; stage, verify, activate frontend only, with rollback."""
import hashlib, json, os, pwd, shutil, socket, subprocess, time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import tarfile

os.umask(0o077)
root = Path('/opt/shihou')
name = '20261031-memory-a11y-r2'
release, backup = root / 'releases' / name, root / 'backups' / name
archive = Path('/var/tmp/xingzhi-memory-a11y-r2.tar.gz')
assert not release.exists() and not backup.exists(), 'Release already exists'
assert hashlib.sha256(archive.read_bytes()).hexdigest() == Path(str(archive)+'.sha256').read_text().strip(), 'Archive checksum mismatch'

def run(args, **kwargs):
    return subprocess.run(args, check=True, **kwargs)

def ready(port, timeout=45):
    end = time.monotonic()+timeout
    while time.monotonic() < end:
        try:
            with urlopen(f'http://127.0.0.1:{port}/login', timeout=3) as r:
                if r.status == 200:
                    return
        except Exception:
            pass
        time.sleep(1)
    raise RuntimeError('Frontend health check failed')

def verify(port):
    from http.cookies import SimpleCookie
    cookies, csrf, results = {}, {}, []
    def call(target_port, path, body=None, method=None):
        headers={**csrf,'Cookie':'; '.join(k+'='+v for k,v in cookies.items())}
        data=None if body is None else json.dumps(body,ensure_ascii=False).encode()
        if data is not None: headers['Content-Type']='application/json'
        req=Request(f'http://127.0.0.1:{target_port}'+path,data=data,headers=headers,method=method)
        with urlopen(req,timeout=60) as response:
            for value in response.headers.get_all('Set-Cookie') or []:
                parsed=SimpleCookie();parsed.load(value)
                cookies.update({key:item.value for key,item in parsed.items()})
            raw=response.read()
            return json.loads(raw) if raw else {}
    for path,text in [('/welcome','心里有个远方'),('/transport','两种出发方式')]:
        with urlopen(f'http://127.0.0.1:{port}'+path,timeout=15) as response:
            assert response.status==200 and text in response.read().decode()
        results.append(dict(case='page-'+path,passed=True))
    token=call(8080,'/api/v1/auth/csrf');csrf={token['headerName']:token['token']}
    assert call(8080,'/api/v1/auth/guest',{})['role']=='GUEST'
    token=call(8080,'/api/v1/auth/csrf');csrf={token['headerName']:token['token']}
    created=call(8080,'/api/v1/conversation-sessions',dict(messages=[],intake=dict(known={})))
    session_id=created['id']
    def ask(message): return call(port,'/conversation-planner',dict(conversationId=session_id,message=message))
    try:
        ask('请记住：本次测试旅行代号是青竹4726。')
        ask('请记住：本次同行人的名字是林舟。')
        for number in range(20):ask(f'记住旅行备忘{number+1}是携带第{number+1}号用品')
        answer=ask('本次测试旅行代号是什么？同行人叫什么？')['reply']
        assert '青竹4726' in answer and '林舟' in answer, 'Compound memory recall failed'
        results.append(dict(case='compound-memory-after-22-turns',passed=True,reply=answer))
        ask('把本次测试旅行代号改成白鹭9361，其他不变。')
        answer=ask('当前旅行代号是什么？同行人叫什么？')['reply']
        assert '白鹭9361' in answer and '林舟' in answer and '其他不变' not in answer and '青竹4726' not in answer
        results.append(dict(case='clean-memory-update',passed=True,reply=answer))
        saved=call(8080,'/api/v1/conversation-sessions/'+session_id)
        assert next(f['value'] for f in saved['conversationContext']['facts'] if f['key']=='旅行代号')=='白鹭9361'
        results.append(dict(case='stored-value-is-clean',passed=True))
        answer=ask('旅行备忘1是什么？旅行备忘11是什么？')['reply']
        assert '第1号用品' in answer and '第11号用品' in answer
        results.append(dict(case='numbered-facts-remain-distinct',passed=True))
        ask('请忘记本次测试旅行代号。')
        answer=ask('同行人叫什么？旅行代号是什么？')['reply']
        assert '林舟' in answer and '没有找到' in answer and '青竹4726' not in answer and '白鹭9361' not in answer
        results.append(dict(case='compound-recall-after-forget',passed=True,reply=answer))
    finally:
        call(8080,'/api/v1/conversation-sessions/'+session_id,method='DELETE')
    date=(datetime.now(timezone(timedelta(hours=8)))+timedelta(days=1)).date().isoformat()
    started=time.monotonic()
    tickets=call(port,'/agent-tools',dict(name='search_domestic_flights',arguments=dict(origin='西安',destination='榆林',date=date,airlineCodes=['9H','MF','GS'])))['result']
    assert tickets['quotes'],'No verified live aircraft fares; refusing activation'
    assert all(q['price']>0 and q['departure'] and q['arrival'] for q in tickets['quotes'])
    results.append(dict(case='live-flight-query',passed=True,quotes=len(tickets['quotes']),ms=round((time.monotonic()-started)*1000),providers=tickets['providers']))
    rail=call(port,'/agent-tools',dict(name='search_domestic_trains',arguments=dict(origin='西安',destination='榆林',date=date)))['result']
    assert rail['options'] and all(q['price']>0 and q['departure'] and q['arrival'] for q in rail['options'])
    results.append(dict(case='live-train-query',passed=True,quotes=len(rail['options'])))
    return results

run(['systemctl','is-active','shihou-frontend','shihou-backend','nginx'])
pid = subprocess.check_output(['systemctl','show','shihou-frontend','-p','MainPID','--value'],text=True).strip()
assert pid.isdigit() and int(pid)>1
env = dict(item.split('=',1) for item in Path('/proc/'+pid+'/environ').read_bytes().decode().split('\0') if '=' in item)
browser_candidates=list(Path('/opt/shihou/browser-cache').glob('chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell'))
assert browser_candidates, 'Chromium is missing'
browser_path=str(sorted(browser_candidates)[-1])
env={**env,'AIRLINE_BROWSER_ENABLED':'1','AIRLINE_BROWSER_EXECUTABLE':browser_path}
release.mkdir(parents=True,mode=0o755,exist_ok=True)
with tarfile.open(archive) as package:
    package.extractall(release,filter='data')
manifest = json.loads((release/'release.json').read_text())
new = release/'frontend/.next/standalone'
old = root/'frontend/.next/standalone'
previous_build_id=(old/'.next/BUILD_ID').read_text().strip()
assert (new/'.next/BUILD_ID').read_text().strip() == manifest['frontendBuildId']
for package in ['next','sharp']:
    assert json.loads((new/'node_modules'/package/'package.json').read_text())['version'] == json.loads((old/'node_modules'/package/'package.json').read_text())['version'], 'Runtime dependency changed'
for package in ['sharp','@img/colour','detect-libc','semver']:
    previous,target=(old/'node_modules'/package).resolve(),(new/'node_modules'/package).resolve()
    assert previous.is_relative_to(old) and target.is_relative_to(new)
    assert json.loads((previous/'package.json').read_text())['version'] == json.loads((target/'package.json').read_text())['version']
    shutil.copytree(previous,target,dirs_exist_ok=True,symlinks=False)
for package in ['@img/sharp-linux-x64','@img/sharp-libvips-linux-x64']:
    previous=old/'node_modules'/package
    assert previous.exists(), 'Missing verified Linux image dependency'
    shutil.copytree(previous,new/'node_modules'/package,dirs_exist_ok=True,symlinks=False)
for item in (old/'.next/static').rglob('*'):
    target=new/'.next/static'/item.relative_to(old/'.next/static')
    if item.is_file() and not target.exists():
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(item,target)
run(['chown','-R','shihou:shihou',str(release)])
identity=pwd.getpwnam('shihou')
run(['/usr/bin/node','-e',"require('sharp'); console.log('Linux runtime OK')"],cwd=new,env=env,user=identity.pw_uid,group=identity.pw_gid)
with socket.socket() as port_check:
    port_check.bind(('127.0.0.1',3001))
with (release/'canary.log').open('wb') as log:
    canary=subprocess.Popen(['/usr/bin/node','server.js'],cwd=new,env={**env,'PORT':'3001','HOSTNAME':'127.0.0.1'},user=identity.pw_uid,group=identity.pw_gid,stdout=log,stderr=subprocess.STDOUT)
    try:
        ready(3001)
        assert canary.poll() is None, 'Canary process failed'
        results=verify(3001)
        (release/'canary-results.json').write_text(json.dumps(results,indent=2))
        print('Canary checks passed: '+str(len(results)),flush=True)
    finally:
        canary.terminate()
        try:
            canary.wait(timeout=10)
        except subprocess.TimeoutExpired:
            canary.kill();canary.wait()
assert (old/'.next/BUILD_ID').read_text().strip() == previous_build_id, 'Another release was activated during verification'
backup.mkdir(mode=0o700)
env_file=Path('/etc/shihou/frontend.env')
shutil.copy2(env_file,backup/'frontend.env')
new_env=env_file.read_text()

old_manifest=root/'current-release.json'
if old_manifest.exists():
    shutil.copy2(old_manifest,backup/'previous-release.json')
previous_meta=json.loads(old_manifest.read_text()) if old_manifest.exists() else {}
moved=False
try:
    run(['systemctl','stop','shihou-frontend'])
    env_file.write_text(new_env);env_file.chmod(0o600)
    (root/'frontend').rename(backup/'frontend');moved=True
    (release/'frontend').rename(root/'frontend')
    run(['systemctl','start','shihou-frontend'])
    ready(3000)
    production_results=verify(3000)
    run(['systemctl','is-active','shihou-frontend','shihou-backend','nginx'])
    current={**previous_meta,**manifest,'previousFrontendBuildId':previous_meta.get('frontendBuildId'),'backup':str(backup)}
    (root/'current-release.json.tmp').write_text(json.dumps(current,indent=2))
    (root/'current-release.json.tmp').replace(old_manifest)
    (release/'production-results.json').write_text(json.dumps(production_results,indent=2))
    print(json.dumps({'status':'deployed',**current,'checksPassed':len(production_results)}),flush=True)
except Exception:
    print('Activation failed; restoring previous frontend',flush=True)
    run(['systemctl','stop','shihou-frontend'])
    shutil.copy2(backup/'frontend.env',env_file)
    if moved:
        if (root/'frontend').exists():
            (root/'frontend').rename(release/'failed-frontend')
        (backup/'frontend').rename(root/'frontend')
    if (backup/'previous-release.json').exists():
        shutil.copy2(backup/'previous-release.json',old_manifest)
    run(['systemctl','start','shihou-frontend']);ready(3000)
    raise
