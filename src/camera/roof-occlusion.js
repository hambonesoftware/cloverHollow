import * as THREE from 'three';

/**
 * Selective, material-safe camera occlusion handling.
 *
 * Only roof and roof-following shell meshes belonging to real buildings may
 * disappear while directly between the camera and the player's upper body.
 * The mesh list is gathered once, rather than raycasting the entire town,
 * and original visibility is restored before every query. Shared material
 * caches are never mutated (important for repeated procedural cottages).
 */
export function createRoofOcclusion(buildingRoots=[]){
  const candidates=[];
  const originals=new Map();
  const match=/continuous curved roof|colored curved shingles|crooked moonspire|cottage shell|undulating roof|fairy roof/i;
  for(const root of buildingRoots){
    root?.traverse?.(object=>{
      if(!object.isMesh||!match.test(object.name??''))return;
      candidates.push(object);
      originals.set(object,object.visible);
    });
  }
  // Raycast the main shell only; instanced roof shingles can contain
  // hundreds of tiles per house, yet are hidden together with their shell.
  const rayMeshes=candidates.filter(m=>!/shingles/i.test(m.name));
  const raycaster=new THREE.Raycaster(),from=new THREE.Vector3(),
    to=new THREE.Vector3(),direction=new THREE.Vector3();
  function restore(){
    for(const mesh of candidates)mesh.visible=originals.get(mesh);
  }
  function update(camera,player){
    restore();
    if(!camera?.position||!player?.position||!candidates.length)return 0;
    from.copy(camera.position);
    to.copy(player.position);
    to.y+=1.18;
    direction.copy(to).sub(from);
    const distance=direction.length();
    if(distance<2.2)return 0;
    raycaster.set(from,direction.normalize());
    raycaster.far=Math.max(0,distance-.5);
    const hits=raycaster.intersectObjects(rayMeshes,false);
    if(!hits.length)return 0;
    // Hide every overlapping roof piece from the same blocking building.
    // Otherwise one shingle mesh can still cover the whole player.
    const blockedParents=new Set();
    for(const hit of hits){
      if(hit.distance>distance-.55)continue;
      blockedParents.add(hit.object.parent);
      if(blockedParents.size>=3)break;
    }
    let count=0;
    for(const mesh of candidates){
      if(!originals.get(mesh))continue;
      if(!blockedParents.has(mesh.parent))continue;
      mesh.visible=false;count++;
    }
    return count;
  }
  return {update,restore,get candidateCount(){return candidates.length;}};
}
