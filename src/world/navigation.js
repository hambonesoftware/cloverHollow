/**
 * A small, renderer-independent pedestrian graph. Streets and porch paths are
 * sampled at 1 world unit. Intersections become shared vertices automatically.
 * A* only follows edges validated against building/well/pond collision.
 * This intentionally avoids direct straight-line NPC routes through cottages.
 */
const key=(x,z)=>`${x},${z}`;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);

export function clearSegment(a,b,walkable,spacing=.35) {
  const steps=Math.max(1,Math.ceil(distance(a,b)/spacing));
  for(let i=0;i<=steps;i++){
    const k=i/steps;
    if(!walkable(a.x+(b.x-a.x)*k,a.z+(b.z-a.z)*k))return false;
  }
  return true;
}

/** Create a reusable network once, rather than pathfinding against the scene. */
export function createPedestrianGraph(segments,walkable){
  const nodes=new Map();
  function add(x,z){
    const id=key(x,z);
    if(!nodes.has(id)&&walkable(x,z))nodes.set(id,{id,x,z,edges:new Set()});
    return nodes.get(id);
  }
  for(const [x0,z0,x1,z1] of segments){
    if(x0!==x1&&z0!==z1)throw new Error('Pedestrian paths must be axis aligned');
    if(![x0,z0,x1,z1].every(Number.isInteger))throw new Error('Pedestrian paths require integer coordinates');
    const count=Math.max(Math.abs(x1-x0),Math.abs(z1-z0));
    const sx=Math.sign(x1-x0),sz=Math.sign(z1-z0);
    let previous=null;
    for(let i=0;i<=count;i++){
      const current=add(x0+i*sx,z0+i*sz);
      if(previous&&current&&clearSegment(previous,current,walkable)){
        previous.edges.add(current.id);current.edges.add(previous.id);
      }
      previous=current;
    }
  }
  return {nodes,walkable};
}

function nearestVisible(graph,point){
  let best=null,bestSq=Infinity;
  for(const node of graph.nodes.values()){
    const ds=(point.x-node.x)**2+(point.z-node.z)**2;
    if(ds>=bestSq||ds>144)continue;
    if(clearSegment(point,node,graph.walkable)){
      best=node;bestSq=ds;
      if(ds<1e-8)break;
    }
  }
  return best;
}

// A small binary heap keeps route queries inexpensive even on older phones.
class MinHeap {
  constructor(){this.items=[];}
  push(id,score){
    const a=this.items;let i=a.length;a.push({id,score});
    while(i>0){const p=(i-1)>>1;if(a[p].score<=score)break;a[i]=a[p];i=p;}
    a[i]={id,score};
  }
  pop(){
    const a=this.items,root=a[0],last=a.pop();
    if(a.length){
      let i=0;
      while(2*i+1<a.length){
        let c=2*i+1;
        if(c+1<a.length&&a[c+1].score<a[c].score)c++;
        if(a[c].score>=last.score)break;
        a[i]=a[c];i=c;
      }
      a[i]=last;
    }
    return root;
  }
  get size(){return this.items.length;}
}
function simplify(points){
  if(points.length<3)return points;
  const result=[points[0]];
  for(let i=1;i<points.length-1;i++){
    const a=result[result.length-1],b=points[i],c=points[i+1];
    const abx=b.x-a.x,abz=b.z-a.z,bcx=c.x-b.x,bcz=c.z-b.z;
    if(Math.abs(abx*bcz-abz*bcx)<.001&&abx*bcx+abz*bcz>=0)continue;
    result.push(b);
  }
  result.push(points[points.length-1]);
  return result;
}

/**
 * Returns [{x,z},...] including the requested origin and destination.
 * Returns null if either is blocked/unreachable. Routes stay on pedestrian
 * edges except for short, line-of-sight connections to the nearest edge.
 */
export function findPedestrianRoute(graph,from,to){
  const start={x:from[0],z:from[1]},end={x:to[0],z:to[1]};
  if(!graph.walkable(start.x,start.z)||!graph.walkable(end.x,end.z))return null;
  const src=nearestVisible(graph,start),dest=nearestVisible(graph,end);
  if(!src||!dest)return null;
  const best=new Map([[src.id,0]]),previous=new Map(),open=new MinHeap();
  open.push(src.id,distance(src,dest));
  let reached=false;
  while(open.size){
    const next=open.pop(),node=graph.nodes.get(next.id);
    if(next.score>best.get(node.id)+distance(node,dest)+1e-7)continue;
    if(node.id===dest.id){reached=true;break;}
    for(const id of node.edges){
      const neighbor=graph.nodes.get(id);
      const tentative=best.get(node.id)+distance(node,neighbor);
      if(tentative<(best.get(id)??Infinity)){
        best.set(id,tentative);previous.set(id,node.id);
        open.push(id,tentative+distance(neighbor,dest));
      }
    }
  }
  if(!reached)return null;
  const route=[];
  let cursor=dest.id;
  while(cursor!==undefined){
    const node=graph.nodes.get(cursor);route.push({x:node.x,z:node.z});
    cursor=previous.get(cursor);
  }
  route.reverse();
  if(distance(start,route[0])>.01)route.unshift(start);
  if(distance(end,route[route.length-1])>.01)route.push(end);
  return simplify(route);
}

/** Verify every edge of a returned route, including doorway connections. */
export function isRouteClear(route,walkable){
  return Array.isArray(route)&&route.length>0&&route.every((p,i)=>
    i===0?walkable(p.x,p.z):clearSegment(route[i-1],p,walkable));
}
