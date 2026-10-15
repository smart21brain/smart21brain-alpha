(function(){
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const dl=(name,text)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'text/html'}));a.download=name;a.click()};
const svgRouter='<svg viewBox="0 0 200 130" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M50 20 38 50M150 20l12 30"/><circle cx="50" cy="18" r="4"/><circle cx="150" cy="18" r="4"/><rect x="15" y="62" width="170" height="44" rx="8"/><path d="M30 84h60M150 84h.1M165 84h.1" stroke-width="6"/><path d="M95 40a22 22 0 0 1 30 0M85 30a36 36 0 0 1 50 0" opacity=".6"/></svg>';
const svgLaptop='<svg viewBox="0 0 200 130" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="40" y="15" width="120" height="78" rx="6"/><path d="M50 25h100v58H50zM18 105h164l-12-12H30z"/><path d="M85 99h30" stroke-width="4"/><path d="M70 50l12 10-12 10M92 72h26" opacity=".7"/></svg>';
const ico=(i)=>`<div class="c21-art"><i class="fa-solid ${i}"></i><span class="r1"></span><span class="r2"></span></div>`;
const L=a=>a.split('|');
const SEC=[
{id:'network',tab:'Network',ti:'fa-tower-broadcast',n:'Networking',art:svgRouter,
 items:[{k:'Networking',name:'Smart21connect',d:'Design, install and manage LAN, WAN and Wi-Fi for offices and schools — with a console to practise real network commands.',btn:['Open','modal','#mConnect']}],
 svc:L('LAN and WAN installation|Wi-Fi installation and optimization|Router and switch configuration|Structured cabling and fiber optics|Office and school network setup|Network monitoring and troubleshooting|VPN configuration|Network access control|Bandwidth management|Remote IT support|Network security and segmentation'),
 course:{t:'Networking',s:'Learn how networks work, from cables to the cloud',h:'courses.html'}},
{id:'computer',tab:'Computer System',ti:'fa-microchip',n:'Computer System',art:svgLaptop,
 items:[{k:'Computer System',name:'Inside21computer',d:'Explore what is inside a computer and design your own build with live compatibility and power checks.',btn:['Open','modal','#mInside']},
        {k:'Computer Maintenance',name:'Smart21 Fix',d:'Diagnostics, repairs, upgrades, virus removal, data recovery and maintenance contracts.',btn:['View','modal','#mFix']}],
 svc:L('Desktop and laptop repair|Hardware replacement and upgrades|Operating system installation and repair|Virus and malware removal|Data recovery and backup|Computer assembly and custom PC building|Printer and scanner repair')},
{id:'software',tab:'Software development',ti:'fa-terminal',n:'Software development',builder:true,
 svc:L('Website design and development|Web applications and portals|Android and iOS mobile applications|Business management systems|Point of Sale (POS) systems|School management systems|Hospital and clinic management systems|Accounting and invoicing systems|E-commerce and online shopping|APIs and third-party integrations|Custom software and automation'),
 course:{t:'Software development',s:'Build websites and apps step by step',h:'course.html?slug=web-design-basics'}},
{id:'cloud',tab:'Cloud Service',ti:'fa-cloud',n:'Cloud Services',art:ico('fa-cloud'),
 items:[{k:'Cloud & Servers',name:'Smart21cloud',d:'Servers, hosting, business email and Cloudflare deployment, with backup and disaster recovery planning.',btn:['Request','link','contact.html?service=Cloud%20Services']}],
 svc:L('Server installation and configuration|Windows and Linux server administration|Cloud hosting and deployment|Website and domain hosting|Email server and business email setup|Cloudflare configuration and deployment|Virtual machines and containers|Storage and backup systems|Disaster recovery planning|Cloud migration|High availability and infrastructure scaling'),
 course:{t:'Cloud computing',s:'Servers, hosting and deployment basics',h:'courses.html'}},
{id:'security',tab:'Cyber Security',ti:'fa-shield-halved',n:'Cyber Security',art:ico('fa-shield-halved'),
 items:[{k:'Cybersecurity & Data Protection',name:'Smart21shield',d:'Protect computers, networks and data: firewalls, endpoint protection, MFA, awareness training and incident response.',btn:['Request','link','contact.html?service=Cybersecurity']}],
 svc:L('Computer and network security assessments|Firewall configuration|Endpoint protection|Multi-factor authentication|User permissions and identity management|Security awareness training|Security log monitoring|Vulnerability assessments with authorization|Backup and recovery procedures|Incident response|Phishing prevention|Authorized penetration testing'),
 course:{t:'Digital safety',s:'Stay safe online and protect your data',h:'course.html?slug=digital-safety-for-students'}},
{id:'ai',tab:'AI',ti:'',tx:'AI',n:'Artificial Intelligence',art:ico('fa-brain'),
 items:[{k:'AI & Automation',name:'Smart21AI',d:'Swahili and English chatbots, knowledge-base assistants, document processing and workflow automation.',btn:['Open','link','ai.html']}],
 svc:L('AI chatbot development|AI customer support assistants|Swahili and English conversational AI|AI integration into websites and applications|Business workflow automation|Document processing and extraction|Knowledge-base assistants|Speech-to-text and text-to-speech|Machine learning solutions|Retrieval-augmented generation (RAG)|AI model deployment and monitoring'),
 course:{t:'Artificial Intelligence',s:'Understand how AI works and how to use it',h:'course.html?slug=introduction-to-ai'}},
{id:'database',tab:'Database',ti:'fa-database',n:'Database',art:ico('fa-database'),
 items:[{k:'Data & Storage',name:'Smart21data',d:'Database design and server management for school, clinic, shop and business systems, with safe backups.',btn:['Request','link','contact.html?service=Database']}],
 svc:L('Database server management|Inventory and stock management|Storage and backup systems|AI data analysis and reporting|Accounting and invoicing systems|Payroll and HR systems|Booking and reservation platforms'),
 course:{t:'Databases',s:'Store, organise and query information',h:'courses.html'}}];
