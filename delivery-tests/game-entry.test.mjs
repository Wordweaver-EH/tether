import test from 'node:test';
import assert from 'node:assert/strict';
import {makeServer} from '../serve.mjs';
async function withServer(run) {
 const server=makeServer();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {await run(`http://127.0.0.1:${server.address().port}`);}
 finally {await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}
test('root redirects to client directory and relative entry assets resolve',async()=>{
 await withServer(async base=>{
  const redirect=await fetch(base+'/?mode=test',{redirect:'manual'});
  assert.equal(redirect.status,302);assert.equal(redirect.headers.get('location'),'/client/?mode=test');
  const page=await fetch(base+'/');assert.equal(page.status,200);assert.equal(new URL(page.url).pathname,'/client/');
  const html=await page.text();assert.match(html,/src="app\.mjs"/);assert.match(html,/href="style\.css"/);
  for(const [path,mime] of [['./app.mjs','text/javascript'],['./style.css','text/css'],['./json-equal.mjs','text/javascript']]) {
   const asset=await fetch(new URL(path,page.url));assert.equal(asset.status,200,path);assert.ok(asset.headers.get('content-type').startsWith(mime));
  }
 });
});
test('root redirect supports HEAD and preserves static-server restrictions',async()=>{
 await withServer(async base=>{
  const head=await fetch(base+'/',{method:'HEAD',redirect:'manual'});assert.equal(head.status,302);assert.equal(await head.text(),'');
  assert.equal((await fetch(base+'/',{method:'POST'})).status,405);
  for(const path of ['/app.mjs','/style.css','/json-equal.mjs','/.git/config','/tools/smoke.mjs','/reports/README.md'])assert.equal((await fetch(base+path)).status,403,path);
 });
});
