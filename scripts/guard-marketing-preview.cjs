'use strict';
// Local-only screenshot studio. Uses real BodeeGuard renderers with fictional records.
// Never loads credentials, installed app profiles or production APIs. Not a public route.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
const cloud=path.resolve(process.env.BODEEGUARD_SCREENSHOT_SOURCE||'C:/Projects/worktrees/bodee-guard/student-today-dashboard');
const renderer=path.join(cloud,'renderer');
const now=new Date().toISOString(),date=now.slice(0,10);
const students=['Alex','Emma','Noah'].map((name,i)=>({id:'demo-child-'+i,name,grade:String(7-i),main_school:{provider:'abeka'},theme:['forest','pink','ocean'][i]}));
const subjects=[
 ['abeka','Abeka Academy','https://academy.abeka.com/','graduation-cap',0,'school'],
 ['typing','Typing School','app://typing','keyboard',5,'school'],
 ['spelling','Spelling','app://spelling','spell-check',0,'school'],
 ['vocabulary','Vocabulary','app://vocabulary','book-a',0,'school'],
 ['bible','Bible','app://bible','book-open',0,'anytime'],
 ['art','Art & Coloring Studio','app://art-studio','palette',15,'anytime'],
 ['music','Music','app://music','music',0,'after_school'],
 ['audiobooks','Audiobooks','app://audiobooks','headphones',0,'after_school'],
 ['games','Family Game Room','app://games','gamepad-2',0,'after_school']
].map(([id,title,url,icon,dailyGoalMinutes,placement])=>({id,title,url,icon,dailyGoalMinutes,kind:url.startsWith('app:')?'activity':'website',isSchoolPortal:id==='abeka',isReward:placement==='after_school',accessTier:placement==='after_school'?'after_school':'school',dailyPlan:{placement,days:[0,1,2,3,4,5,6],start:placement==='after_school'?'14:00':null,end:placement==='after_school'?'18:00':null,limitMinutes:placement==='after_school'?30:null},assignments:students.map(s=>({studentId:s.id,active:true,dailyGoalMinutes}))}));
const fixture={students,schoolActivities:Object.entries(require(path.join(cloud,'services/commercial-api/cloudSchoolSubjects')).ACTIVITIES).map(([url,a])=>({url,...a})),serverTime:now,activityDate:date,
 devices:students.map((s,i)=>({id:'demo-device-'+i,student_id:s.id,computer_name:s.name+'’s computer',app_version:'1.2.305',revision:1,acknowledged_revision:1,locked:false,last_seen_at:now,recovery_configured:true,current_subject:i===0?'abeka':i===1?'spelling':'typing',current_subject_seconds:240})),
 rules:{revision:1,schedule:{enabled:true,timeZone:'America/Chicago',days:[0,1,2,3,4,5,6],start:'08:30',end:'14:00',termStart:null,termEnd:null,breaks:[],exceptions:[]},subjects},
 activity:students.flatMap((s,i)=>[['abeka',5400-i*700],['typing',300],['spelling',i===0?480:180],['vocabulary',i===0?300:60]].map(([subject_id,seconds])=>({student_id:s.id,subject_id,date_utc:date,seconds}))),
 monitoring:{date,requirements:students.flatMap((s,i)=>['spelling','vocabulary'].map(module=>({student_id:s.id,module,assigned:true,required:true,completed:i===0}))),completions:[],media:[],games:[]},
 portalProgress:students.map((s,i)=>({student_id:s.id,subject_id:'abeka',checked_at:now,courses:['Bible','Math','Language','History','Science'].map((name,n)=>({courseName:name+' '+(7-i),lessonLabel:'Lesson 26 (Today)',completed:n<3-i}))})),
 screenshotAvailability:{known:true,availableStudentIds:students.map(s=>s.id),checkedAt:now}
};
const messages=[{id:'demo-msg-1',sender:'child',body:'I finished my spelling! Can we read the next chapter together?',createdAt:now,receivedAt:now},{id:'demo-msg-2',sender:'parent',body:'Of course. Great effort today! I’ll be there after lunch.',createdAt:now,receivedAt:now},{id:'demo-msg-3',sender:'child',body:'Thanks, Mom! Can you unlock audiobooks while I draw?',createdAt:now,receivedAt:now}];
let childSetup=fs.readFileSync(path.join(cloud,'scripts/test-cloud-student-day-electron.js'),'utf8').split('await js(`')[1].split('`);')[0];
childSetup=childSetup.replaceAll('../../../renderer/','/renderer/').replace("renderDay();document.querySelector('.cloud-day-row').scrollIntoView({block:'start'});","renderDay();");
childSetup=childSetup.replace("name:'Alex',theme:'default'","name:'Alex',theme:'forest'");
const sharedHead='<script src="/renderer/lib/lucide.min.js"></script>';
function childHtml(script){return fs.readFileSync(path.join(renderer,'cloud-student.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<meta[^>]+http-equiv="Content-Security-Policy"[^>]*>/gi,'').replace(/href="css\//g,'href="/renderer/css/').replace('</head>',sharedHead+'</head>').replace('</body>','<script type="module" src="'+script+'"></script></body>');}
const gamesBridge=`const children=${JSON.stringify(students.map(s=>({...s,online:true,access:{allowed:true,remainingSeconds:1800,usedSeconds:0}})))};window.cloudPilot={onStatus(){},status:async()=>({school:{student:{id:children[0].id}},session:{}}),pause:async()=>{},onExternalGames(){},onLanGames(){},externalGames:async()=>({supported:true,games:[]}),lanGames:async()=>({supported:true,rooms:[],remainingSeconds:1800}),games:async()=>({ok:true,value:{studentId:children[0].id,deviceId:'demo-device',children,matches:[],date:'${date}',timeZone:'America/Chicago'}})};await import('/renderer/js/cloud-pilot-games.js');document.querySelectorAll('main>section').forEach(s=>{s.hidden=s.id!=='student-games-panel';s.inert=s.hidden;});document.querySelectorAll('.cloud-startup').forEach(s=>s.remove());`;
function send(res,value,type='application/json'){res.setHeader('Content-Type',type+'; charset=utf-8');res.end(type==='application/json'?JSON.stringify(value):value);}
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://127.0.0.1'),p=url.pathname;res.setHeader('Cache-Control','no-store');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; media-src 'self' blob:; frame-src 'self'; object-src 'none'; base-uri 'self'");
 if(p==='/parent'){let h=require(path.join(root,'app/guard/dashboard/generated/workspace.json')).html;h=h.replace('</head>','<link rel="stylesheet" href="/guard-admin/parent-mobile.css" media="(max-width:900px)"><link rel="stylesheet" href="/guard-admin/cloud-mobile.css"></head>');return send(res,h,'text/html');}
 if(p==='/child')return send(res,childHtml('/child-demo.js'),'text/html');
 if(p==='/child-demo.js')return send(res,childSetup,'text/javascript');
 if(p==='/games')return send(res,childHtml('/games-demo.js'),'text/html');
 if(p==='/games-demo.js')return send(res,gamesBridge,'text/javascript');
 if(p.startsWith('/guard/')||p==='/bible-api'){
 let input={};if(req.method==='POST'){let raw='';for await(const chunk of req)raw+=chunk;input=JSON.parse(raw||'{}');}
 if(p==='/guard/report/api/')return send(res,{count:0,reports:[]});
 if(req.method==='GET')return send(res,fixture);
 if(input.action==='get-setup')return send(res,{completed:true,chores:{chosen:true,enabled:true}});
 if(input.action==='connection-status')return send(res,{serverTime:now,devices:fixture.devices,students:students.map(s=>({id:s.id,name:s.name})),...fixture});
 if(input.action==='push-ticket'){res.statusCode=503;return send(res,{error:'Local screenshots have no push connection.'});}
 if(input.action==='chores')return send(res,{enabled:true,chosen:true,revision:1,items:[],history:[],students,computers:[]});
 if(input.action==='attendance-list')return send(res,{enabled:false,rows:[]});
 if(input.action==='coloring-pending')return send(res,{pending:0});
 if(input.action==='list-messages')return send(res,{studentId:input.studentId,messages,hasOlder:false,nextBefore:null});
 if(input.action==='list-groups')return send(res,{groups:[],peerEnabled:true,revision:1});
 if(input.action==='unread-messages')return send(res,{unread:[]});
 if(input.action==='daily-plan')return send(res,{rulesRevision:1,studentId:input.studentId,settings:{},features:{}});
 if(input.action==='media')return send(res,{status:200,body:{pending:0,students,settings:{}}});
 return send(res,{});
 }
 const assetRoot=p.startsWith('/renderer/')||p.startsWith('/assets/')?renderer:path.join(root,'public');
 const rel=p.startsWith('/renderer/')?p.slice('/renderer/'.length):p.slice(1);const file=path.resolve(assetRoot,rel);
 if(!file.startsWith(assetRoot+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;return send(res,{error:'Not in screenshot fixture'});}
 res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
}catch(e){console.error(e.message);res.statusCode=500;res.end('Local fixture error');}});
server.listen(43919,'127.0.0.1',()=>console.log('Fictional family screenshot studio: http://127.0.0.1:43919/parent · /child · /games'));