const OTH=[['fa-video','CCTV, Cameras & Sensors','CCTV camera installation|IP and analog camera systems|Remote camera monitoring|NVR/DVR configuration|Door access control|Biometric attendance systems|Alarm systems|Smart doorbells and video intercom'],
['fa-bolt','Electrical & Smart Technology','Office electrical installations|UPS and backup power systems|Surge protection and grounding|Solar power and inverter integration|Smart lighting and controls|Energy monitoring systems|Electrical work follows applicable Tanzanian requirements and is done by qualified personnel.'],
['fa-palette','Graphic Design, Printing & Branding','Logo design and brand identity|Posters, banners and flyers|Business cards and letterheads|T-shirt and merchandise designs|DTF and heat-transfer printing|Large-format printing|Social media graphics'],
['fa-camera','Photography, Video & Media','Photography and event coverage|Product photography|Video recording and editing|Commercial advertisements|Motion graphics and logo animation|Livestreaming setup|AI-assisted video production'],
['fa-laptop','Computer Accessories & IT Equipment','Desktop and laptop sales|Monitors and computer accessories|Printers, scanners and photocopiers|Routers, switches and access points|UPS devices and surge protectors|Projectors and presentation equipment|Equipment procurement and delivery'],
['fa-headset','Business IT Support & Consultancy','IT consulting and technology planning|Office IT setup and relocation|Help desk and technical support|Service-level agreements (SLAs)|Staff computer training|Technology audits|Managed IT services and monthly maintenance']];
const btn=b=>b[1]==='modal'?`<button class="btn-s21 btn-s21-primary" data-bs-toggle="modal" data-bs-target="${b[2]}">${b[0]} <i class="fa-solid fa-arrow-right ms-1"></i></button>`:`<a class="btn-s21 btn-s21-primary" href="${b[2]}">${b[0]} <i class="fa-solid fa-arrow-right ms-1"></i></a>`;
const chips=(a,m)=>`<div class="c21-chips">${a.slice(0,m).map(x=>`<span>${esc(x)}</span>`).join('')}</div>${a.length>m?`<details class="c21-more"><summary>+${a.length-m} more services</summary><div class="c21-chips">${a.slice(m).map(x=>`<span>${esc(x)}</span>`).join('')}</div></details>`:''}`;
const course=c=>`<a class="c21-course" href="${c.h}"><div class="c21-ch">Open course <i class="fa-solid fa-arrow-up-right-from-square"></i></div><div class="c21-cb"><i class="fa-solid fa-graduation-cap"></i><div><b>${esc(c.t)}</b><small>${esc(c.s)}</small></div></div></a>`;
$('#c21Sections').innerHTML=SEC.map((s,i)=>{
 const art=s.builder?`<div class="c21-lbl"><i class="fa-solid fa-terminal"></i><h3>${s.n}</h3></div>`:`<div class="c21-art-wrap">${s.art.startsWith('<svg')?`<div class="c21-svg">${s.art}</div>`:s.art}</div>`;
 const mid=s.builder?`<div id="devCenter"></div>`:s.items.map(p=>`<div class="c21-prod"><span class="c21-k"><i class="fa-solid fa-circle"></i> ${esc(p.k)}</span><h3>${esc(p.name)}</h3><p>${esc(p.d)}</p>${btn(p.btn)}</div>`).join('');
 const right=s.course?course(s.course):'';
 const two=s.items&&s.items.length>1;
 return `<section class="c21-sec ${i%2?'alt':''}" id="${s.id}"><div class="container"><div class="c21-secno">0${i+1} · ${esc(s.n)}</div>
 <div class="row g-4 align-items-center"><div class="col-lg-4">${art}</div>
 <div class="col-lg-${s.builder?8:(two?8:4)}"><div class="${two?'row g-3':''}">${s.items&&two?s.items.map(p=>`<div class="col-md-6"><div class="c21-prod"><span class="c21-k"><i class="fa-solid fa-circle"></i> ${esc(p.k)}</span><h3>${esc(p.name)}</h3><p>${esc(p.d)}</p>${btn(p.btn)}</div></div>`).join(''):mid}</div></div>
 ${!s.builder&&!two?`<div class="col-lg-4">${right}</div>`:''}</div>
 ${s.builder?`<div class="row mt-4"><div class="col-lg-4 offset-lg-8">${right}</div></div>`:''}
 <div class="mt-4"><h4 class="c21-h4">What we do</h4>${chips(s.svc,5)}</div></div></section>`}).join('');
