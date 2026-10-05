const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const html = fs.readFileSync('index.html','utf8').replace(/\r\n/g,'\n');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const noop = () => {};
const context = new Proxy({}, {get: (o,k) => o[k] ?? (k === 'createLinearGradient' ? () => ({addColorStop:noop}) : noop),set:(o,k,v)=>(o[k]=v,true)});
function element() {return {style:{},classList:{add:noop,remove:noop,toggle:noop},getContext:()=>context,addEventListener:noop,append:noop,appendChild:noop,replaceChildren:noop};}
const elements = new Map();
const store = {};
const sandbox = {console,Math,performance:{now:()=>0},innerWidth:1280,innerHeight:720,setTimeout:noop,clearTimeout:noop,requestAnimationFrame:noop,localStorage:{getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v);}},document:{createElement:element,getElementById:id=>{if(!elements.has(id)) elements.set(id,element());return elements.get(id);}},window:{devicePixelRatio:1,addEventListener:noop}};
vm.createContext(sandbox);
vm.runInContext(source.replace('  requestAnimationFrame(frame);\n})();',`  globalThis.game = {startRace, update, render, togglePause, stepRival, makeRival, atDistance, leaderboard, completeLap, finishRace, frame, get qualifying(){return qualifying}, rivalSpecs, get trackLength(){return trackLength}, car, keys, get state(){return state}, get rivals(){return rivals}, get raceTime(){return raceTime}, get lapTimes(){return lapTimes}, setLapTime(t){lapTime=t}, setDifficulty, get qualifyingByMode(){return qualifyingByMode}, get difficulty(){return difficulty}, get qualifyingNow(){return qualifying}, get lapTime(){return lapTime}, get skidCount(){return skids.length}, get ghost(){return ghost}, get checkpointCount(){return nextCp}, setCheckpointCount(n){nextCp=n}, get track(){return track}, get tang(){return tang}, get N(){return N}, physics, setMap, MAPS, nearest, get map(){return map}, get TRACK_W(){return TRACK_W}, get trees(){return trees}, get bushes(){return bushes}, get best(){return best}};\n})();`),sandbox);
const g=sandbox.game;
assert.equal(g.qualifying.length,3);
assert.ok(g.qualifying[0]>g.qualifying[1] && g.qualifying[1]>g.qualifying[2]);
assert.ok(Math.hypot(g.atDistance(0).x-g.atDistance(g.trackLength).x,g.atDistance(0).y-g.atDistance(g.trackLength).y)<1e-6);
g.startRace();
for(let i=0;i<361;i++)g.update(1/120);
assert.equal(g.state,'racing');
assert.ok(g.rivals.every(r=>r.distance>0));
const x=g.car.x,y=g.car.y;
g.keys.up=true;
for(let i=0;i<120;i++)g.update(1/120);
assert.ok(Math.hypot(g.car.x-x,g.car.y-y)>50);
g.keys.up=false;
g.togglePause(); const time=g.raceTime, d=g.rivals[0].distance;
g.frame(1000); assert.equal(g.raceTime,time); assert.equal(g.rivals[0].distance,d);
g.togglePause(); assert.equal(g.state,'racing');
for(let i=0;i<120*180;i++)g.update(1/120);
for(let j=0;j<3;j++){const r=g.rivals[j];assert.equal(r.laps.length,3);assert.ok(Math.abs(Math.min(...r.laps)-g.qualifying[j])<1e-7);assert.ok(r.laps.every(t=>t>10 && t<100));}
for(const t of [40,38,39]){g.setLapTime(t);g.completeLap();}
assert.equal(g.state,'finished');assert.equal(g.lapTimes.length,3);assert.ok(g.ghost);
g.render(1/60);
g.startRace();assert.equal(g.lapTimes.length,0);assert.equal(g.raceTime,0);assert.ok(g.rivals.every(r=>r.laps.length===0 && r.distance===0));
g.render(1/60);
// Finish only on a forward, on-track wrap after all three checkpoints.
for(let i=0;i<361;i++)g.update(1/120);
g.setCheckpointCount(3);g.car.idx=g.N-1;g.car.x=g.track[0].x;g.car.y=g.track[0].y;g.car.vx=g.tang[0].x*100;g.car.vy=g.tang[0].y*100;
g.update(1/120);assert.equal(g.lapTimes.length,1);
g.startRace();for(let i=0;i<361;i++)g.update(1/120);
g.car.idx=g.N-1;g.car.x=g.track[0].x;g.car.y=g.track[0].y;g.car.vx=g.tang[0].x*100;g.car.vy=g.tang[0].y*100;
g.update(1/120);assert.equal(g.lapTimes.length,0);
// Running wide onto the verge (88px from centre; road half-width is 70) must still count the lap.
const nx=-g.tang[0].y, ny=g.tang[0].x;
g.startRace();for(let i=0;i<361;i++)g.update(1/120);
g.setCheckpointCount(3);g.car.idx=g.N-1;g.car.x=g.track[0].x+nx*88;g.car.y=g.track[0].y+ny*88;g.car.vx=g.tang[0].x*100;g.car.vy=g.tang[0].y*100;
g.update(1/120);assert.equal(g.car.onTrack,false);assert.equal(g.lapTimes.length,1);
// Missing a checkpoint discards the lap and restarts the lap timer instead of letting it run on.
g.startRace();for(let i=0;i<361;i++)g.update(1/120);
g.setLapTime(12);g.setCheckpointCount(1);g.car.idx=g.N-1;g.car.x=g.track[0].x;g.car.y=g.track[0].y;g.car.vx=g.tang[0].x*100;g.car.vy=g.tang[0].y*100;
g.update(1/120);assert.equal(g.lapTimes.length,0);assert.ok(g.lapTime<0.1);assert.equal(g.checkpointCount,0);
// Handbrake slides lay skid marks that restart clears.
g.car.vx=g.tang[0].x*400;g.car.vy=g.tang[0].y*400;for(let i=0;i<30;i++)g.physics(1/120,{hb:true,right:true});
assert.ok(g.skidCount>0);g.startRace();assert.equal(g.skidCount,0);
const angle=g.car.a;for(let i=0;i<60;i++)g.physics(1/120,{up:true,right:true});assert.ok(Math.abs(g.car.a-angle)>0.1);
// AI modes: each mode is strictly faster than the last, rivals keep their order, and God beats a clean ~19.1s lap.
const modes=['easy','medium','hard','god'], fastest=m=>Math.min(...g.qualifyingByMode[m]);
for(let k=1;k<modes.length;k++) assert.ok(fastest(modes[k])<fastest(modes[k-1]), modes[k]);
for(const m of modes){const q=g.qualifyingByMode[m];assert.ok(q[0]>q[1]&&q[1]>q[2],m);}
assert.ok(fastest('god')<19.1 && fastest('god')>16);
assert.ok(Math.abs(fastest('hard')-20.63)<0.05);
// Mode is locked mid-race, and switching on the menu resets rivals to the new pace.
g.startRace();for(let i=0;i<361;i++)g.update(1/120);
const before=g.difficulty;g.setDifficulty(before==='god'?'easy':'god');assert.equal(g.difficulty,before);
for(const t of [40,38,39]){g.setLapTime(t);g.completeLap();}
assert.equal(g.state,'finished');g.setDifficulty('god');assert.equal(g.difficulty,'god');
assert.equal(g.qualifyingNow,g.qualifyingByMode.god);assert.ok(g.rivals.every(r=>r.mult===1.18&&r.laps.length===0));
g.startRace();for(let i=0;i<120*80;i++)g.update(1/120);
for(let j=0;j<3;j++)assert.ok(Math.abs(Math.min(...g.rivals[j].laps)-g.qualifyingByMode.god[j])<1e-7);
assert.ok(g.rivals.every(r=>r.laps.length===3));
for(const [width,height] of [[390,844],[844,390],[1920,1080]]){sandbox.innerWidth=width;sandbox.innerHeight=height;g.render(1/60);}
// ---------- Maps ----------
// A simple driver bot that goes through the real game loop: K scales how hard it corners (vt = K * radius).
function arcTable(){const T=g.track,N=g.N,s=[0];for(let i=0;i<N;i++){const p=T[i],q=T[(i+1)%N];s.push(s[i]+Math.hypot(q.x-p.x,q.y-p.y));}return s;}
function radii(s){const R=[];for(let i=0;i<g.N;i++){const a=g.tang[i],b=g.tang[(i+4)%g.N];const ang=Math.acos(Math.max(-1,Math.min(1,a.x*b.x+a.y*b.y)));R.push(ang>1e-6?(s[Math.min(i+4,g.N)]-s[i])/ang:1e9);}return R;}
function botRace(K,LA,DEC){
  const T=g.track,N=g.N,R=radii(arcTable());
  g.startRace();for(let i=0;i<361;i++)g.update(1/120);
  for(let steps=0;g.state==='racing'&&steps<120*200;steps++){
    const c=g.car,i=c.idx,v=Math.hypot(c.vx,c.vy);
    let j=i,d=0;const look=70+v*LA;while(d<look){const k=(j+1)%N;d+=Math.hypot(T[k].x-T[j].x,T[k].y-T[j].y);j=k;}
    const want=Math.atan2(T[j].y-c.y,T[j].x-c.x),e=Math.atan2(Math.sin(want-c.a),Math.cos(want-c.a));
    let brake=false;j=i;d=0;
    while(d<700){const k=(j+1)%N;d+=Math.hypot(T[k].x-T[j].x,T[k].y-T[j].y);j=k;const vt=Math.min(640,K*R[j]);if(v*v>vt*vt+2*DEC*d){brake=true;break;}}
    g.keys.left=e<-0.04;g.keys.right=e>0.04;g.keys.up=!brake;g.keys.down=brake&&v>150;
    g.update(1/120);
  }
  for(const k in g.keys)g.keys[k]=false;
  return g.lapTimes.slice();
}
const mapReport=[];
const allModes=['easy','medium','hard','god','legend'];
g.setDifficulty('hard');
for(const m of g.MAPS){
  g.setMap(m.id);assert.equal(g.map.id,m.id);assert.equal(g.TRACK_W,m.width);
  const T=g.track,N=g.N,s=arcTable(),L=s[N],half=g.TRACK_W/2;
  // Stretches of road that aren't neighbours along the lap never come within two road widths of each other,
  // so nearest() can't snap you onto the wrong part of the lap.
  let minGap=Infinity;
  for(let i=0;i<N;i+=2)for(let j=i+2;j<N;j+=2){let arc=Math.abs(s[j]-s[i]);arc=Math.min(arc,L-arc);if(arc>=600)minGap=Math.min(minGap,Math.hypot(T[i].x-T[j].x,T[i].y-T[j].y));}
  assert.ok(minGap>2*g.TRACK_W,`${m.id} road passes itself at ${minGap.toFixed(0)}px`);
  // New maps: no corner tighter than the road half-width, otherwise the inside edge folds over itself.
  // (Naivasha's original hairpin is 66 vs 70 and is left as it was.)
  if(m.id!=='naivasha') assert.ok(Math.min(...radii(s))>half,`${m.id} has a folded corner`);
  assert.ok(T.every(p=>p.x>60&&p.x<2940&&p.y>60&&p.y<2140),`${m.id} leaves the world`);
  assert.ok(g.trees.length>=m.trees&&g.bushes.length===m.bushes,`${m.id} scenery count`);
  assert.equal(g.trees.filter(t=>t.kind==='rock').length,m.rocks);
  assert.ok(g.trees.every(t=>g.nearest(t.x,t.y).d-t.hit>half),`${m.id} obstacle on the road`);
  // AI: every mode finishes, each mode is faster than the one below it, and rivals keep their order.
  const q=g.qualifyingByMode,fast=k=>Math.min(...q[k]);
  for(let k=1;k<allModes.length;k++)assert.ok(fast(allModes[k])<fast(allModes[k-1]),`${m.id} ${allModes[k]}`);
  for(const mode of allModes)assert.ok(q[mode][0]>q[mode][1]&&q[mode][1]>q[mode][2],`${m.id} ${mode} order`);
  assert.ok(fast('legend')<fast('god')*0.96,`${m.id} Legend is not clearly harder than God`);
  // A careful bot finishes a full 3-lap race with every lap counted (map is drivable and lap logic works on it).
  const careful=botRace(2.2,0.22,700);
  assert.equal(g.state,'finished',`${m.id} careful bot did not finish`);assert.equal(careful.length,3);
  // An expert bot beats Legend's target, so Legend is hard but possible on every map.
  let expert=Infinity;
  for(const K of [3.1,3.5]){const laps=botRace(K,0.3,900);if(g.state==='finished')expert=Math.min(expert,...laps);}
  assert.ok(Number.isFinite(expert),`${m.id} expert bot did not finish`);
  assert.ok(expert<fast('legend'),`${m.id} Legend (${fast('legend').toFixed(2)}) beats the expert bot (${expert.toFixed(2)})`);
  for(const [width,height] of [[390,844],[844,390],[1280,720]]){sandbox.innerWidth=width;sandbox.innerHeight=height;g.render(1/60);}
  mapReport.push(`${m.name.padEnd(18)} ${fast('hard').toFixed(2)} / ${fast('god').toFixed(2)} / ${fast('legend').toFixed(2)}   bot ${expert.toFixed(2)}`);
}
// Legend live laps match its qualifying targets.
g.setMap('meru');g.setDifficulty('legend');g.startRace();for(let i=0;i<120*80;i++)g.update(1/120);
for(let j=0;j<3;j++)assert.ok(Math.abs(Math.min(...g.rivals[j].laps)-g.qualifyingByMode.legend[j])<1e-7);
assert.ok(g.rivals.every(r=>r.mult===1.30&&r.laps.length===3));
// Map is locked mid-race.
g.startRace();for(let i=0;i<361;i++)g.update(1/120);
g.setMap('amboseli');assert.equal(g.map.id,'meru');
for(const t of [40,38,39]){g.setLapTime(t);g.completeLap();}
// Records are per map: Meru's laps above must not leak into Naivasha's, and the map choice persists.
const meruLap=JSON.parse(store['safariRally.v1.meru']).lap;assert.ok(meruLap<25);// the bot's Meru laps, not the 38s one
g.setMap('naivasha');assert.equal(store['safariRally.map'],'naivasha');
assert.equal(g.best.lap,JSON.parse(store['safariRally.v1']).lap);assert.notEqual(g.best.lap,meruLap);
g.setMap('hellsgate');assert.equal(g.best.lap,JSON.parse(store['safariRally.v1.hellsgate']).lap);assert.notEqual(g.best.lap,meruLap);assert.equal(store['safariRally.map'],'hellsgate');
// Naivasha is the original circuit: same Hard time as before maps existed.
g.setMap('naivasha');g.setDifficulty('hard');assert.ok(Math.abs(Math.min(...g.qualifyingByMode.hard)-20.63)<0.05);
console.log('PASS: qualifying pace order, wrapped track sampling, countdown, acceleration, pause/resume, all AI laps, qualifying/live agreement, player finish, off-verge finish, missed-checkpoint reset, skid marks, AI modes (order, God < 19.1s, mid-race lock, live/qualifying agreement), ghost capture, render, restart.');
console.log('PASS maps: geometry (no overlap, no folded corners), scenery off the road, AI in all 5 modes per map, Legend < God, Legend beatable by an expert bot, bot 3-lap race per map, map lock, per-map records, map persistence, Naivasha unchanged, render per map.');
console.log('Per-map fastest AI (Hard / God / Legend) and expert-bot best lap:');
for(const r of mapReport) console.log('  '+r);
console.log('Qualifying seconds:',g.qualifying.map(t=>t.toFixed(3)).join(', '));

