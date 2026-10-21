"""Bounded read-only HTTP load probe of the owner's public Site, never marketplaces.
Run: python3 scripts/hosting-load-check.py /absolute/evidence/hosting.json
Stops at denied access, rate limits, server errors, or degraded latency.
"""
import concurrent.futures, datetime, json, pathlib, statistics, sys, threading, time, subprocess, tempfile
BASE='https://3gifts.it'
PATHS=['/','/app.js','/catalog.js','/styles.css']
output=pathlib.Path(sys.argv[1]);assert output.is_absolute()
stop=threading.Event();pace=threading.Lock();next_request=0.0

def request(path):
 global next_request
 with pace:
  now=time.monotonic();delay=max(0,next_request-now)
  if delay:time.sleep(delay)
  next_request=time.monotonic()+0.2 # hard ceiling: five starts/second
 if stop.is_set():return None
 started=time.monotonic()
 try:
  with tempfile.TemporaryDirectory(prefix='3gifts-http-') as directory:
   header_file=pathlib.Path(directory)/'headers';body_file=pathlib.Path(directory)/'body'
   proc=subprocess.run(['curl','-sS','-L','--max-time','10','--max-filesize','1048576','-A','3Gifts-Owner-Audit/1.0','-D',str(header_file),'-o',str(body_file),'-w','%{http_code}\\n%{url_effective}\\n',BASE+path],capture_output=True,text=True,timeout=12)
   metadata=proc.stdout.splitlines();status=int(metadata[0]) if metadata and metadata[0].isdigit() and metadata[0]!='000' else None
   final=metadata[1] if len(metadata)>1 else None;body=body_file.read_bytes() if body_file.exists() else b''
   headers={}
   for line in header_file.read_text().splitlines() if header_file.exists() else []:
    if ':' in line:
     key,value=line.split(':',1)
     if key.lower() in ['server','cf-cache-status','cf-ray','retry-after','content-type','x-cache','x-denied-reason']:headers[key]=value.strip()
   error=proc.stderr.strip() if proc.returncode else None
 except Exception as e:status=None;body=b'';final=None;headers={};error=str(e)
 elapsed=time.monotonic()-started
 if error or status is None or status>=400 or elapsed>5:stop.set()
 return {'path':path,'status':status,'seconds':round(elapsed,4),'bytes':len(body),'finalUrl':final,'headers':headers,'error':error,'validHome':b'giftForm' in body if path=='/' and status==200 else None}

def summary(rows):
 times=sorted(r['seconds'] for r in rows)
 return {'requests':len(rows),'errors':sum(bool(r['error']) or r['status'] is None or r['status']>=400 for r in rows),'medianSeconds':statistics.median(times) if times else None,'p95Seconds':times[max(0,__import__('math').ceil(len(times)*.95)-1)] if times else None}

started=datetime.datetime.now(datetime.timezone.utc).isoformat();baseline=request('/');stages=[]
if baseline['status']==200 and baseline['validHome'] and not stop.is_set():
 for concurrency in [1,2,4]:
  begin=time.monotonic()
  with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as pool:
   rows=[r for r in pool.map(request,[PATHS[i%len(PATHS)] for i in range(20)]) if r]
  duration=time.monotonic()-begin
  stages.append({'concurrency':concurrency,'durationSeconds':round(duration,3),'observedRequestsPerSecond':round(len(rows)/duration,3),**summary(rows),'samples':rows})
  if stop.is_set():break
result={'startedAt':started,'finishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'target':BASE,'limits':{'maxRequests':61,'maxConcurrency':4,'maxRequestStartsPerSecond':5,'timeoutSeconds':10,'stopLatencySeconds':5},'baseline':baseline,'stages':stages,'status':'BLOCKED' if not stages else 'STOPPED' if stop.is_set() else 'PASS','scope':'Small public HTTP burst only; no browser sessions, no capacity certification, may measure edge cache rather than origin CPU.'}
output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
