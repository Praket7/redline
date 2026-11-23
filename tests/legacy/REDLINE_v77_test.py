from pathlib import Path
from bs4 import BeautifulSoup
from subprocess import run
from tempfile import TemporaryDirectory
import json,re,zipfile, math
root=Path('/mnt/data')
p=root/'REDLINE_v77_FORWARD_ONLY_BOT_FIRE.html'
s=p.read_text(encoding='utf-8')
assert 'REDLINE_RIVAL_FIRE_ARC.canEngage(b,st.p)' in s
assert 'REDLINE_RIVAL_FIRE_ARC.canEngage(b,other.mesh.position)' in s
assert 'diag.cancelledLocks++' in s
assert 'REDLINE_RIVAL_FIRE_ARC.canFire(b.mesh.rotation.y,from,end)' in s
assert 'REDLINE_RIVAL_FIRE_ARC.canFire(b.mesh.rotation.y,from,current)' in s
assert 'new THREE.Vector3(0,1.2,-4)' in s and 'b.mesh.localToWorld(new THREE.Vector3(0,1.2,-4))' in s

start=s.index('const REDLINE_RIVAL_FIRE_ARC=(()=>{')
end=s.index('window.REDLINE_RIVAL_FIRE_ARC=REDLINE_RIVAL_FIRE_ARC;',start)+len('window.REDLINE_RIVAL_FIRE_ARC=REDLINE_RIVAL_FIRE_ARC;')
helper=s[start:end]

test='''
const assert=require('node:assert/strict');
global.window={};
'''+helper+'''
const a=window.REDLINE_RIVAL_FIRE_ARC;
const pt=(x,z)=>({x,z});
const bot=(yaw,x=0,z=0)=>({mesh:{rotation:{y:yaw},position:pt(x,z)}});
assert.equal(a.HALF_ANGLE_DEG,55);
for(const yaw of [0, Math.PI/2, Math.PI, -Math.PI/2, Math.PI*2+.3]){
 const f=pt(-Math.sin(yaw)*100,-Math.cos(yaw)*100),
  r=pt(Math.sin(yaw)*100,Math.cos(yaw)*100);
 assert(a.canFire(yaw,pt(0,0),f),'front must be targetable');
 assert(!a.canFire(yaw,pt(0,0),r),'rear must NOT be targetable');
 assert(!a.canFire(yaw,pt(0,0),pt(-Math.cos(yaw)*100,Math.sin(yaw)*100)),'side blocked');
}
// Check both sides of the 55-degree half-cone boundary.
for(const offset of [-54.5,54.5]){
 let rad=offset*Math.PI/180;
 assert(a.canFire(0,pt(0,0),pt(-Math.sin(rad)*200,-Math.cos(rad)*200)));
}
for(const offset of [-57,57]){
 let rad=offset*Math.PI/180;
 assert(!a.canFire(0,pt(0,0),pt(-Math.sin(rad)*200,-Math.cos(rad)*200)));
}
assert(!a.canFire(0,pt(0,0),pt(0,0)));
// Turning moves the allowed arc with the craft (not with camera/player).
assert(a.canEngage(bot(Math.PI/2),pt(-100,0)));
assert(!a.canEngage(bot(Math.PI/2),pt(100,0)));
// Accuracy: shot variation is moderate and ordered by bot skill.
for(let i=0;i<3;i++)for(let t=0;t<20;t+=.17){
 const v=a.spread(i,t);
 assert(Number.isFinite(v.lateral)&&Number.isFinite(v.vertical));
 assert(Math.abs(v.lateral)<=[15.5,15.2,14.7][i]+1e-9);
}
const rates=[0,1,2].map(i=>{
 let m=0;for(let n=0;n<24000;n++){
  const z=a.spread(i,n*.00073), d=Math.hypot(z.lateral,z.vertical);
  if(d>a.HIT_RADIUS)m++;
 }
 return m/24000;
});
assert(rates[0] > rates[1] && rates[1] > rates[2]);
assert(rates[0] < .35 && rates[0] > .15);
assert(rates[1] < .3 && rates[1] > .1);
assert(rates[2] < .2 && rates[2] > .05);
console.log(JSON.stringify({forwardArcDegrees:a.HALF_ANGLE_DEG*2, cleanRearShots:true, spreadMissRate:rates}));
'''

with TemporaryDirectory() as d:
 d=Path(d)
 f=d/'fire_arc_test.cjs';f.write_text(test)
 result=run(['node',str(f)],capture_output=True,text=True)
 if result.returncode:raise AssertionError(result.stdout+'\n'+result.stderr)
 print('Fire arc unit tests:',result.stdout.strip())
 # Syntax-check each authored inline JS block without attempting to parse embedded textures.
 soup=BeautifulSoup(s,'html.parser')
 scripts=[]
 for tag in soup.find_all('script'):
  if tag.has_attr('src'):continue
  typ=(tag.get('type') or 'text/javascript').lower().strip()
  if typ not in ('text/javascript','module','application/javascript',''):continue
  code=tag.string or tag.get_text()
  if not code.strip():continue
  scripts.append((typ,code))
 for i,(typ,code) in enumerate(scripts):
  q=d/f'script_{i}.{"mjs" if typ=="module" else "cjs"}'
  q.write_text(code)
  r=run(['node','--check',str(q)],capture_output=True,text=True)
  if r.returncode:raise AssertionError('Script '+str(i)+' failed:\n'+r.stderr[:2000])
 print('Syntax-checked',len(scripts),'inline JS blocks')

print('Structural acquisition/cancellation/shot-safety tests passed')