$('#devCenter').appendChild($('#builderBox'));
$('#c21Other').innerHTML=OTH.map(o=>{const note=/^Electrical work/.test(o[2].split('|').pop())?o[2].split('|').pop():'',l=note?o[2].split('|').slice(0,-1):o[2].split('|');return `<div class="col-md-6 col-xl-4"><div class="c21-card"><div class="c21-ico"><i class="fa-solid ${o[0]}"></i></div><h3 class="h6 fw-bold">${o[1]}</h3><ul>${l.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>${note?`<p class="c21-note">${note}</p>`:''}<a class="btn-s21 btn-s21-outline btn-sm" href="contact.html?service=${encodeURIComponent(o[1])}">Request service</a></div></div>`}).join('');
$('#c21Icons').innerHTML=SEC.map(s=>`<a href="#${s.id}" data-t="${s.id}"><span>${s.tx?`<b>${s.tx}</b>`:`<i class="fa-solid ${s.ti}"></i>`}</span>${s.tab}</a>`).join('');
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)document.querySelectorAll('#c21Icons a').forEach(a=>a.classList.toggle('on',a.dataset.t===e.target.id))}),{rootMargin:'-40% 0px -55% 0px'});
document.querySelectorAll('.c21-sec').forEach(s=>io.observe(s));
$('#fixList').innerHTML=SEC[1].svc.map(x=>`<li>${esc(x)}</li>`).join('');
/* ---------- Website builder ---------- */
const sites={business:['Our Services','About Us','Contact'],school:['Admissions','Academics','Contact'],shop:['Products','Offers','Contact']};
function siteHTML(){const n=esc($('#wName').value||'My Business'),t=esc($('#wTag').value),c=$('#wCol').value,k=$('#wTpl').value,on=[...document.querySelectorAll('.wSec:checked')].map(x=>x.value);
const sec={hero:`<header style="background:${c};color:#fff;padding:3rem 1rem;text-align:center"><h1>${n}</h1><p>${t}</p><a href="#contact" style="background:#fff;color:${c};padding:.6rem 1.2rem;border-radius:8px;text-decoration:none">${sites[k][0]}</a></header>`,
about:`<section style="padding:2rem 1rem;max-width:760px;margin:auto"><h2>${sites[k][1]}</h2><p>${n} — ${t}. Edit this text after downloading.</p></section>`,
services:`<section style="padding:2rem 1rem;max-width:760px;margin:auto"><h2>${sites[k][0]}</h2><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1rem">${[1,2,3].map(i=>`<div style="border:1px solid #ddd;border-radius:10px;padding:1rem">Item ${i}</div>`).join('')}</div></section>`,
contact:`<footer id="contact" style="background:#111;color:#fff;padding:2rem 1rem;text-align:center"><h2>${sites[k][2]}</h2><p>Phone · Email · WhatsApp</p></footer>`};
return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${n}</title></head><body style="margin:0;font-family:system-ui,sans-serif">${['hero','about','services','contact'].filter(x=>on.includes(x)).map(x=>sec[x]).join('')}</body></html>`}
const wr=()=>{$('#wFrame').srcdoc=siteHTML()};document.querySelectorAll('#t-web input,#t-web select').forEach(i=>i.addEventListener('input',wr));wr();
$('#wDl').onclick=()=>dl(($('#wName').value||'site').replace(/\W+/g,'-')+'.html',siteHTML());
/* ---------- App builder ---------- */
const scr={Home:n=>`<h5>Welcome to ${n}</h5><p>Your dashboard goes here.</p>`,List:()=>[1,2,3,4].map(i=>`<div style="padding:.6rem;border-bottom:1px solid #eee">Item ${i}</div>`).join(''),Form:()=>`<input placeholder="Name" style="width:100%;margin:.3rem 0;padding:.4rem"><input placeholder="Phone" style="width:100%;margin:.3rem 0;padding:.4rem"><button style="width:100%;padding:.5rem">Save</button>`,Profile:()=>`<div style="text-align:center"><div style="font-size:3rem">👤</div><p>Your profile</p></div>`};
let cur='Home';
function appRender(){const n=esc($('#aName').value||'My App'),c=$('#aCol').value,on=[...document.querySelectorAll('.aScr:checked')].map(x=>x.value);if(!on.includes(cur))cur=on[0];
$('#aPhone').innerHTML=on.length?`<div class="bar" style="background:${c}">${n}</div><div class="scr">${scr[cur](n)}</div><div class="tabs">${on.map(s=>`<button data-s="${s}" style="${s==cur?'color:'+c+';font-weight:700':''}">${s}</button>`).join('')}</div>`:'<div class="scr">Pick a screen</div>'}
document.querySelectorAll('#t-app input').forEach(i=>i.addEventListener('input',appRender));$('#aPhone').addEventListener('click',e=>{const b=e.target.closest('[data-s]');if(b){cur=b.dataset.s;appRender()}});appRender();
$('#aDl').onclick=()=>{const n=esc($('#aName').value||'My App'),c=$('#aCol').value,on=[...document.querySelectorAll('.aScr:checked')].map(x=>x.value);
dl('app.html',`<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${n}</title></head><body style="margin:0;font-family:system-ui"><div id="b" style="background:${c};color:#fff;padding:1rem;text-align:center;font-weight:700">${n}</div><div id="s" style="padding:1rem;min-height:70vh"></div><div id="t" style="position:fixed;bottom:0;left:0;right:0;display:flex;border-top:1px solid #ddd;background:#fff"></div><script>const S={${on.map(s=>`${s}:\`${scr[s](n).replace(/`/g,'')}\``).join(',')}};const t=document.getElementById('t'),s=document.getElementById('s');Object.keys(S).forEach(k=>{const b=document.createElement('button');b.textContent=k;b.style.cssText='flex:1;padding:.8rem;border:0;background:none';b.onclick=()=>s.innerHTML=S[k];t.appendChild(b)});s.innerHTML=S[Object.keys(S)[0]];<\/script></body></html>`)};
/* ---------- PC / system builder (sample prices, TZS, editable catalogue) ---------- */
const P={cpu:[['Intel i3 (LGA1700)',280000,'L',65],['Intel i5 (LGA1700)',420000,'L',65],['AMD Ryzen 5 (AM4)',380000,'A',65],['AMD Ryzen 7 (AM5)',700000,'M',105]],
board:[['LGA1700 board',260000,'L'],['AM4 board',200000,'A'],['AM5 board',380000,'M']],
ram:[['8GB DDR4',70000],['16GB DDR4',130000],['32GB DDR4',250000]],
disk:[['256GB SSD',60000],['512GB SSD',95000],['1TB HDD',90000],['1TB SSD',180000]],
gpu:[['Integrated graphics',0,0],['GTX-class GPU',450000,120],['RTX-class GPU',900000,200]],
psu:[['400W PSU',60000,400],['550W PSU',90000,550],['750W PSU',150000,750]]};
const lab={cpu:'Processor',board:'Motherboard',ram:'Memory',disk:'Storage',gpu:'Graphics',psu:'Power supply'};
$('#pcForm').innerHTML=Object.keys(P).map(k=>`<label>${lab[k]}</label><select class="form-select form-select-sm" id="pc_${k}">${P[k].map((o,i)=>`<option value="${i}">${o[0]} — ${o[1].toLocaleString()}</option>`).join('')}</select>`).join('');
function pcCalc(){const g=k=>P[k][+$('#pc_'+k).value];let tot=0;Object.keys(P).forEach(k=>tot+=g(k)[1]);const w=g('cpu')[3]+(g('gpu')[2]||0)+60,msgs=[];
const ok=g('cpu')[2]===g('board')[2];msgs.push(ok?'<span class="c21-ok">✔ CPU fits motherboard socket</span>':'<span class="c21-bad">✘ CPU socket does not match motherboard</span>');
const need=Math.ceil(w*1.4);msgs.push(g('psu')[2]>=need?`<span class="c21-ok">✔ PSU OK (est. ${w}W load)</span>`:`<span class="c21-bad">✘ PSU too small — need about ${need}W</span>`);
$('#pcOut').innerHTML=`<div class="c21-total">${tot.toLocaleString()} TZS</div><p class="c21-note">Sample prices — update to your supplier's prices.</p>${msgs.map(m=>`<p class="mb-1">${m}</p>`).join('')}`}
document.querySelectorAll('#pcForm select').forEach(s=>s.addEventListener('change',pcCalc));pcCalc();
/* ---------- Terminal: virtual file system (saved in this browser) + real network/browser tools ---------- */
const T=$('#term'),IN=$('#termIn'),PS=$('#termPs'),LINE=$('#termLine'),HOME='/home/student',KEY='c21fs';
let cwd=HOME,fs=null,hist=[],hi=0;
try{fs=JSON.parse(localStorage.getItem(KEY))}catch(e){}
const seed=()=>({'/':{t:'d'},'/home':{t:'d'},[HOME]:{t:'d'},[HOME+'/readme.txt']:{t:'f',c:'Welcome to Smart21connect.\nType help to see all commands.\nFiles you create are saved in this browser.\nNetwork tools (ping, dns, myip, curl, speedtest) make real requests.\n'}});
if(!fs||!fs['/'])fs=seed();
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(fs))}catch(e){}};
const print=t=>{T.insertBefore(document.createTextNode(t+'\n'),LINE);T.scrollTop=T.scrollHeight};
const parent=p=>p==='/'?'/':(p.replace(/\/[^/]+$/,'')||'/'),nm=p=>p.split('/').pop();
const abs=p=>{if(!p||p==='~')p=HOME;else if(p.startsWith('~/'))p=HOME+p.slice(1);if(!p.startsWith('/'))p=(cwd==='/'?'':cwd)+'/'+p;const o=[];p.split('/').forEach(s=>{if(!s||s==='.')return;s==='..'?o.pop():o.push(s)});return '/'+o.join('/')};
const kids=d=>Object.keys(fs).filter(k=>k!==d&&parent(k)===d).sort();
const sub=p=>Object.keys(fs).filter(k=>k===p||k.startsWith(p+'/'));
const setPS=()=>{PS.textContent='student@smart21:'+(cwd===HOME?'~':cwd.startsWith(HOME+'/')?'~'+cwd.slice(HOME.length):cwd)+'$ '};
const tree=(d,pre)=>kids(d).map((k,i,a)=>{const last=i===a.length-1;return pre+(last?'└── ':'├── ')+nm(k)+(fs[k].t==='d'?'/':'')+(fs[k].t==='d'?'\n'+tree(k,pre+(last?'    ':'│   ')):'')}).join('\n').replace(/\n$/,'');
const need=(a,n,u)=>a.length<n?u:null;
const ms=t=>Math.round(t)+' ms';
const tmo=(u,o={},t=6000)=>{const c=new AbortController();const id=setTimeout(()=>c.abort(),t);return fetch(u,{...o,signal:c.signal}).finally(()=>clearTimeout(id))};
const ip2n=s=>{const p=s.split('.').map(Number);if(p.length!==4||p.some(x=>!(x>=0&&x<=255)))return null;return(((p[0]*256+p[1])*256+p[2])*256+p[3])};
const n2ip=n=>[n>>>24,(n>>>16)&255,(n>>>8)&255,n&255].join('.');
const C={
help:()=>`FILES    ls [-l] cd pwd cat mkdir touch rm [-r] cp mv tree grep wc echo ('>' and '>>' write files) edit <file>
SYSTEM   sysinfo  diagnose  date  whoami  hostname  uname  history  clear  reset
NETWORK  ping <host>   dns <host> [A|AAAA|MX|TXT|NS]   myip   curl <url>   speedtest   subnet <ip>/<cidr>
TOOLS    calc <expr>  conv <number>  hash <text|file>  passcheck <password>  js <code>  run <file.js>`,
pwd:()=>cwd,whoami:()=>'student',hostname:()=>'smart21-connect',date:()=>new Date().toString(),
uname:()=>'Smart21OS 1.0 (browser) '+(navigator.platform||''),history:()=>hist.map((h,i)=>(i+1)+'  '+h).join('\n'),
clear:()=>{[...T.childNodes].forEach(n=>{if(n!==LINE)n.remove()});return ''},
reset:()=>{fs=seed();cwd=HOME;save();return 'File system reset.'},
ls:a=>{const l=a.includes('-l'),p=abs(a.find(x=>x[0]!=='-')||'.');if(!fs[p])return'ls: '+p+': no such file or directory';if(fs[p].t==='f')return nm(p);
 return kids(p).map(k=>{const d=fs[k].t==='d';return l?(d?'d ':'- ')+String(d?kids(k).length+' items':fs[k].c.length+' B').padEnd(10)+nm(k)+(d?'/':''):nm(k)+(d?'/':'')}).join(l?'\n':'  ')||'(empty)'},
cd:a=>{const p=abs(a[0]);if(!fs[p]||fs[p].t!=='d')return'cd: '+(a[0]||'')+': not a directory';cwd=p;return ''},
cat:a=>need(a,1,'usage: cat <file>')||a.map(x=>{const p=abs(x);return !fs[p]?'cat: '+x+': no such file':fs[p].t==='d'?'cat: '+x+': is a directory':fs[p].c.replace(/\n$/,'')}).join('\n'),
echo:a=>a.join(' '),
mkdir:a=>need(a,1,'usage: mkdir <dir>')||a.map(x=>{const p=abs(x);if(fs[p])return'mkdir: '+x+': already exists';if(!fs[parent(p)]||fs[parent(p)].t!=='d')return'mkdir: '+x+': parent missing';fs[p]={t:'d'};save();return''}).filter(Boolean).join('\n'),
touch:a=>need(a,1,'usage: touch <file>')||a.map(x=>{const p=abs(x);if(!fs[parent(p)])return'touch: '+x+': parent missing';if(!fs[p]){fs[p]={t:'f',c:''};save()}return''}).filter(Boolean).join('\n'),
rm:a=>{const r=a.includes('-r'),f=a.filter(x=>x[0]!=='-');if(!f.length)return'usage: rm [-r] <path>';return f.map(x=>{const p=abs(x);if(p==='/'||p===HOME)return'rm: refusing to remove '+x;if(!fs[p])return'rm: '+x+': no such file';if(fs[p].t==='d'&&!r)return'rm: '+x+': is a directory (use -r)';sub(p).forEach(k=>delete fs[k]);save();return''}).filter(Boolean).join('\n')},
cp:a=>mvcp(a,false),mv:a=>mvcp(a,true),
tree:a=>{const p=abs(a[0]||'.');return fs[p]?p+'\n'+(tree(p,'')||'(empty)'):'tree: no such path'},
grep:a=>{if(a.length<2)return'usage: grep <text> <file>';const p=abs(a[1]);if(!fs[p]||fs[p].t!=='f')return'grep: '+a[1]+': no such file';return fs[p].c.split('\n').map((l,i)=>[i+1,l]).filter(x=>x[1].toLowerCase().includes(a[0].toLowerCase())).map(x=>x[0]+': '+x[1]).join('\n')||'(no matches)'},
wc:a=>{const p=abs(a[0]);if(!a[0]||!fs[p]||fs[p].t!=='f')return'usage: wc <file>';const c=fs[p].c;return(c.match(/\n/g)||[]).length+' lines  '+(c.trim()?c.trim().split(/\s+/).length:0)+' words  '+c.length+' chars'},
edit:a=>new Promise(res=>{if(!a[0])return res('usage: edit <file>');const p=abs(a[0]);if(fs[p]&&fs[p].t==='d')return res('edit: is a directory');if(!fs[parent(p)])return res('edit: parent folder missing');
 const w=document.createElement('div');w.className='c21-edit';w.innerHTML='<textarea spellcheck="false"></textarea><div><button class="btn-s21 btn-s21-primary btn-sm">Save</button> <button class="btn-s21 btn-s21-outline btn-sm">Cancel</button></div>';
 const ta=w.querySelector('textarea');ta.value=fs[p]?fs[p].c:'';T.insertBefore(w,LINE);ta.focus();const[b1,b2]=w.querySelectorAll('button');
 b1.onclick=()=>{fs[p]={t:'f',c:ta.value};save();w.remove();res('Saved '+a[0])};b2.onclick=()=>{w.remove();res('Cancelled')}}),
sysinfo:()=>{const n=navigator,c=n.connection;return['Browser   : '+n.userAgent,'Platform  : '+(n.userAgentData&&n.userAgentData.platform||n.platform),'CPU cores : '+(n.hardwareConcurrency||'unknown'),'Memory    : '+(n.deviceMemory?'~'+n.deviceMemory+' GB':'not reported by browser'),'Screen    : '+screen.width+'x'+screen.height+' @'+(typeof devicePixelRatio!=='undefined'?devicePixelRatio:1)+'x','Language  : '+n.language,'Timezone  : '+Intl.DateTimeFormat().resolvedOptions().timeZone,'Online    : '+(n.onLine?'yes':'no'),'Network   : '+(c?(c.effectiveType||'?')+', ~'+(c.downlink||'?')+' Mbps, rtt '+(c.rtt||'?')+' ms':'not reported')].join('\n')},
neofetch:()=>C.sysinfo(),
diagnose:async()=>{const L=[],n=navigator;L.push('CPU cores     : '+(n.hardwareConcurrency||'?'));let t=performance.now(),x=0;for(let i=0;i<3e6;i++)x+=Math.sqrt(i);const b=performance.now()-t;L.push('CPU benchmark : '+ms(b)+(b<150?'  [GOOD]':b<500?'  [OK]':'  [SLOW]'));
 if(performance.memory){const m=performance.memory;L.push('JS heap       : '+(m.usedJSHeapSize/1048576).toFixed(0)+' / '+(m.jsHeapSizeLimit/1048576).toFixed(0)+' MB')}
 if(n.storage&&n.storage.estimate){const e=await n.storage.estimate();L.push('Browser storage: '+(e.usage/1048576).toFixed(1)+' MB used of '+(e.quota/1073741824).toFixed(1)+' GB')}
 if(n.getBattery){try{const bt=await n.getBattery();L.push('Battery       : '+Math.round(bt.level*100)+'%'+(bt.charging?' (charging)':'')+(bt.level<.2&&!bt.charging?'  [LOW]':''))}catch(e){}}
 L.push('Network       : '+(n.onLine?'online':'OFFLINE  [CHECK CABLE / WI-FI]'));return L.join('\n')},
ping:async a=>{if(!a[0])return'usage: ping <host>';const u=/^https?:/.test(a[0])?a[0]:'https://'+a[0],r=[],L=['Pinging '+a[0]+' over HTTPS (browser cannot send ICMP):'];
 for(let i=0;i<4;i++){const t=performance.now();try{await tmo(u+(u.includes('?')?'&':'?')+'c21='+Date.now(),{mode:'no-cors',cache:'no-store'},5000);const d=performance.now()-t;r.push(d);L.push('Reply from '+a[0]+': time='+ms(d))}catch(e){L.push('Request failed or timed out')}}
 L.push(r.length?'Sent 4, received '+r.length+' | min '+ms(Math.min(...r))+' avg '+ms(r.reduce((s,v)=>s+v,0)/r.length)+' max '+ms(Math.max(...r)):'No replies: host unreachable or blocked.');return L.join('\n')},
dns:async a=>{if(!a[0])return'usage: dns <host> [A|AAAA|MX|TXT|NS|CNAME]';const ty=(a[1]||'A').toUpperCase(),M={1:'A',28:'AAAA',5:'CNAME',15:'MX',16:'TXT',2:'NS'};
 const r=await tmo('https://cloudflare-dns.com/dns-query?name='+encodeURIComponent(a[0])+'&type='+ty,{headers:{accept:'application/dns-json'}});const j=await r.json();
 return j.Answer&&j.Answer.length?'Resolver: cloudflare-dns.com\n'+j.Answer.map(x=>x.name+'  '+(M[x.type]||x.type)+'  ttl '+x.TTL+'  '+x.data).join('\n'):'No '+ty+' records found (status '+j.Status+').'},
myip:async()=>{const j=await(await tmo('https://api.ipify.org?format=json')).json();return'Public IP: '+j.ip},
curl:async(a)=>{if(!a[0])return'usage: curl <url>';const u=/^https?:/.test(a[0])?a[0]:'https://'+a[0];try{const r=await tmo(u);const t=await r.text();return'HTTP '+r.status+' '+r.statusText+'\n'+t.slice(0,1500)+(t.length>1500?'\n… ('+t.length+' chars total)':'')}catch(e){return'curl failed: the site is unreachable or blocks browser requests (CORS).'}},
speedtest:async()=>{const u='https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js?c21='+Date.now();print('Downloading test file…');const t=performance.now(),b=await(await tmo(u,{cache:'no-store'},20000)).arrayBuffer(),s=(performance.now()-t)/1000;return'Downloaded '+(b.byteLength/1024).toFixed(0)+' KB in '+s.toFixed(2)+' s  =>  '+(b.byteLength*8/s/1e6).toFixed(2)+' Mbps (approx.)'},
subnet:a=>{const m=(a[0]||'').match(/^([\d.]+)\/(\d{1,2})$/);if(!m)return'usage: subnet 192.168.1.10/24';const ip=ip2n(m[1]),c=+m[2];if(ip===null||c>32)return'Invalid address or prefix.';const mask=c?(0xFFFFFFFF<<(32-c))>>>0:0,net=(ip&mask)>>>0,bc=(net|~mask)>>>0,h=Math.max(0,Math.pow(2,32-c)-2);
 return['Address   : '+n2ip(ip),'Netmask   : '+n2ip(mask)+' (/'+c+')','Network   : '+n2ip(net),'Broadcast : '+n2ip(bc),'First host: '+n2ip(c>=31?net:net+1),'Last host : '+n2ip(c>=31?bc:bc-1),'Hosts     : '+(c===32?1:c===31?2:h).toLocaleString()].join('\n')},
conv:a=>{const s=a[0]||'';let n=/^0x/i.test(s)?parseInt(s,16):/^0b/i.test(s)?parseInt(s.slice(2),2):parseInt(s,10);if(isNaN(n))return'usage: conv 255 | 0xFF | 0b1010';return'Decimal: '+n+'\nBinary : '+n.toString(2)+'\nHex    : 0x'+n.toString(16).toUpperCase()+'\nOctal  : '+n.toString(8)},
hash:async a=>{if(!a.length)return'usage: hash <text|file>';const p=abs(a[0]);const t=a.length===1&&fs[p]&&fs[p].t==='f'?fs[p].c:a.join(' ');const d=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return'SHA-256: '+[...new Uint8Array(d)].map(x=>x.toString(16).padStart(2,'0')).join('')},
passcheck:a=>{const p=a.join(' ');if(!p)return'usage: passcheck <password>';let s=0;/[a-z]/.test(p)&&(s+=26);/[A-Z]/.test(p)&&(s+=26);/\d/.test(p)&&(s+=10);/[^\w]/.test(p)&&(s+=32);const bits=Math.round(p.length*Math.log2(s||1));return'Length '+p.length+', about '+bits+' bits  =>  '+(bits<40?'WEAK':bits<60?'FAIR':bits<80?'STRONG':'VERY STRONG')+(/^(password|123456|qwerty|admin)/i.test(p)?'  (common password: change it!)':'')},
calc:a=>{let e=a.join(' ').replace(/\^/g,'**').replace(/\bpi\b/gi,'Math.PI').replace(/\b(sqrt|sin|cos|tan|log|abs|round|floor|ceil)\b/gi,m=>'Math.'+m.toLowerCase());if(!e)return'usage: calc 2*(3+4)';if(!/^[\d\s+\-*/().%,]*$/.test(e.replace(/Math\.(PI|sqrt|sin|cos|tan|log|abs|round|floor|ceil)/g,'1')))return'calc: unsupported characters';try{const v=Function('"use strict";return ('+e+')')();return String(v)}catch(x){return'calc: invalid expression'}},
js:(a,raw)=>runJS(raw),
run:a=>{const p=abs(a[0]);return!a[0]||!fs[p]||fs[p].t!=='f'?'usage: run <file.js>':runJS(fs[p].c)}};
function mvcp(a,mv){const f=a.filter(x=>x[0]!=='-');if(f.length<2)return'usage: '+(mv?'mv':'cp')+' [-r] <from> <to>';const s=abs(f[0]);let d=abs(f[1]);if(!fs[s])return'no such file: '+f[0];if(fs[s].t==='d'&&!mv&&!a.includes('-r'))return'cp: '+f[0]+' is a directory (use -r)';if(fs[d]&&fs[d].t==='d')d=(d==='/'?'':d)+'/'+nm(s);if(!fs[parent(d)])return'destination folder missing';if(d===s||d.startsWith(s+'/'))return'invalid destination';
 const items=sub(s).map(k=>[d+k.slice(s.length),JSON.parse(JSON.stringify(fs[k]))]);items.forEach(([k,v])=>fs[k]=v);if(mv)sub(s).forEach(k=>delete fs[k]);save();return''}
