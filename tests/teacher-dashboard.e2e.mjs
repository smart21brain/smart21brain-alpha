const B='http://localhost:8799';
class C{constructor(n){this.n=n;this.cookie='';}
 async req(m,p,body,form){const h={};if(this.cookie)h.Cookie=this.cookie;let b;
  if(form)b=form;else if(body!==undefined){h['Content-Type']='application/json';b=JSON.stringify(body);}
  const r=await fetch(B+p,{method:m,headers:h,body:b});const sc=r.headers.get('set-cookie');if(sc)this.cookie=sc.split(';')[0];
  let d;const ct=r.headers.get('content-type')||'';d=ct.includes('json')?await r.json():await r.arrayBuffer();return{s:r.status,d};}}
let fails=0;const ok=(c,m,x)=>{if(!c){fails++;console.log('FAIL',m,x?JSON.stringify(x).slice(0,200):'')}else console.log('ok  ',m)};
const t=new C('t'),t2=new C('t2'),s=new C('s');
const reg=(c,n,e,r)=>c.req('POST','/api/auth/register',{name:n,email:e,password:'Passw0rd!x',role:r});
console.log((await reg(t,'Amina Hassan','t1@x.com','teacher')).s,(await reg(t2,'Other Teacher','t2@x.com','teacher')).s,(await reg(s,'Halima Rashid','s1@x.com','user')).s);
// permissions
let r=await s.req('GET','/api/teacher/overview');ok(r.s===403,'student blocked from teacher API',r);
r=await s.req('POST','/api/quizzes',{title:'x',questions:[{prompt:'a',options:['1','2'],correct_index:0}]});ok(r.s===403,'student cannot create quiz',r);
// overview empty
r=await t.req('GET','/api/teacher/overview');ok(r.s===200&&r.d.published_courses===0,'overview empty',r);
// thumbnail
let f=new FormData();f.append('file',new Blob([new Uint8Array([137,80,78,71,13,10,26,10])],{type:'image/png'}),'t.png');
r=await t.req('POST','/api/teacher/thumbnail',undefined,f);ok(r.s===201&&r.d.url,'thumbnail upload',r);const thumb=r.d.url;
r=await t.req('GET',thumb);ok(r.s===200,'thumbnail served');
// course draft
r=await t.req('POST','/api/courses',{title:'Fractions Made Fun',description:'d',level:'beginner',price:0,thumbnail_url:thumb,published:false,objectives:['a','b']});ok(r.s===201,'create course',r);const cid=r.d.id;
r=await t.req('POST','/api/courses',{title:'Fractions Made Fun',published:false});ok(r.s===201&&r.d.slug!=='fractions-made-fun','duplicate title gets unique slug',r);
// draft not public
r=await s.req('GET','/api/courses');ok(r.d.courses.length===0,'draft hidden from catalog',r);
r=await t.req('GET','/api/teacher/courses');ok(r.d.courses.length===2&&r.d.courses[0].published===0,'teacher lists drafts',r);
// edit without published keeps draft
r=await t.req('PUT','/api/courses/'+cid,{title:'Fractions Made Fun!'});r=await t.req('GET','/api/teacher/courses');ok(r.d.courses.find(c=>c.id===cid).published===0,'edit keeps draft state');
// other teacher can't touch
r=await t2.req('PUT','/api/courses/'+cid,{title:'hack'});ok(r.s===403,'other teacher cannot edit',r);
// uploads
f=new FormData();f.append('title','Intro video');f.append('placements','courses');f.append('file',new Blob([new Uint8Array(2000)],{type:'video/mp4'}),'v.mp4');
r=await t.req('POST','/api/videos',undefined,f);ok(r.s===201,'teacher uploads video',r);const vid=r.d.id;
f=new FormData();f.append('title','Worksheet');f.append('file',new Blob(['%PDF-1.4 x'],{type:'application/pdf'}),'w.pdf');
r=await t.req('POST','/api/materials',undefined,f);ok(r.s===201,'teacher uploads resource',r);const mid=r.d.id;
r=await t.req('POST','/api/quizzes',{title:'Halves quiz',questions:[{prompt:'1/2+1/2?',options:['1','2'],correct_index:0}]});ok(r.s===201,'teacher creates quiz',r);const qid=r.d.id;
r=await t.req('GET','/api/teacher/content');ok(r.d.videos.length===1&&r.d.materials.length===1&&r.d.quizzes[0].question_count===1,'my content',r);
r=await t2.req('DELETE','/api/videos/'+vid);ok(r.s===403,'other teacher cannot delete my video',r);
r=await t2.req('GET','/api/teacher/content');ok(r.d.videos.length===0,'content is private to owner');
// lessons
const mk=(b)=>t.req('POST',`/api/courses/${cid}/lessons`,b);
r=await mk({title:'What is a fraction?',content_type:'text',body:'Hello'});ok(r.s===201,'text lesson',r);const l1=r.d.id;
r=await mk({title:'Watch',content_type:'video',video_id:vid});ok(r.s===201,'video lesson');
r=await mk({title:'Print it',content_type:'pdf',material_id:mid});ok(r.s===201,'pdf lesson');
r=await mk({title:'Quiz',content_type:'quiz',quiz_id:qid});ok(r.s===201,'quiz lesson');
r=await t.req('PUT',`/api/courses/${cid}`,{published:true});ok(r.s===200,'publish');
r=await s.req('GET','/api/courses');ok(r.d.courses.length===1&&r.d.courses[0].lesson_count===4&&r.d.courses[0].avg_rating===null,'published course on public catalog',r.d);
// student
r=await s.req('POST',`/api/courses/${cid}/enroll`);ok(r.s===201,'student enrolls',r);
r=await s.req('POST',`/api/lessons/${l1}/complete`);ok(r.s===200,'student completes lesson',r);
r=await s.req('POST',`/api/courses/${cid}/reviews`,{rating:5,comment:'My daughter loves it'});ok(r.s===201,'student reviews',r);
r=await s.req('POST',`/api/courses/${cid}/reviews`,{rating:4,comment:'updated'});r=await s.req('GET',`/api/courses/${cid}/reviews`);ok(r.d.summary.count===1&&r.d.summary.avg===4&&r.d.reviews[0].name==='Halima R.'&&r.d.mine.rating===4,'one review per student, updated, name abbreviated',r.d);
r=await s.req('POST',`/api/courses/${cid}/reviews`,{rating:9});ok(r.s===400,'rating validated');
r=await t.req('POST',`/api/courses/${cid}/reviews`,{rating:5});ok(r.s===403,'teacher cannot review own course',r);
r=await s.req('GET','/api/courses');ok(r.d.courses[0].avg_rating===4&&r.d.courses[0].review_count===1,'catalog shows real rating');
// teacher views
r=await t.req('GET','/api/teacher/overview');ok(r.d.enrolled_students===1&&r.d.published_courses===1&&r.d.average_rating===4&&r.d.lessons_completed===1&&r.d.new_enrollments===1&&r.d.comments_to_answer===1,'overview live numbers',r.d);
r=await t.req('GET','/api/teacher/students');ok(r.d.students[0].name==='Halima R.'&&r.d.students[0].progress_percent===25,'students + progress',r.d);
r=await t.req('GET','/api/teacher/students?attention=1');ok(r.d.students.length===0,'active student not flagged');
r=await t2.req('GET','/api/teacher/students');ok(r.d.students.length===0,'other teacher sees no students');
r=await t.req('GET','/api/teacher/reviews');const rid=r.d.reviews[0].id;ok(r.d.reviews.length===1,'teacher sees review');
r=await t2.req('POST',`/api/teacher/reviews/${rid}/reply`,{reply:'x'});ok(r.s===403,'other teacher cannot reply');
r=await t.req('POST',`/api/teacher/reviews/${rid}/reply`,{reply:'Thank you!'});ok(r.s===200,'teacher replies');
r=await s.req('GET',`/api/courses/${cid}/reviews`);ok(r.d.reviews[0].teacher_reply==='Thank you!','reply visible to students');
// announcements + assignments
r=await t.req('POST','/api/teacher/announcements',{body:'Quiz on Friday',course_id:cid});ok(r.s===201,'post announcement',r);
r=await t.req('POST','/api/teacher/announcements',{body:'Hello all'});ok(r.s===201,'post general announcement');
r=await t2.req('POST','/api/teacher/announcements',{body:'x',course_id:cid});ok(r.s===403,'cannot post to others course');
r=await s.req('GET','/api/announcements');ok(r.d.announcements.length===2,'student dashboard sees announcements',r.d);
r=await t.req('POST','/api/teacher/assignments',{course_id:cid,title:'Pizza fractions',due_date:'2026-11-30'});ok(r.s===201,'create assignment',r);
r=await s.req('GET',`/api/courses/${cid}/updates`);ok(r.d.assignments.length===1&&r.d.announcements.length===2,'course page updates for enrolled student',r.d);
const s2=new C('s2');await reg(s2,'Not Enrolled','s2@x.com','user');r=await s2.req('GET',`/api/courses/${cid}/updates`);ok(r.d.assignments.length===0,'non-enrolled sees nothing');
r=await t.req('PUT','/api/teacher/settings',{weekly_summary_email:true});ok(r.s===200,'save setting');r=await t.req('GET','/api/teacher/settings');ok(r.d.settings.weekly_summary_email===true&&r.d.settings.show_profile_to_parents===true,'settings persisted',r.d);
// delete flow
r=await t.req('DELETE','/api/videos/'+vid);ok(r.s===200,'owner deletes video');
console.log(fails?`\n${fails} FAILED`:'\nALL PASSED');
