import unittest,tempfile,hashlib,json,tarfile,io,os
from pathlib import Path
from stream_archive import build
class Tests(unittest.TestCase):
 def test_bounded_exact_and_no_whole_archive(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'raw';b=os.urandom(220000);p.write_bytes(b);m={'archiveName':'batch.tar.gz','files':[{'source':str(p),'member':'raw/x','bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}]};out=Path(d)/'out';r=build(m,out,64000)['archives'][0];self.assertGreater(len(r['parts']),1);self.assertFalse((out/r['filename']).exists());data=b''.join((out/x['filename']).read_bytes() for x in r['parts']);self.assertEqual(hashlib.sha256(data).hexdigest(),r['sha256']);self.assertTrue(all(x['bytes']<=64000 for x in r['parts']));self.assertEqual(tarfile.open(fileobj=io.BytesIO(data)).extractfile('raw/x').read(),b);self.assertEqual(p.read_bytes(),b);self.assertNotIn('source',(out/'BATCH-MANIFEST.json').read_text())
 def test_bad_hash_and_path_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'raw';p.write_bytes(b'x');m={'archiveName':'a.gz','files':[{'source':str(p),'member':'../bad','bytes':1,'sha256':hashlib.sha256(b'x').hexdigest()}]}
   with self.assertRaises(AssertionError):build(m,Path(d)/'out')
 def test_existing_output_rejected(self):
  with tempfile.TemporaryDirectory() as d:
   with self.assertRaises(FileExistsError):build({'archiveName':'a.gz','files':[]},d)
if __name__=='__main__':unittest.main()