function runJS(code){const out=[],pr=(...x)=>out.push(x.join(' '));try{const r=Function('print','console','"use strict";'+(/\breturn\b|;|\n/.test(code)?code:'return ('+code+')'))(pr,{log:pr});if(r!==undefined)out.push(String(r))}catch(e){out.push('Error: '+e.message)}return out.join('\n')||'(no output)'}
async function exec(line){line=line.trim();if(!line)return;hist.push(line);hi=hist.length;print(PS.textContent+line);
 let tok=[...line.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)].map(m=>m[1]!==undefined?m[1]:m[2]!==undefined?m[2]:m[3]),redir=null;const ri=tok.findIndex(t=>t==='>'||t==='>>');if(ri>-1){redir={app:tok[ri]==='>>',f:tok[ri+1]};tok=tok.slice(0,ri)}
 const c=tok[0],a=tok.slice(1),raw=line.slice(line.indexOf(c)+c.length).trim();let out;
 if(!C[c])out=c+': command not found. Type help.';else{IN.disabled=true;try{out=await C[c](a,raw)}catch(e){out=c+': failed ('+(e.name==='AbortError'?'timed out':e.message)+')'}IN.disabled=false}
 if(redir){const p=redir.f&&abs(redir.f);if(!redir.f)out='syntax error: missing file after >';else if(!fs[parent(p)]||(fs[p]&&fs[p].t==='d'))out='cannot write to '+redir.f;else{fs[p]={t:'f',c:(redir.app&&fs[p]?fs[p].c:'')+(out||'')+'\n'};save();out=''}}
 if(out)print(out);setPS();IN.focus()}
