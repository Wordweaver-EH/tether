import importlib.util,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('selector',Path(__file__).with_name('select_union.py'));s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s)
BASE=Path(__file__).resolve().parents[2]
EX=BASE/'tether-github-update/evaluation-batches/REMOTE-VERIFIED-EXCLUSION-128.json'
EH='0c6ace790469b9cac38b516013045c1a3f1c3d526c92b40ef280ca04d42f1ae9'
class TestSelector(unittest.TestCase):
 def runbuild(self,out):return s.build(BASE,EX,EH,0,64,out)
 def test_plan_partition(self):
  ids=[str(i) for i in range(4224)];ex=ids[3:131];remaining,selected=s.choose(ids,ex,0,64)
  self.assertEqual(len(remaining),4096);self.assertFalse(set(selected)&set(ex));self.assertEqual([i for off in range(0,4096,64) for i in s.choose(ids,ex,off,64)[1]],remaining)
 def test_reject_bad_selection(self):
  for ids,ex,o,n in [(['x']*65,[],0,64),([str(i) for i in range(100)],['x'],0,64),([str(i) for i in range(100)],['1','1'],0,64),([str(i) for i in range(100)],[],1,64),([str(i) for i in range(100)],[],64,64),([str(i) for i in range(100)],[],0,65)]:
   with self.assertRaises(ValueError):s.choose(ids,ex,o,n)
 def test_real_batch_reproducibility_and_bytes(self):
  with tempfile.TemporaryDirectory() as d:
   a=Path(d)/'a';b=Path(d)/'b';self.runbuild(a);self.runbuild(b);self.assertEqual((a/'LOCAL-MEMBERS.json').read_bytes(),(b/'LOCAL-MEMBERS.json').read_bytes());m=json.loads((a/'LOCAL-MEMBERS.json').read_text());self.assertEqual(len(m['taskIds']),64)
   members={f['member']:f for f in m['files']};self.assertEqual(len(members),len(m['files']))
   for f in m['files']:self.assertEqual(s.H(s.read(f['source'])),f['sha256'])
   for t in m['taskBindings']:
    for k in ['raw','result','inputMemory','outputMemory']:
     if t[k]:self.assertIn(t[k],members)
   p=json.loads((a/'SEPARATE-PARTIALS-MEMBERS.json').read_text());self.assertEqual(len(p['files']),7);self.assertFalse(p['scientificSampleIncluded']);self.assertTrue(all('excluded-original-partials' not in f['member'] for f in m['files']))
 def test_mixed_and_final_resumed_batches(self):
  with tempfile.TemporaryDirectory() as d:
   origins=[]
   for offset in [640,4032]:
    out=Path(d)/str(offset);s.build(BASE,EX,EH,offset,64,out);m=json.loads((out/'LOCAL-MEMBERS.json').read_text());self.assertEqual(m['taskCount'],64);origins += [t['origin'] for t in m['taskBindings']]
   self.assertIn('resume',origins);self.assertIn('original',origins)
 def test_reject_corrupt_pins(self):
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaisesRegex(ValueError,'hash mismatch'):s.build(BASE,EX,'0'*64,0,64,Path(d)/'a')
   with patch.object(s,'REVIEW','0'*64):
    with self.assertRaisesRegex(ValueError,'hash mismatch'):self.runbuild(Path(d)/'b')
 def test_reject_result_byte_drift(self):
  original=s.read
  def changed(p,expected=None):
   if '/results/' in str(p):raise ValueError('hash mismatch injected result')
   return original(p,expected)
  with tempfile.TemporaryDirectory() as d,patch.object(s,'read',changed):
   with self.assertRaisesRegex(ValueError,'injected result'):self.runbuild(Path(d)/'a')
 def test_reject_union_origin_tamper(self):
  original=s.obj
  def changed(p,h=None):
   r=original(p,h)
   if str(p).endswith('/UNION.json'):r['entries'][0]['origin']='resume'
   return r
  with tempfile.TemporaryDirectory() as d,patch.object(s,'obj',changed):
   with self.assertRaisesRegex(ValueError,'origin counts'):self.runbuild(Path(d)/'a')
if __name__=='__main__':unittest.main()
