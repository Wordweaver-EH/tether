// Percept-only contact geometry. No simulation imports or hidden-world access.
const EPS=1e-9;
export function segmentCircleTime(start,end,centre,radius=.4) {
 const dx=end.x-start.x,dy=end.y-start.y,ox=start.x-centre.x,oy=start.y-centre.y;
 const a=dx*dx+dy*dy,b=2*(ox*dx+oy*dy),c=ox*ox+oy*oy-radius*radius;
 if(c<=0)return 0;
 if(a===0)return null;
 const discriminant=b*b-4*a*c;
 const tolerance=16*Number.EPSILON*Math.max(1,b*b,4*a*Math.abs(c));
 if(discriminant < -tolerance)return null;
 const t=(-b-Math.sqrt(Math.max(0,discriminant)))/(2*a);
 return t>=-EPS&&t<=1+EPS?Math.max(0,Math.min(1,t)):null;
}
export function segmentStaticTime(start,end,arena) {
 const d={x:end.x-start.x,y:end.y-start.y},b=arena.bounds;
 if(start.x<=b.minX||start.x>=b.maxX||start.y<=b.minY||start.y>=b.maxY)return 0;
 let best=null;
 const offer=t=>{if(t>=-EPS&&t<=1+EPS&&(best===null||t<best))best=Math.max(0,Math.min(1,t));};
 if(d.x<0)offer((b.minX-start.x)/d.x);if(d.x>0)offer((b.maxX-start.x)/d.x);
 if(d.y<0)offer((b.minY-start.y)/d.y);if(d.y>0)offer((b.maxY-start.y)/d.y);
 for(const box of arena.obstacles) {
   if(start.x>=box.minX&&start.x<=box.maxX&&start.y>=box.minY&&start.y<=box.maxY)return 0;
   let entry=-Infinity,exit=Infinity;
   for(const axis of ['x','y']) {
     const lo=box[axis==='x'?'minX':'minY'],hi=box[axis==='x'?'maxX':'maxY'];
     if(d[axis]===0){if(start[axis]<lo||start[axis]>hi){exit=-Infinity;break;}}
     else {const a=(lo-start[axis])/d[axis],z=(hi-start[axis])/d[axis];entry=Math.max(entry,Math.min(a,z));exit=Math.min(exit,Math.max(a,z));}
   }
   if(entry<=exit+EPS&&entry>=-EPS)offer(entry);
 }
 return best;
}