function complete(){const v=IN.value,sp=v.lastIndexOf(' '),w=v.slice(sp+1),first=sp<0;let c;if(first)c=Object.keys(C).filter(k=>k.startsWith(w));else{const di=w.lastIndexOf('/'),dir=abs(di<0?'.':w.slice(0,di+1)||'/'),pre=di<0?w:w.slice(di+1);c=kids(dir).filter(k=>nm(k).startsWith(pre)).map(k=>w.slice(0,di+1)+nm(k)+(fs[k].t==='d'?'/':''))}
 if(c.length===1)IN.value=v.slice(0,sp+1)+c[0]+(first?' ':'');else if(c.length>1){print(PS.textContent+v);print(c.map(x=>x.split('/').filter(Boolean).pop()||x).join('  '))}}
IN.addEventListener('keydown',e=>{if(e.key==='Enter'){const v=IN.value;IN.value='';exec(v)}else if(e.key==='ArrowUp'){e.preventDefault();if(hi>0)IN.value=hist[--hi]}else if(e.key==='ArrowDown'){e.preventDefault();IN.value=hi<hist.length-1?hist[++hi]:(hi=hist.length,'')}else if(e.key==='Tab'){e.preventDefault();complete()}else if(e.key==='l'&&e.ctrlKey){e.preventDefault();C.clear()}});
T.addEventListener('click',e=>{if(e.target===T&&!getSelection().toString())IN.focus()});
const mc=document.getElementById('mConnect');if(mc)mc.addEventListener('shown.bs.modal',()=>IN.focus());
setPS();print('Smart21connect terminal — real virtual file system (saved in this browser) and real network tools.\nType help to begin. Try: ping google.com  |  dns smart21brain.com  |  subnet 192.168.1.10/24');
})();
