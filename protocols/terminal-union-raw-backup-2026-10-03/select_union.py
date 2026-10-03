"""Read-only archive selector. No controller imports, scientific aggregation or Git operations.
CLI: python select_union.py BASE EXCLUSION_JSON EXCLUSION_SHA OFFSET COUNT OUT
OFFSET indexes the fixed frozen plan after exclusion, not progress or supervisor order.
"""
import hashlib,json,sys
from pathlib import Path
H=lambda b:hashlib.sha256(b).hexdigest()
REVIEW='2b1fb34cf146a81038bf54da8889b4883b301e7256af77737977cefcbbbf411c'
LOCK='fbf3a3d825e71fea60dec040c67899bf3ff2da78b1ff334a5cbe38f5b1771033'
def require(x,m):
 if not x:raise ValueError(m)
def read(p,expected=None):
 p=Path(p);require(p.is_file() and not p.is_symlink(),'unsafe/missing source '+str(p));b=p.read_bytes()
 if expected is not None:require(H(b)==expected,'hash mismatch '+str(p))
 return b
def obj(p,h=None):return json.loads(read(p,h))
def choose(ids,excluded,offset,count):
 require(len(ids)==len(set(ids)),'duplicate task IDs');require(len(excluded)==len(set(excluded)),'duplicate exclusions');require(set(excluded)<=set(ids),'unknown exclusion')
 require(type(offset)==int and offset>=0 and offset%64==0,'unaligned offset');require(type(count)==int and count==64,'batch must be 64')
 remaining=[i for i in ids if i not in set(excluded)];selected=remaining[offset:offset+count];require(len(selected)==count,'incomplete batch');return remaining,selected
