const attrs=["Fitness","Focus","Discipline","Creativity","Social","Finance","Sleep","Learning"];
const state=JSON.parse(localStorage.getItem('attrDemo')||'null')||{
profile:{name:'DemoPlayer01',level:7,xp:1280,archetype:'Balanced Playmaker'},
attributes:Object.fromEntries(attrs.map(a=>[a,Math.floor(450+Math.random()*300)])),
skills:[{name:'Cooking',rank:220},{name:'Sports',rank:360}],streak:4,quests:["Hit 3-day Focus streak","+20 Sleep this week","Complete Finance check-in x5"],badges:["Iron Routine","Night Scholar","Budget IQ"]
};
function save(){localStorage.setItem('attrDemo',JSON.stringify(state));render();}
function cap(v){return Math.max(1,Math.min(1000,v));}
function profile(){const p=state.profile;return `${p.name} | LVL ${p.level} | XP ${p.xp} | ${p.archetype}`;}
function render(){
const pe=document.getElementById('profile'); if(pe) pe.textContent=profile();
const ae=document.getElementById('attributes'); if(ae) ae.innerHTML=Object.entries(state.attributes).map(([k,v])=>`<div class='attr'><h3>${k} <span class='small'>${v}/1000</span></h3><div class='meter'><div class='fill' style='width:${v/10}%'></div></div><button onclick="incAttr('${k}')">+10</button> <button onclick="decAttr('${k}')">-10</button></div>`).join('');
const te=document.getElementById('trends'); if(te) te.innerHTML=`<p>Current streak: <b>${state.streak} days</b></p><p class='small'>Weekly trend: ▁▃▄▅▆▇█</p>`;
const se=document.getElementById('skills'); if(se) se.innerHTML=state.skills.map(s=>`<div>${s.name}: ${s.rank}/1000 <button onclick="incSkill('${s.name}')">+15</button></div>`).join('');
const qe=document.getElementById('quests'); if(qe) qe.innerHTML=state.quests.map(q=>`<li>${q}</li>`).join('');
const be=document.getElementById('badges'); if(be) be.innerHTML=state.badges.map(b=>`<span class='panel' style='display:inline-block;margin:4px;padding:6px 8px'>${b}</span>`).join('');
}
function incAttr(k){state.attributes[k]=cap(state.attributes[k]+10);state.profile.xp+=8;save();}
function decAttr(k){state.attributes[k]=cap(state.attributes[k]-10);save();}
function incSkill(n){const s=state.skills.find(x=>x.name===n);if(s){s.rank=cap(s.rank+15);state.profile.xp+=5;save();}}
function addSkill(){const i=document.getElementById('skillName');if(!i||!i.value.trim())return;state.skills.push({name:i.value.trim(),rank:100});i.value='';save();}
function dailyCheckin(){state.streak++;state.profile.xp+=40;document.getElementById('checkin').textContent=`Daily complete! Streak is now ${state.streak}.`;save();}
render();
