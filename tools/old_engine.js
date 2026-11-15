const fmt=n=>(Math.round(n*10)/10).toString();
const PARTS=[
 {key:'instrument',label:'Scientific instrument',std:{n:'Standard Weather Imager',kg:1100,m:160,fx:'Reliable images, 80% detail'},adv:{n:'Advanced Hyperspectral Imager',kg:1250,m:215,fx:'+15% science value per image'}},
 {key:'observation',label:'Observation system',std:{n:'Routine Observation',kg:750,m:110,fx:'Pointing every 10 min'},adv:{n:'Rapid-Scan Observation',kg:820,m:140,fx:'+0.3 pts each phase'}},
 {key:'power',label:'Power system',std:{n:'Standard Power',kg:1500,m:190,fx:'Solar + 1 battery bank'},adv:{n:'High-capacity Power',kg:1700,m:240,fx:'Battery drains 50% slower'}},
 {key:'comms',label:'Communication system',std:{n:'Standard Comms',kg:900,m:150,fx:'1 GB per 6 h downlink'},adv:{n:'High-gain Comms',kg:1000,m:190,fx:'2× downlink speed'}},
 {key:'storage',label:'Data storage',std:{n:'Small Storage (8 GB)',kg:660,m:115,fx:'8 GB on board'},adv:{n:'Large Storage (32 GB)',kg:720,m:150,fx:'32 GB on board'}},
];
const MAX_KG=5192, MAX_M=850;

const CH=[
 {title:'The storm is developing',sub:'Forecasters need a first look at the storm’s structure.',
  alert:'A hurricane is strengthening over the Atlantic. Forecasters need images that show the storm’s shape and its eye.',
  decide:'how sharp your images are and how much of the storm you scan.',
  groups:[{lab:'Instrument mode',opts:[['std','Standard resolution','Smaller files, less power'],['high','High resolution','Sharper, bigger files']]},
          {lab:'Observation mode',opts:[['wide','Wide scan','Covers 90% of the storm area'],['focus','Focused scan','Covers 45%, more detail']]}],
  lesson:'Sharper, more frequent images mean more data to store and send.'},
 {title:'Storage is filling up',sub:'Keep useful images without running out of space.',
  alert:'Images are piling up on board. More are coming, and storage is limited.',
  decide:'image quality and what to do when storage is full.',
  groups:[{lab:'Instrument mode',opts:[['std','Standard resolution','Saves space'],['high','High resolution','Best detail, more space']]},
          {lab:'Storage plan',opts:[['keep','Keep all images','New images are refused when full'],['prio','Prioritize key images','Drop low-value images to make room']]}],
  lesson:'Storage is a buffer, not a bin: what can’t be sent or stored is lost.'},
 {title:'Power anomaly!',sub:'Solar generation is down to 50%.',
  alert:'A fault cuts your solar power in half for six hours. The battery must cover the gap.',
  decide:'how hard to run the satellite while power is low.',
  groups:[{lab:'Power mode',opts:[['normal','Normal operations','Full activity, more drain'],['save','Power saving','25% less extra power, 1 picture/hour max']]},
          {lab:'Observation mode',opts:[['freq','Frequent','As many pictures as hardware allows'],['occ','Occasional','One picture every 2 hours']]}],
  lesson:'Solar panels and batteries work as a team; when sunlight drops, stored energy decides what you can do.'},
 {title:'Urgent hurricane update',sub:'Deliver a fresh image before the deadline.',
  alert:'The storm is nearing the coast. Forecasters need a fresh image delivered before hour 24.',
  decide:'how fast to send data and how much power to spend.',
  groups:[{lab:'Downlink speed',opts:[['std','Standard','Half speed, less power'],['fast','High-speed','Full speed, more power']]},
          {lab:'Power mode',opts:[['full','Full power','Full sending rate'],['eco','Eco mode','30% less power, 30% slower']]}],
  lesson:'Data only helps people once it reaches the ground, on time.'},
];


const S={design:{},unlocked:false};
function resetOps(){
  S.ops={ci:0,phase:'alert',choice:CH.map(c=>c.groups.map(g=>g.opts[0][0])),
    cov:0,pts:0,batt:100,stored:0,health:100,hour:0,critical:'Not yet required',minBatt:100,overflow:false,
    delta:{},log:[]};
}

function scoreCard(){const o=S.ops;
  const sci=Math.round(35*Math.min(1,o.pts/16));const tim=o.critical==='Delivered'?35:10;
  let res=20;if(o.minBatt<20)res-=8;if(o.overflow)res-=6;const rel=Math.round(10*o.health/100);
  const req=[['Delivered science ≥ 12 pts',o.pts>=12,fmt(o.pts)+' / 12'],['Coverage ≥ 3 storm phases',o.cov>=3,o.cov+' / 4'],['Critical update on time',o.critical==='Delivered',o.critical],['Essential systems running',o.health>=80,o.health+'% health']];
  return{sci,tim,res,rel,total:sci+tim+res+rel,req,success:req.every(r=>r[1])};}
