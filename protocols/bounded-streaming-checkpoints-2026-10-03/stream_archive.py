"""Stream a preverified member manifest into bounded transport parts, never a whole archive."""
import gzip,hashlib,json,tarfile,os,sys
from pathlib import Path,PurePosixPath
class Parts:
 def __init__(self,dst,name,limit):
  self.dst=Path(dst);self.name=name;self.limit=limit;self.buf=bytearray();self.total=0;self.hash=hashlib.sha256();self.parts=[]
 def write(self,data):
  self.hash.update(data);self.total+=len(data);view=memoryview(data)
  while view:
   n=min(self.limit-len(self.buf),len(view));self.buf.extend(view[:n]);view=view[n:]
   if len(self.buf)==self.limit:self.flush_part()
  return len(data)
 def flush(self):pass
 def flush_part(self):
  if not self.buf:return
  n=f'{self.name}.part{len(self.parts)+1:04d}';p=self.dst/n;b=bytes(self.buf)
  with p.open('xb') as f:f.write(b);f.flush();os.fsync(f.fileno())
  self.parts.append({'filename':n,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest(),'gitBlobSha':hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()});self.buf.clear()
 def finish(self):
  self.flush_part();return {'filename':self.name,'bytes':self.total,'sha256':self.hash.hexdigest(),'parts':self.parts}
def filehash(p):
 h=hashlib.sha256()
 with open(p,'rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
 return h.hexdigest()
def build(manifest,dst,limit=8000000):
 assert 1<=limit<=8000000
 assert Path(manifest['archiveName']).name==manifest['archiveName'] and manifest['archiveName'] not in ['.','..']
 dst=Path(dst);dst.mkdir(parents=True,exist_ok=False);seen=set();rows=[]
 for f in manifest['files']:
  n=PurePosixPath(f['member']);assert not n.is_absolute() and '..' not in n.parts and str(n) not in seen;seen.add(str(n));p=Path(f['source']);assert p.is_file() and not p.is_symlink();assert p.stat().st_size==f['bytes'] and filehash(p)==f['sha256'];rows.append((str(n),p,f))
 sink=Parts(dst,manifest['archiveName'],limit)
 with gzip.GzipFile(filename='',fileobj=sink,mode='wb',mtime=0,compresslevel=1) as gz:
  with tarfile.open(fileobj=gz,mode='w|') as t:
   for n,p,f in sorted(rows):
    before=p.stat();i=tarfile.TarInfo(n);i.size=f['bytes'];i.mode=0o644;i.mtime=0
    with p.open('rb') as h:t.addfile(i,h)
    after=p.stat();assert (before.st_size,before.st_mtime_ns,before.st_ino)==(after.st_size,after.st_mtime_ns,after.st_ino) and filehash(p)==f['sha256'],'source changed'
 transport={'format':1,'archives':[sink.finish()]};public={k:v for k,v in manifest.items() if k!='files'};public['files']=[{k:v for k,v in f.items() if k!='source'} for _,_,f in sorted(rows)]
 (dst/'transport.json').write_text(json.dumps(transport,indent=2)+'\n');(dst/'BATCH-MANIFEST.json').write_text(json.dumps(public,indent=2)+'\n');return transport
if __name__=='__main__':
 m=json.loads(Path(sys.argv[1]).read_text());print(json.dumps(build(m,sys.argv[2])))