def build(base,exclusion,exclusion_hash,offset,count,out):
 base=Path(base).resolve();out=Path(out).resolve();O=base/'tether-robustness-shifts/evaluation-attempt-001';R=base/'tether-evaluation-recovery/resume-attempt-001';D=base/'tether-union-independent-audit'
 require(not out.exists(),'output exists');require(not out.is_relative_to(O) and not out.is_relative_to(R),'output inside source')
 review=obj(D/'FULL-UNION-INDEPENDENT-REVIEW.json',REVIEW);require(review['approved'] is True and review['acceptedUnion']==4224,'review not approved')
 union=obj(R/'UNION.json',review['unionSha256']);complete=obj(R/'COMPLETE.json',review['completeSha256']);require(complete['completed']==complete['total']==4224 and complete['error'] is None,'terminal incomplete')
 read(base/'tether-evaluation-recovery/TERMINAL-EXIT-AUDIT-001.json',review['terminalExitAudit']['sha256']);read(R/'SUPERVISOR.jsonl',review['supervisorLogSha256']);read(base/'tether-evaluation-recovery/RECOVERY-RELEASE-001.json',review['recoveryReleaseSha256'])
 lock=obj(O/'LOCK.json',LOCK);require(union['lockSha256']==review['lockSha256']==LOCK,'lock binding');require(union['original']==str(O) and union['resume']==str(R),'origin roots')
 for f in lock['inputs']:read(f['path'],f['sha256'])
 planpath=Path(lock['prereg'])/'EVALUATION-TASKS.json';require(any(f['path']==str(planpath) for f in lock['inputs']),'plan not closed');plan=obj(planpath);tasks={t['id']:t for t in plan};entries={e['taskId']:e for e in union['entries']}
 require(len(entries)==len(union['entries'])==len(plan)==4224 and set(tasks)==set(entries),'union/plan identity')
 require(sum(e['origin']=='original' for e in entries.values())==805 and sum(e['origin']=='resume' for e in entries.values())==3419,'origin counts')
 audited={}
 for s in review['shards']:
  shard=obj(D/s['path'],s['sha256']);require(not shard['errors'],'shard errors')
  for a in shard['accepted']:require(a['taskId'] not in audited,'duplicate audit');audited[a['taskId']]=a
 require(set(audited)==set(entries),'audited task set')
 ex=obj(exclusion,exclusion_hash);require(ex['status']=='VERIFIED_REMOTE_TREE_AND_MANIFESTS','unverified exclusions');excluded=[i for b in ex['batches'] for i in b['taskIds']];require(len(excluded)==128,'expected remote128');require(all(entries[i]['origin']=='original' for i in excluded),'remote origin')
 remaining,selected=choose([t['id'] for t in plan],excluded,offset,count);files={};bindings=[]
 def member(source,name,expected=None):
  require(not Path(name).is_absolute() and '..' not in Path(name).parts,'unsafe member');source=Path(source);require(source.resolve()==source.absolute(),'source symlink/path alias');b=read(source,expected);f={'source':str(source),'member':name,'bytes':len(b),'sha256':H(b)}
  if name in files:require(files[name]==f,'member collision')
  else:files[name]=f
  return name
 def scientific(e,kind):
  root=O if e['origin']=='original' else R;directory,ext,key={'result':('results','.json','resultFileSha256'),'raw':('raw','.jsonl.gz','rawFileSha256'),'memory':('memory','.json','memoryFileSha256')}[kind];rel=directory+'/'+e['taskId']+ext;require(e[kind+'Path']==str(root/rel),'entry path mismatch');a=audited[e['taskId']];require(a['origin']==e['origin'] and a[key]==e[key],'audited byte binding');return member(root/rel,e['origin']+'/'+rel,e[key])
 for id in selected:
  t=tasks[id];e=entries[id];a=audited[id];r=obj(e['resultPath'],e['resultFileSha256']);require(r['taskId']==id and r['raw']['fileSha256']==e['rawFileSha256'] and ('chainTail' not in e or r['raw']['chainTail']==e['chainTail']),'result/raw binding');require(r['outputMemorySha256']==a['outputMemorySha256'] and ('outputMemorySha256' not in e or e['outputMemorySha256']==a['outputMemorySha256']),'output memory object binding')
  binding={'taskId':id,'origin':e['origin'],'result':scientific(e,'result'),'raw':scientific(e,'raw'),'outputMemory':None,'inputMemory':None,'inputMemoryObjectSha256':a['inputMemorySha256'],'outputMemoryObjectSha256':a['outputMemorySha256']}
  if e.get('memoryPath'):
   binding['outputMemory']=scientific(e,'memory')
   if t['bout']==0:
    p=Path(lock['freeze'])/t['initialMemory'];require(any(x['path']==str(p) and x['sha256']==t['snapshotSha256'] for x in lock['inputs']),'snapshot outside lock');binding['inputMemory']=member(p,'closure/'+str(p.relative_to(base)),t['snapshotSha256'])
   else:
    prev=id.rsplit('-b',1)[0]+'-b'+str(t['bout']-1);pe=entries[prev];require(audited[prev]['outputMemorySha256']==a['inputMemorySha256'],'cross-origin memory lineage');binding['inputMemory']=scientific(pe,'memory')
  else:require(a['inputMemorySha256'] is None and a['outputMemorySha256'] is None,'conventional memory')
  bindings.append(binding)
 # Include every locked source/config/snapshot, with explicit original-relative restoration map.
 for f in lock['inputs']:
  p=Path(f['path']);member(p,'closure/'+str(p.relative_to(base)),f['sha256'])
 for source,name,h in [(O/'LOCK.json','evidence/LOCK.json',LOCK),(D/'FULL-UNION-INDEPENDENT-REVIEW.json','evidence/FULL-UNION-INDEPENDENT-REVIEW.json',REVIEW),(R/'UNION.json','evidence/UNION.json',review['unionSha256']),(R/'COMPLETE.json','evidence/COMPLETE.json',review['completeSha256']),(base/'tether-evaluation-recovery/TERMINAL-EXIT-AUDIT-001.json','evidence/TERMINAL-EXIT-AUDIT.json',review['terminalExitAudit']['sha256']),(Path(exclusion).resolve(),'evidence/REMOTE-EXCLUSIONS.json',exclusion_hash)]:member(source,name,h)
 for s in review['shards']:member(D/s['path'],'evidence/'+s['path'],s['sha256'])
 member(base/'tether-evaluation-recovery/RECOVERY-RELEASE-001.json','evidence/RECOVERY-RELEASE-001.json',review['recoveryReleaseSha256'])
 original_inventory=obj(base/'tether-robustness-recovery/ORIGINAL-FILE-MANIFEST.json',review['originalManifestSha256'])
 original_release_hash=next(f['sha256'] for f in original_inventory if f['path']=='RELEASE.json')
 member(O/'RELEASE.json','evidence/ORIGINAL-RELEASE.json',original_release_hash)
 member(R/'RELEASE.json','evidence/RESUME-RELEASE.json',review['recoveryReleaseSha256'])
 manifest={'format':1,'status':'IMMUTABLE_TERMINAL_UNION_TASK_BATCH','archiveName':f'evaluation-union-{offset+1}-{offset+count}.tar.gz','phase':'evaluation','lockSha256':LOCK,'fullUnionReviewSha256':REVIEW,'unionSha256':review['unionSha256'],'remoteExclusionReceiptSha256':exclusion_hash,'fixedOrder':'frozen EVALUATION-TASKS.json order, excluding remote128 IDs','remainingTaskIdsSha256':H(json.dumps(remaining,separators=(',',':')).encode()),'remainingRange':[offset+1,offset+count],'taskIds':selected,'taskCount':count,'wholePhaseCpuClaim':False,'evaluationSuccessClaim':False,'validation':'Every included byte hashed; selected raw/result/memory hashes bind the independently approved full proof audit. No proof replay, controllers, or metrics executed.','memoryReassembly':'Input and output memory member paths are explicit per task; dependencies are repeated across batches as needed, deduplicated by member path within a batch. closure/ restores original workspace-relative locked inputs. Original/resume scientific files retain distinct namespaces.','taskBindings':bindings,'qualifications':review['qualifications'],'files':list(files.values())}
 out.mkdir(parents=True);(out/'LOCAL-MEMBERS.json').write_text(json.dumps(manifest,indent=2)+'\n')
 # A separate non-primary inventory, never mixed into completed task batches.
 partial=[]
 for p in review['excludedOriginalPartials']:
  src=O/'raw'/(p['taskId']+'.jsonl.gz');b=read(src,p['sha256']);require(len(b)==p['bytes'],'partial size');partial.append({'source':str(src),'member':'excluded-original-partials/raw/'+src.name,'bytes':len(b),'sha256':p['sha256']})
 (out/'SEPARATE-PARTIALS-MEMBERS.json').write_text(json.dumps({'format':1,'status':'EXCLUDED_INTERRUPTED_ORIGINAL_PARTIALS','archiveName':'excluded-original-partials.tar.gz','scientificSampleIncluded':False,'taskCount':0,'files':partial},indent=2)+'\n')
 (out/'REMAINING-TASK-IDS.json').write_text(json.dumps(remaining,indent=2)+'\n');return {'manifest':str(out/'LOCAL-MEMBERS.json'),'tasks':count,'members':len(files),'bytes':sum(f['bytes'] for f in files.values()),'remaining':len(remaining)}
if __name__=='__main__':
 base,ex,eh,offset,count,out=sys.argv[1:];print(json.dumps(build(base,ex,eh,int(offset),int(count),out)))