function simulate(){
  const o=S.ops,ci=o.ci,c=o.choice[ci],D=S.design;
  const instMul=D.instrument==='adv'?1.15:1, obsAdd=D.observation==='adv'?.3:0, drainMul=D.power==='adv'?.5:1;
  const down=D.comms==='adv'?2:1, cap=D.storage==='adv'?32:8;
  const g=CH[ci].groups, chName=c.map((v,i)=>g[i].opts.find(x=>x[0]===v)[1]).join(' + ');
  let pts=0,data=0,batt=0,health=0,cov=1,good='',trade='',met=true,badge='Objective met';
  const before={batt:o.batt,st:o.stored/cap*100,health:o.health};
  if(ci===0){
    const T={'std,wide':[4.1,1.0],'std,focus':[4.8,1.0],'high,wide':[5.0,2.6],'high,focus':[5.6,2.4]}[c.join()];
    pts=T[0];data=T[1];if(c[0]==='high')batt=-10;
    good=c[1]==='wide'?`Wide scanning covered 90% of the storm area. You took 6 images worth ${fmt(pts*instMul+obsAdd)} science points.`:`Focused scanning captured the eye in fine detail. You took 6 images worth ${fmt(pts*instMul+obsAdd)} science points.`;
    trade=c[0]==='std'?`Standard resolution lost some detail (quality 80%)${c[1]==='focus'?'; the outer rain bands were outside your scan box':''}.`:`High-res files are big: ${data} GB generated and battery −10%. Storage will matter later.`;
  } else if(ci===1){
    const T={'std,keep':[4.1,1.0],'std,prio':[3.8,0.7],'high,keep':[5.4,2.8],'high,prio':[5.0,2.0]}[c.join()];
    pts=T[0];data=T[1];if(c[0]==='high')batt=-10;
    const free=cap-o.stored+down;
    if(data>free&&c[1]==='keep'){const f=Math.max(0,free)/data;pts*=f;data=Math.max(0,free);o.overflow=true;met=false;badge='Partial';
      good=`You captured sharp images while there was room.`;trade=`Storage filled up and ${Math.round((1-f)*100)}% of new images were refused.`;}
    else{good=c[1]==='keep'?`Everything fit: storage had room for all new images (${fmt(pts*instMul+obsAdd)} pts).`:`Only the best images were kept, so storage stayed comfortable (${fmt(pts*instMul+obsAdd)} pts).`;
      trade=c[1]==='prio'?`You dropped a few lower-value images you could have kept.`:(c[0]==='high'?`High resolution filled storage fast; the next challenges have less room.`:`Standard resolution kept files small but less detailed.`);}
  } else if(ci===2){
    batt=(c[0]==='normal'?-50:-25)*drainMul;
    pts=c[1]==='freq'?(c[0]==='save'?3.6:4.8):2.0;data=c[1]==='freq'?1.0:0.4;
    good=c[0]==='normal'?`Normal operations kept the camera busy and you took ${c[1]==='freq'?6:3} images (${fmt(pts*instMul+obsAdd)} pts).`:`Power saving protected the battery while still collecting ${fmt(pts*instMul+obsAdd)} pts.`;
    trade=`With solar power halved, the battery went from ${Math.round(o.batt)}% to ${Math.max(0,Math.round(o.batt+batt))}%${D.power==='adv'?' (High-capacity Power halved the drain)':''}.`;
    if(o.batt+batt<=10){health=-20;met=false;badge='Safe mode';trade+=' The satellite dropped into safe mode and health fell 20%.';}
  } else {
    let rate=(c[0]==='fast'?2:1)*(c[1]==='eco'?0.7:1)*down;
    batt=50+(c[0]==='fast'?-20:0)+(c[1]==='eco'?10:0);
    if(o.batt<15&&c[1]==='full'&&c[0]==='fast')rate*=.6;
    const delivered=rate>=0.8;cov=delivered?1:0;
    pts=delivered?4.8:1.5;data=0;
    const sendCap=rate;const backlog=o.stored;const sent=Math.min(backlog+1,sendCap);
    o.critical=delivered?'Delivered':'Missed';met=delivered;badge=delivered?'Update delivered':'Update late';
    good=delivered?`You sent ${fmt(sent)} GB in the last 6 hours and a fresh storm image reached forecasters in time.`:`Eco mode saved battery for the satellite’s next shift.`;
    trade=delivered?`The power fault ended at hour 18, so sunlight recharged the battery${c[0]==='fast'?'; high-speed sending used 20% of it':''}.`:`At ${fmt(rate)} GB per 6 h the fresh image arrived after the deadline. Forecasters used older data.`;
    o.stored=Math.max(0,o.stored-sendCap+ (delivered?0:0));
  }
  const gained=pts*instMul+obsAdd;
  if(ci<3){o.stored=Math.max(0,Math.min(cap,o.stored+data-down));}
  o.pts+=gained;o.cov+=cov;o.batt=Math.max(0,Math.min(100,o.batt+batt));o.minBatt=Math.min(o.minBatt,o.batt);o.health=Math.max(0,o.health+health);
  o.hour+=6;if(ci===1)o.critical='Pending';
  o.delta={cov,pts:gained,batt:o.batt-before.batt,st:o.stored/cap*100-before.st,health:o.health-before.health};
  o.log[ci]={choices:chName,good,trade,met,badge};
  if(ci===3&&scoreCard().success)S.unlocked=true;
}


module.exports={PARTS,CH,S,resetOps,simulate,scoreCard,MAX_KG,MAX_M};
