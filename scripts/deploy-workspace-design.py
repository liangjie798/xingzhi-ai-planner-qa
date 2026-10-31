"""Run on the existing ECS; stage, verify, activate frontend only, with rollback."""
import hashlib, json, os, pwd, shutil, socket, subprocess, time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError
import tarfile

os.umask(0o077)
root = Path('/opt/shihou')
name = '20261031-workspace-design'
release, backup = root / 'releases' / name, root / 'backups' / name
archive = Path('/var/tmp/xingzhi-workspace-design.tar.gz')
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
    date = (datetime.now(timezone(timedelta(hours=8)))+timedelta(days=1)).date().isoformat()
    known = dict(cityName='杭州市', activityType='校园运动会', date=date, duration=2, participants=40, group='儿童青少年', intensity='中强度', startHour=14, allowedStartHour=14, allowedEndHour=16)
    hour = dict(date=date, hour=14, temperature=20, humidity=50, aqi=40, heatRisk=5, rainProbability=0)
    cases = [('/conversation-planner',dict(message='活动时长改成九小时', intake=dict(known=known), activeTopic='planning'),200),
             ('/conversation-planner',dict(message='继续画气温对比图',chartContext=dict(dates=['not-a-date'],metrics=['temperature'],cityName='杭州市')),400),
             ('/conversation-planner',dict(message='继续画气温对比图',chartContext=dict(dates=[date],metrics=['temperature'],cityName=dict(bad=True))),400),
             ('/conversation-planner',dict(message='谢谢',history={}),400)]
    for patch in [dict(rainProbability=101),dict(humidity=-1),dict(aqi=-20),dict(heatRisk=101)]:
        cases.append(('/tourism-planner',dict(cityName='杭州市',date=date,hours=[{**hour,**patch}]),400))
    results=[]
    for path,text in [('/welcome','心里有个远方'),('/privacy','隐私与数据说明'),('/terms','使用说明')]:
        with urlopen(f'http://127.0.0.1:{port}'+path,timeout=15) as r:
            html=r.read().decode('utf-8')
            assert r.status==200 and text in html,'UI page failed: '+path
        results.append(dict(case='page-'+path,status=200,passed=True))
    with urlopen(f'http://127.0.0.1:{port}/XingZhi',timeout=15) as r:
        html=r.read().decode('utf-8')
        assert r.status==200
    import re
    style_paths=set(re.findall(r'href="([^" ]+\.css(?:\?[^" ]*)?)"',html))
    styles=''
    for path in style_paths:
        if path.startswith('/_next/static/'):
            with urlopen(f'http://127.0.0.1:{port}'+path,timeout=10) as r:styles+=r.read().decode('utf-8')
    assert 'starters' in styles and 'emptyArt' in styles,'Workspace module styles missing'
    results.append(dict(case='workspace-css',status=200,passed=True))
    for index,(path,body,expected) in enumerate(cases,1):
        req=Request(f'http://127.0.0.1:{port}'+path,data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})
        try:
            with urlopen(req,timeout=15) as r:
                status, data = r.status, json.load(r)
        except HTTPError as e:
            status, data = e.code, json.load(e)
        assert status == expected, f'Case {index}: expected {expected}, got {status}'
        if index == 1:
            assert data['command'] != 'analyze' and data['intake']['known']['duration'] == 2 and '9小时' in data['reply']
        results.append(dict(case=index,status=status,passed=True))
    with urlopen(f'http://127.0.0.1:{port}/agent-tools',timeout=10) as response: coverage=json.load(response)
    assert set(coverage['coverage']['registeredAdapters'])=={'MF','MU','SC','KN','RY'}
    quotes=0
    for code,origin,destination in [('MF','厦门','北京'),('MU','上海','北京'),('SC','济南','广州'),('KN','北京','温州'),('RY','南昌','厦门')]:
        req=Request(f'http://127.0.0.1:{port}/agent-tools',data=json.dumps(dict(name='search_domestic_flights',arguments=dict(origin=origin,destination=destination,date=date,airlineCodes=[code]))).encode(),headers={'Content-Type':'application/json'})
        with urlopen(req,timeout=60) as response: ticket=json.load(response)['result']
        count=len(ticket['quotes']);quotes+=count
        print(json.dumps(dict(check='airline-'+code,status=ticket['status'],quotes=count)),flush=True)
        results.append(dict(case='airline-'+code,status=ticket['status'],options=count,providers=ticket['providers']))
    assert quotes>0,'No verified live airline quote on this server; activation refused'
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
