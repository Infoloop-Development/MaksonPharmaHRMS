// @ts-nocheck
/**
 * Faithful port of the approved HTML mockup (mockup/index.html) into Vite + React.
 * The CSS is in src/styles/mockup.css (extracted verbatim).
 * The TS strict-checks are bypassed because the original is JS - this file exists
 * to render the visual reference, not to be hand-edited.
 */
import React, { useState, useMemo, useEffect } from 'react';

function useClock(){var _s=useState(new Date());var now=_s[0];var setNow=_s[1];useEffect(function(){var t=setInterval(function(){setNow(new Date());},1000);return function(){clearInterval(t);};},[]);return now;}
const DEPTS=['Confectionery','Pharma','Healthcare','Packaging','QC Lab','Machinery','Gumbase','Warehouse','Admin','HR','Accounts','Maintenance'];
const LOCS=['Surendranagar, GJ','Mandideep, MP','Gummadidala, TG','Morbi, GJ','Aurangabad, MH'];
const FN=['Rajesh','Priya','Amit','Sunita','Vijay','Meena','Kiran','Deepak','Anita','Suresh','Kavita','Manoj','Nisha','Ravi','Geeta','Sanjay','Pooja','Vikram','Rekha','Arun','Jyoti','Prakash','Lakshmi','Bharat','Sapna','Dinesh','Neha','Ramesh','Seema','Ashok','Harish','Komal','Nilesh','Bhavna','Tushar','Reena','Yogesh','Usha','Chirag','Darshana','Hitesh','Meera','Paresh','Swati','Alpesh','Divya','Gaurav','Janvi','Kunal','Manisha','Nikhil','Pallavi','Rohan','Shreya','Umesh','Vaishali','Aakash','Bhumi','Chetan','Dipika','Falguni','Gopal','Hetal','Isha','Jayesh','Krupa','Lalit','Mamta','Naresh','Poornima','Rahul','Sneha','Tarak','Urmila','Vinod','Aarti','Bhavin','Chandni','Devang','Ekta','Firoz','Gita','Hemant','Ilaben','Jagdish','Kamla','Lata','Mitesh','Nandini','Omprakash','Pankaj','Rashmi','Sachin','Tejal','Udaya','Vandana'];
const LN=['Patel','Shah','Mehta','Joshi','Sharma','Desai','Parmar','Chauhan','Trivedi','Bhatt','Solanki','Raval','Modi','Thakkar','Pandya','Vyas','Rana','Gajjar','Thakor','Makwana','Rathod','Chaudhari','Limbachiya','Vaghela','Jadeja','Barot','Dabhi','Khatri','Nayak','Suthar','Panchal','Darji','Soni','Mistry','Bhavsar','Doshi','Luhar','Vanand','Acharya','Raval','Parekh','Kothari','Jariwala','Savani','Sorathiya','Kakadiya'];
const DESIG=['Machine Operator','Line Supervisor','QC Inspector','Packaging Helper','Maintenance Tech','Production Lead','Store Keeper','Lab Technician','Forklift Operator','Electrician','Boiler Operator','Shift Incharge','Packing Operator','Mixer Operator','Syrup Maker','Wrapping Operator','Candy Maker','Quality Analyst','Safety Officer','Material Handler'];
// Compliance time shifts (fetched from settings in production)
const COMP_SHIFTS=[
  {id:'A',label:'06:00 AM - 02:00 PM (Morning)'},
  {id:'B',label:'02:00 PM - 10:00 PM (Afternoon)'},
  {id:'C',label:'10:00 PM - 06:00 AM (Night)'}
];
var compShiftLabel=function(id){var s=COMP_SHIFTS.find(function(x){return x.id===id;});return s?s.label:id;};
var BANKS=['HDFC Bank','Kotak Mahindra Bank','ICICI Bank','State Bank of India','Bank of Baroda','Punjab National Bank','Axis Bank','Union Bank of India'];
var ACCTYPES=['Savings','Current','Salary'];
var WEEKDAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
// Global date formatter: YYYY-MM-DD -> DD/MM/YYYY
var fmtD=function(d){if(!d||d==='-')return'-';var p=d.split('-');if(p.length===3)return p[2]+'/'+p[1]+'/'+p[0];return d;};
// Input validation helpers
var V={
  alpha:function(v){return v.replace(/[^a-zA-Z\s]/g,'');},
  alphaNum:function(v){return v.replace(/[^a-zA-Z0-9\s]/g,'');},
  numeric:function(v){return v.replace(/[^0-9]/g,'');},
  pan:function(v){return v.replace(/[^a-zA-Z0-9]/g,'').toUpperCase().slice(0,10);},
  aadhaar:function(v){var d=v.replace(/[^0-9]/g,'').slice(0,12);if(d.length>8)return d.slice(0,4)+' '+d.slice(4,8)+' '+d.slice(8);if(d.length>4)return d.slice(0,4)+' '+d.slice(4);return d;},
  phone:function(v){return v.replace(/[^0-9+\-\s]/g,'').slice(0,15);},
  email:function(v){return v.replace(/[^a-zA-Z0-9@._\-]/g,'').toLowerCase();},
  bankAcc:function(v){return v.replace(/[^0-9]/g,'').slice(0,18);},
  esi:function(v){return v.replace(/[^0-9]/g,'').slice(0,10);},
  cin:function(v){return v.replace(/[^a-zA-Z0-9]/g,'').toUpperCase().slice(0,21);},
  gstin:function(v){return v.replace(/[^a-zA-Z0-9]/g,'').toUpperCase().slice(0,15);},
  pf:function(v){return v.replace(/[^a-zA-Z0-9\/]/g,'').toUpperCase();},
  factoryLic:function(v){return v.replace(/[^a-zA-Z0-9\/\-]/g,'').toUpperCase();}
};
function sr(s){let x=s%2147483647;if(x<=0)x+=2147483646;return()=>{x=x*16807%2147483647;return(x-1)/2147483646;};}
// Weighted department distribution (confectionery is biggest, HR/Admin smallest)
var DEPT_WEIGHTS=[0.22,0.14,0.13,0.12,0.06,0.08,0.05,0.07,0.03,0.02,0.03,0.05];
// Location headcount weights (Surendranagar is HQ = biggest)
var LOC_WEIGHTS=[0.35,0.25,0.15,0.14,0.11];
// Inactive rates per department (HR/Admin lower turnover, Packaging higher)
var INACTIVE_RATES=[0.05,0.04,0.04,0.08,0.03,0.06,0.04,0.09,0.02,0.01,0.02,0.07];
// Department-specific absence multipliers (Warehouse/Packaging higher, Admin/HR lower)
var DEPT_ABS_MULT=[1.0,0.9,0.95,1.3,0.7,1.1,1.0,1.4,0.5,0.4,0.6,1.2];
// Department-specific late multipliers
var DEPT_LATE_MULT=[1.0,0.8,0.85,1.2,0.6,1.1,0.9,1.3,0.7,0.5,0.7,1.15];

function weightedPick(arr,weights,rVal){var cum=0;for(var i=0;i<weights.length;i++){cum+=weights[i];if(rVal<cum)return arr[i];}return arr[arr.length-1];}

var EMPS=Array.from({length:1800},function(_,i){
  var r=sr(i*7+3001);
  var dept=weightedPick(DEPTS,DEPT_WEIGHTS,r());
  var deptIdx=DEPTS.indexOf(dept);
  var loc=weightedPick(LOCS,LOC_WEIGHTS,r());
  var isInactive=r()<INACTIVE_RATES[deptIdx];
  // Day/Night split varies by dept: production depts more balanced, admin mostly day
  var dayPct=deptIdx<=7?0.55:0.88;
  var shift=r()<dayPct?'Day':'Night';
  // Designations weighted by department
  var desigPool=deptIdx<=2?[0,5,10,13,14,15,16,17]:deptIdx<=4?[2,7,9,17,18]:deptIdx<=7?[0,3,8,6,12,19]:[0,5,6,7,9];
  var desig=DESIG[desigPool[Math.floor(r()*desigPool.length)]];
  // Join dates: more recent hires in Packaging/Warehouse (high turnover)
  var baseYear=deptIdx>=3&&deptIdx<=7?18:14;
  var joinYear=Math.floor(r()*8+baseYear);
  if(joinYear>25)joinYear=25;
  return{id:'MKS'+String(i+1).padStart(4,'0'),
    name:FN[Math.floor(r()*FN.length)]+' '+LN[Math.floor(r()*LN.length)],
    dept:dept,loc:loc,desig:desig,shift:shift,
    bioId:'BIO'+String(i+1).padStart(3,'0'),
    altShift:COMP_SHIFTS[Math.floor(r()*COMP_SHIFTS.length)].id,
    pan:'ABCPD'+String(Math.floor(r()*9000+1000))+''+String.fromCharCode(65+Math.floor(r()*26)),
    aadhaar:String(Math.floor(r()*9000+1000))+' '+String(Math.floor(r()*9000+1000))+' '+String(Math.floor(r()*9000+1000)),
    bankHolder:FN[Math.floor(r()*FN.length)]+' '+LN[Math.floor(r()*LN.length)],
    bankAcc:String(Math.floor(r()*90000000+10000000))+String(Math.floor(r()*900000+100000)),
    accType:ACCTYPES[Math.floor(r()*ACCTYPES.length)],
    bankName:BANKS[Math.floor(r()*BANKS.length)],
    pf:'GJ/SUR/'+String(Math.floor(r()*90000+10000))+'/'+String(Math.floor(r()*900+100)),
    esi:String(Math.floor(r()*9000000000+1000000000)),
    status:isInactive?'Inactive':'Active',
    weeklyOff:deptIdx<=2?['Sunday']:(r()<0.7?['Sunday']:(r()<0.4?['Saturday','Sunday']:(r()<0.6?['Sunday']:['Alternate Sunday']))),
    join:'20'+joinYear+'-'+String(Math.floor(r()*12+1)).padStart(2,'0')+'-'+String(Math.floor(r()*28+1)).padStart(2,'0')};
});

// Day-of-week absence & late base rates (realistic Indian factory pattern)
// Mon: post-weekend, Tue-Thu: best, Fri: pre-weekend dip, Sat: half-day culture, Sun: skeleton
var ABS_RATES=[0.09,0.065,0.055,0.07,0.11,0.16,0.22];
var LATE_RATES=[0.15,0.10,0.09,0.11,0.14,0.07,0.05];

function genAtt(emps,ds,dayIdx){
  var baseAbsRate=typeof dayIdx==='number'?ABS_RATES[dayIdx]:0.10;
  var baseLateRate=typeof dayIdx==='number'?LATE_RATES[dayIdx]:0.12;
  var dayName=typeof dayIdx==='number'?WEEK_LABELS_FULL[dayIdx]:null;
  return emps.filter(function(e){return e.status==='Active';}).map(function(e){
    var r=sr(e.id.charCodeAt(4)*731+parseInt(ds.replace(/-/g,''))*13);
    // Determine day type based on weekly off
    var empWeeklyOff=Array.isArray(e.weeklyOff)?e.weeklyOff:[e.weeklyOff||'Sunday'];
    var isWeeklyOff=dayName&&empWeeklyOff.indexOf(dayName)>=0;
    if(isWeeklyOff)return{id:e.id,name:e.name,dept:e.dept,loc:e.loc,desig:e.desig,shift:e.shift,status:e.status,join:e.join,date:ds,st:'Weekly Off',ein:null,eout:null,hrs:0,realHrs:0,compHrs:0,otHrs:0,brkMin:0,dayType:'Weekly Off',cin:null,cout:null};
    var deptIdx=DEPTS.indexOf(e.dept);
    var empAbsRate=baseAbsRate*DEPT_ABS_MULT[deptIdx]*(0.6+r()*0.8);
    var isAbsent=r()<empAbsRate;
    if(isAbsent)return{id:e.id,name:e.name,dept:e.dept,loc:e.loc,desig:e.desig,shift:e.shift,status:e.status,join:e.join,date:ds,st:'Absent',ein:null,eout:null,hrs:0,realHrs:0,compHrs:0,otHrs:0,brkMin:0,dayType:'Working',cin:null,cout:null};
    var isD=e.shift==='Day';
    var empLateRate=baseLateRate*DEPT_LATE_MULT[deptIdx]*(0.5+r()*1.0);
    var isLate=r()<empLateRate;
    var bH,bM,bS;
    if(isD){
      if(isLate){bH=9+Math.floor(r()*2);bM=Math.floor(r()*45)+15;}
      else{bH=6+Math.floor(r()*3);bM=Math.floor(r()*55);}
      bS=Math.floor(r()*60);
    }else{
      if(isLate){bH=20+Math.floor(r()*2);bM=Math.floor(r()*40)+20;}
      else{bH=18+Math.floor(r()*2);bM=Math.floor(r()*50);}
      bS=Math.floor(r()*60);
    }
    var shiftLen=9.5+r()*2.0;
    var xH=bH+Math.floor(shiftLen);
    var xM=Math.floor((shiftLen%1)*60);
    var xS=Math.floor(r()*60);
    // Hours decomposition: gross = exit-entry, net = gross - break, ot = net - standard(9.5)
    var brkMin=30;
    var grossHrs=shiftLen;
    var netHrs=grossHrs-(brkMin/60);
    var stdHrs=9.5;
    var compHrs=Math.min(netHrs,stdHrs);
    var otHrs=Math.max(0,netHrs-stdHrs);
    var hrs=netHrs.toFixed(1);
    var fmt=function(h,m,s){var hh=((h%24)+24)%24;var ap=hh>=12?'PM':'AM';var dd=hh>12?hh-12:(hh||12);return String(dd).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')+' '+ap;};
    var pad2=function(n){return String(Math.abs(n)%100).padStart(2,'0');};
    var cin,cout;
    if(isD){
      cin=pad2(bH)+':'+pad2(bM)+':'+pad2(bS);
      var fH=bH+8;var fM=Math.floor(r()*18)-5+bM;var fS=Math.floor(r()*60);
      var aM=((fM%60)+60)%60;var aH=fH+Math.floor(fM/60);
      cout=pad2(aH)+':'+pad2(aM)+':'+pad2(fS);
    }else{
      var axH=((xH%24)+24)%24;
      cout=pad2(axH)+':'+pad2(xM)+':'+pad2(xS);
      var fH2=axH-8+24;var fM2=Math.floor(r()*15)-5+xM;var fS2=Math.floor(r()*60);
      var aM2=((fM2%60)+60)%60;var aH2=((fH2+Math.floor(fM2/60))%24+24)%24;
      cin=pad2(aH2)+':'+pad2(aM2)+':'+pad2(fS2);
    }
    return{id:e.id,name:e.name,dept:e.dept,loc:e.loc,desig:e.desig,shift:e.shift,status:e.status,join:e.join,date:ds,st:'Present',ein:fmt(bH,bM,bS),eout:fmt(((xH%24)+24)%24,xM,xS),hrs:hrs,realHrs:netHrs.toFixed(1),compHrs:compHrs.toFixed(1),otHrs:otHrs.toFixed(1),brkMin:brkMin,dayType:'Working',cin:cin,cout:cout};
  });
}
const WEEK_DATES=['2026-03-14','2026-03-15','2026-03-16','2026-03-17','2026-03-18','2026-03-19','2026-03-20'];
const WEEK_LABELS=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const WEEK_LABELS_FULL=['Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday','Friday'];
const WEEK_ATT=WEEK_DATES.map(function(d,i){return genAtt(EMPS,d,i);});
const TODAY_IDX=6;
const ATT=WEEK_ATT[TODAY_IDX];
var ACT=EMPS.filter(function(e){return e.status==='Active';}).length;
var COMPANY_NAME='Makson Group';
const DEVS=[{id:'DEV-001',name:'Main Gate - Entry',model:'eSSL X990',loc:'Surendranagar, GJ',on:true,ping:'2 min ago',emp:420},{id:'DEV-002',name:'Main Gate - Exit',model:'eSSL X990',loc:'Surendranagar, GJ',on:true,ping:'1 min ago',emp:420},{id:'DEV-003',name:'Unit 2',model:'ZKTeco uFace 602',loc:'Surendranagar, GJ',on:true,ping:'3 min ago',emp:310},{id:'DEV-004',name:'Pharma Block',model:'Matrix COSEC ARGO',loc:'Mandideep, MP',on:true,ping:'1 min ago',emp:380},{id:'DEV-005',name:'Healthcare Unit',model:'eSSL K30 Pro',loc:'Mandideep, MP',on:true,ping:'4 min ago',emp:245},{id:'DEV-006',name:'Machinery Div',model:'ZKTeco SpeedFace',loc:'Gummadidala, TG',on:false,ping:'47 min ago',emp:190},{id:'DEV-007',name:'Tiles Factory',model:'eSSL eFace990',loc:'Morbi, GJ',on:true,ping:'2 min ago',emp:160},{id:'DEV-008',name:'Warehouse A',model:'eSSL X990',loc:'Surendranagar, GJ',on:true,ping:'5 min ago',emp:95},{id:'DEV-009',name:'Admin Bldg',model:'Matrix COSEC VEGA',loc:'Aurangabad, MH',on:true,ping:'1 min ago',emp:75}];
const Ic={dash:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,user:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/></svg>,clk:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,file:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,cpu:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/></svg>,gear:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,out:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,dl:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,ok:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg>,adj:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v18"/><path d="M5 8l7-5 7 5"/><path d="M3 17h4v4H3z"/><path d="M17 17h4v4h-4z"/></svg>};
function useToast(){const[t,setT]=useState(null);const show=(m,ty)=>{setT({m,ty});setTimeout(()=>setT(null),2500);};return[t,show];}
function Toast({d}){if(!d)return null;return<div className={'toast'+(d.ty==='success'?' success':'')}>{d.ty==='success'&&Ic.ok}{d.m}</div>;}
function Modal({title,onClose,children}){return<div className="modal-overlay" onClick={onClose}><div className="modal fade-in" onClick={e=>e.stopPropagation()}><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}><h2 style={{margin:0}}>{title}</h2><button className="btn btn-outline btn-sm" onClick={onClose}>X</button></div>{children}</div></div>;}
function Login({onLogin}){const[u,setU]=useState('');const go=()=>onLogin(u.toLowerCase().includes('compliance')?'compliance':'internal');return<div className="login-wrapper"><div className="login-bg"></div><div className="login-card fade-in"><div className="logo">Makson Group of Companies</div><h1>Attendance Management</h1><p className="subtitle">Sign in to continue</p><div className="form-group"><label>Username</label><input value={u} onChange={e=>setU(e.target.value)} placeholder="Enter username" onKeyDown={e=>e.key==='Enter'&&go()}/></div><div className="form-group"><label>Password</label><input type="password" placeholder="Enter password" onKeyDown={e=>e.key==='Enter'&&go()}/></div><button className="btn-login" onClick={go}>Sign In</button><div className="powered">Powered by <a href="https://www.infoloop.co" target="_blank">Infoloop Technologies</a></div><div className="demo-hint"><strong>Demo:</strong> Type <code>hr.admin</code> for internal data or <code>compliance</code> for compliant 8-hour data.</div></div></div>;}
function Side({pg,setPg,onLogout,isOpen,onClose,compName,logo}){const nav=[{id:'dashboard',l:'Dashboard',i:Ic.dash},{id:'employees',l:'Employees',i:Ic.user},{id:'attendance',l:'Attendance Log',i:Ic.clk},{id:'reports',l:'Reports',i:Ic.file},{id:'adjustments',l:'Adjustments',i:Ic.adj},{id:'devices',l:'Devices',i:Ic.cpu},{id:'settings',l:'Settings',i:Ic.gear}];return(
<div>
<div className={'sidebar-overlay'+(isOpen?' show':'')} onClick={onClose}></div>
<div className={'sidebar'+(isOpen?' open':'')}>
<div className="brand">{logo?<img src={logo} alt="Logo" style={{width:36,height:36,borderRadius:8,objectFit:'contain',background:'#fff',padding:2,marginBottom:6}}/>:null}<span>Attendance System</span><h2>{compName||'Makson Group'}</h2></div>
<nav><div className="nav-section">Navigation</div>{nav.map(n=><div key={n.id} className={'nav-item'+(pg===n.id?' active':'')} onClick={()=>{setPg(n.id);onClose();}}>{n.i}<span>{n.l}</span></div>)}</nav>
<div className="sidebar-footer"><div className="user-info"><div className="avatar">PP</div><div><div className="uname">Priya Patel</div><div className="urole">HR Manager</div></div></div>
<div style={{marginTop:8}}><div className="nav-item" onClick={()=>{onLogout();onClose();}} style={{color:'rgba(255,255,255,.5)',fontSize:12}}>{Ic.out}<span>Sign Out</span></div></div></div>
</div>
</div>);}

// ======================== INTERACTIVE DASHBOARD ========================
function Dash({cr,toast,onViewEmployee}){
  const c=cr==='compliance';
  const[tile,setTile]=useState(null);
  const[selDay,setSelDay]=useState(TODAY_IDX);
  const[search,setSearch]=useState('');
  const[deptF,setDeptF]=useState('All');
  const[shiftF,setShiftF]=useState('All');
  const[sortCol,setSortCol]=useState(null);
  const[sortDir,setSortDir]=useState('asc');
  const[statusF,setStatusF]=useState('All');
  const[donutHover,setDonutHover]=useState(null);

  const dayAtt=WEEK_ATT[selDay];
  const dayPres=dayAtt.filter(a=>a.st==='Present').length;
  const dayAbs=dayAtt.filter(a=>a.st==='Absent').length;
  const dayLate=dayAtt.filter(a=>a.st==='Present'&&a.ein&&parseInt(a.ein)>9).length;
  const weekStats=WEEK_ATT.map(wa=>({pres:wa.filter(a=>a.st==='Present').length,abs:wa.filter(a=>a.st==='Absent').length,late:wa.filter(a=>a.st==='Present'&&a.ein&&parseInt(a.ein)>9).length}));

  const clickTile=(t)=>{
    if(tile===t){setTile(null);setStatusF('All');}
    else{setTile(t);if(t==='present')setStatusF('Present');else if(t==='absent')setStatusF('Absent');else if(t==='late')setStatusF('Late');else setStatusF('All');}
  };
  const clickDonut=(seg)=>{
    if(seg==='reset'){setStatusF('All');setTile(null);}
    else if(seg==='present'){if(statusF==='Present'){setStatusF('All');setTile(null);}else{setStatusF('Present');setTile('present');}}
    else if(seg==='absent'){if(statusF==='Absent'){setStatusF('All');setTile(null);}else{setStatusF('Absent');setTile('absent');}}
    else if(seg==='late'){if(statusF==='Late'){setStatusF('All');setTile(null);}else{setStatusF('Late');setTile('late');}}
  };

  const filtered=useMemo(()=>{
    let d=dayAtt;
    if(statusF==='Present')d=d.filter(a=>a.st==='Present');
    else if(statusF==='Absent')d=d.filter(a=>a.st==='Absent');
    else if(statusF==='Late')d=d.filter(a=>a.st==='Present'&&a.ein&&parseInt(a.ein)>9);
    if(deptF!=='All')d=d.filter(a=>a.dept===deptF);
    if(shiftF!=='All')d=d.filter(a=>a.shift===shiftF);
    if(search)d=d.filter(a=>a.name.toLowerCase().includes(search.toLowerCase())||a.id.toLowerCase().includes(search.toLowerCase()));
    if(sortCol){d=[...d].sort((a,b)=>{let va=a[sortCol]||'',vb=b[sortCol]||'';if(sortCol==='hrs'){va=parseFloat(va)||0;vb=parseFloat(vb)||0;}if(typeof va==='number')return sortDir==='asc'?va-vb:vb-va;return sortDir==='asc'?String(va).localeCompare(String(vb)):String(vb).localeCompare(String(va));});}
    return d;
  },[dayAtt,statusF,deptF,shiftF,search,sortCol,sortDir]);

  const toggleSort=(col)=>{if(sortCol===col)setSortDir(d=>d==='asc'?'desc':'asc');else{setSortCol(col);setSortDir('asc');}};
  const arrow=(col)=>sortCol===col?(sortDir==='asc'?'\u25B2':'\u25BC'):'\u25B4';

  const resetAll=()=>{setTile(null);setStatusF('All');setDeptF('All');setShiftF('All');setSearch('');setSortCol(null);setSelDay(TODAY_IDX);setDonutHover(null);};
  const hasFilters=statusF!=='All'||deptF!=='All'||shiftF!=='All'||search;
  const isModified=hasFilters||selDay!==TODAY_IDX||tile!==null||sortCol!==null;

  const total=dayPres+dayAbs;

  // Bar chart metric based on tile
  const barMetric=tile==='absent'?'abs':tile==='late'?'late':'pres';
  const barColor=tile==='absent'?'var(--red)':tile==='late'?'var(--amber)':'var(--primary)';
  const barLabel=tile==='absent'?'Absent':tile==='late'?'Late':'Present';
  const barMax=Math.max(...weekStats.map(ws=>ws[barMetric]));

  // Donut: reacts to active filter
  // Late is a SUBSET of Present, so donut shows: Present(non-late) + Late + Absent
  const onTimePres=dayPres-dayLate; // present and NOT late
  const presNonLatePct=total>0?Math.round(onTimePres/total*100):0;
  const latePct=total>0?Math.round(dayLate/total*100):0;
  const absPct=total>0?Math.round(dayAbs/total*100):0;
  const presPct=total>0?Math.round(dayPres/total*100):0;
  // Build gradient based on filter state
  let donutGrad,donutCenter,donutSub;
  if(statusF==='Present'){
    const p=total>0?Math.round(dayPres/ACT*100):0;
    donutGrad='conic-gradient(#4a8c1a 0% '+p+'%, var(--border) '+p+'% 100%)';
    donutCenter=dayPres;donutSub='Present';
  }else if(statusF==='Absent'){
    const p=total>0?Math.round(dayAbs/ACT*100):0;
    donutGrad='conic-gradient(#c41f1f 0% '+p+'%, var(--border) '+p+'% 100%)';
    donutCenter=dayAbs;donutSub='Absent';
  }else if(statusF==='Late'){
    const lp=total>0?Math.round(dayLate/ACT*100):0;
    donutGrad='conic-gradient(var(--amber) 0% '+lp+'%, var(--border) '+lp+'% 100%)';
    donutCenter=dayLate;donutSub='Late';
  }else if(donutHover==='present'){
    donutGrad='conic-gradient(#4a8c1a 0% '+presPct+'%, var(--border) '+presPct+'% 100%)';
    donutCenter=dayPres;donutSub='Present';
  }else if(donutHover==='absent'){
    donutGrad='conic-gradient(#c41f1f 0% '+absPct+'%, var(--border) '+absPct+'% 100%)';
    donutCenter=dayAbs;donutSub='Absent';
  }else if(donutHover==='late'){
    const lp=total>0?Math.round(dayLate/ACT*100):0;
    donutGrad='conic-gradient(var(--amber) 0% '+lp+'%, var(--border) '+lp+'% 100%)';
    donutCenter=dayLate;donutSub='Late';
  }else{
    // DEFAULT: 3-segment donut: Green(on-time) + Amber(late) + Red(absent)
    donutGrad='conic-gradient(var(--green) 0% '+presNonLatePct+'%, var(--amber) '+presNonLatePct+'% '+(presNonLatePct+latePct)+'%, var(--red) '+(presNonLatePct+latePct)+'% '+(presNonLatePct+latePct+absPct)+'%, var(--border) '+(presNonLatePct+latePct+absPct)+'% 100%)';
    donutCenter=presPct+'%';donutSub='Present %';
  }
  const isDonutFiltered=statusF==='Present'||statusF==='Absent'||statusF==='Late'||donutHover;

  return<div className="fade-in">
    {isModified&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,padding:'10px 16px',background:'var(--primary-bg)',borderRadius:8,border:'1px solid #c5cae9'}}>
      <span style={{fontSize:13,color:'var(--primary)',fontWeight:500}}>Viewing: <strong>{WEEK_LABELS[selDay]} ({WEEK_DATES[selDay]})</strong>{statusF!=='All'&&<span> / {statusF}</span>}{deptF!=='All'&&<span> / {deptF}</span>}{shiftF!=='All'&&<span> / {shiftF} Shift</span>}{search&&<span> / "{search}"</span>}{sortCol&&<span> / sorted by {sortCol}</span>}{barMetric!=='pres'&&<span> / bars showing {barLabel}</span>}</span>
      <button className="btn btn-primary btn-sm" onClick={resetAll}>Reset to Default View</button>
    </div>}

    <div className="stats-grid">
      <div className={'stat-card c1'+(tile==='total'?' selected':'')} onClick={()=>clickTile('total')}><div className="click-hint">Click to filter</div><div className="label">Total Active</div><div className="value">{ACT.toLocaleString()}</div><div className="sub">across {LOCS.length} locations</div></div>
      <div className={'stat-card c2'+(tile==='present'?' selected':'')} onClick={()=>clickTile('present')}><div className="click-hint">Filters table + chart</div><div className="label">Present {WEEK_LABELS[selDay]}</div><div className="value">{dayPres.toLocaleString()}</div><div className="sub">{(dayPres/ACT*100).toFixed(1)}% attendance</div></div>
      <div className={'stat-card c3'+(tile==='absent'?' selected':'')} onClick={()=>clickTile('absent')}><div className="click-hint">Filters table + chart</div><div className="label">Absent {WEEK_LABELS[selDay]}</div><div className="value">{dayAbs}</div><div className="sub">{(dayAbs/ACT*100).toFixed(1)}% absence</div></div>
      <div className={'stat-card c4'+(tile==='late'?' selected':'')} onClick={()=>clickTile('late')}><div className="click-hint">Filters table + chart</div><div className="label">{c?'Avg Hours':'Late Arrivals'}</div><div className="value">{c?'8.0':dayLate}</div><div className="sub">{c?'standard hours':'after shift start'}</div></div>
    </div>

    <div className="chart-row">
      <div className="chart-card">
        <h3>Weekly {barLabel} Trend</h3>
        <div className="chart-sub">Click tile above to switch metric. Click bar to select day.</div>
        <div className="bar-chart">
          {weekStats.map((ws,i)=>{
            const val=ws[barMetric];
            const pct=barMax>0?Math.round(val/barMax*100):0;
            const isActive=selDay===i;
            return<div className={'bar-col'+(isActive?' active-bar':'')} key={i} onClick={()=>setSelDay(i)}>
              <div className="bar-pct">{val}</div>
              <div className="bar-inner" style={{height:Math.max(pct*1.7,6)+'px',background:isActive?barColor:'#B0BFD8'}}></div>
              <div className="bar-label">{WEEK_LABELS[i]}</div>
            </div>;
          })}
        </div>
      </div>
      <div className="chart-card">
        <h3>{WEEK_LABELS[selDay]}'s Breakdown</h3>
        <div className="chart-sub">Click segments or legend to filter</div>
        <div className="donut-wrap">
          <div style={{position:'relative',width:120,height:120,cursor:'pointer'}} onClick={()=>clickDonut(statusF==='Present'?'reset':statusF==='Absent'?'reset':'present')} onMouseEnter={()=>setDonutHover('present')} onMouseLeave={()=>setDonutHover(null)}>
            <div style={{width:120,height:120,borderRadius:'50%',background:donutGrad,transition:'transform .2s',transform:donutHover?'scale(1.05)':''}}>
            </div>
            <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',width:76,height:76,borderRadius:'50%',background:'var(--surface)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
              <div style={{fontSize:isDonutFiltered?18:22,fontWeight:700,color:'var(--text)',lineHeight:1.2,transition:'font-size .2s'}}>{donutCenter}</div>
              <div style={{fontSize:9,color:'var(--text3)'}}>{donutSub}</div>
            </div>
          </div>
          <div className="legend">
            <div className={'legend-item'+(statusF==='Present'?' active-legend':'')} onClick={()=>clickDonut('present')} onMouseEnter={()=>setDonutHover('present')} onMouseLeave={()=>setDonutHover(null)}><div className="legend-dot" style={{background:'var(--green)'}}></div>Present ({dayPres})</div>
            <div className={'legend-item'+(statusF==='Absent'?' active-legend':'')} onClick={()=>clickDonut('absent')} onMouseEnter={()=>setDonutHover('absent')} onMouseLeave={()=>setDonutHover(null)}><div className="legend-dot" style={{background:'var(--red)'}}></div>Absent ({dayAbs})</div>
            {!c&&<div className={'legend-item'+(statusF==='Late'?' selected':'')} onMouseEnter={()=>setDonutHover('late')} onMouseLeave={()=>setDonutHover(null)} onClick={()=>clickDonut('late')}><div className="legend-dot" style={{background:'var(--amber)'}}></div>Late ({dayLate})</div>}
          </div>
        </div>
      </div>
    </div>

    <div className="table-card">
      <div className="table-header">
        <h3>Attendance - {WEEK_DATES[selDay]} ({WEEK_LABELS[selDay]})</h3>
        <div className="table-filters">
          <input placeholder="Search name or ID..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:170}}/>
          <select value={deptF} onChange={e=>setDeptF(e.target.value)}><option value="All">All Depts</option>{DEPTS.map(d=><option key={d}>{d}</option>)}</select>
          <select value={shiftF} onChange={e=>setShiftF(e.target.value)}><option value="All">All Time Shifts</option><option value="Day">Day (6AM-6PM)</option><option value="Night">Night (6PM-6AM)</option></select>
          <select value={statusF} onChange={e=>{setStatusF(e.target.value);if(e.target.value==='Late')setTile('late');else if(e.target.value==='Present')setTile('present');else if(e.target.value==='Absent')setTile('absent');else setTile(null);}}><option value="All">All Status</option><option value="Present">Present</option><option value="Absent">Absent</option><option value="Late">Late</option></select>
          <button className="btn btn-green" onClick={()=>toast('Attendance_'+WEEK_DATES[selDay]+'.xlsx downloaded','success')}>{Ic.dl} Export</button>
        </div>
      </div>
      <div style={{fontSize:11,color:'var(--text3)',padding:'6px 20px',background:'var(--surface2)',borderBottom:'1px solid var(--border)'}}>Click employee name to view full profile and attendance history</div>
      <div className="tbl-scroll" style={{maxHeight:380}}>
      <table>
        <thead><tr>
          <th className={sortCol==='name'?'sorted':''} onClick={()=>toggleSort('name')}>Employee <span className="sort-arrow">{arrow('name')}</span></th>
          <th className={sortCol==='id'?'sorted':''} onClick={()=>toggleSort('id')}>ID <span className="sort-arrow">{arrow('id')}</span></th>
          <th className={sortCol==='dept'?'sorted':''} onClick={()=>toggleSort('dept')}>Department <span className="sort-arrow">{arrow('dept')}</span></th>
          <th className={sortCol==='shift'?'sorted':''} onClick={()=>toggleSort('shift')}>Shift <span className="sort-arrow">{arrow('shift')}</span></th>
          <th>Entry</th><th>Exit</th>
          <th className={sortCol==='hrs'?'sorted':''} onClick={()=>toggleSort('hrs')}>Hours <span className="sort-arrow">{arrow('hrs')}</span></th>
          <th className={sortCol==='st'?'sorted':''} onClick={()=>toggleSort('st')}>Status <span className="sort-arrow">{arrow('st')}</span></th>
        </tr></thead>
        <tbody>{filtered.slice(0,50).map((a,i)=><tr key={i}>
          <td className="emp-name emp-link" onClick={function(){var emp=EMPS.find(function(e){return e.id===a.id;});if(emp&&onViewEmployee)onViewEmployee(emp);}}>{a.name}</td>
          <td className="mono" style={{fontSize:11}}>{a.id}</td>
          <td>{a.dept}</td>
          <td><span className={'badge '+(a.shift==='Day'?'blue':'amber')}>{a.shift}</span></td>
          <td className="time">{a.st==='Present'?(c?a.cin:a.ein):'-'}</td>
          <td className="time">{a.st==='Present'?(c?a.cout:a.eout):'-'}</td>
          <td className="time">{a.st==='Present'?(c?'8.0':a.hrs):'-'}</td>
          <td><span className={'badge '+(a.st==='Present'?'green':'red')}>{a.st}</span></td>
        </tr>)}</tbody>
      </table></div>
      <div className="table-footer">
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <span>Showing {Math.min(50,filtered.length)} of {filtered.length}</span>
          {statusF!=='All'&&<span className="active-filter-tag" onClick={()=>{setStatusF('All');setTile(null);}}>{statusF} X</span>}
          {deptF!=='All'&&<span className="active-filter-tag" onClick={()=>setDeptF('All')}>{deptF} X</span>}
          {shiftF!=='All'&&<span className="active-filter-tag" onClick={()=>setShiftF('All')}>{shiftF} Shift X</span>}
          {hasFilters&&<span className="active-filter-tag" onClick={resetAll}>Clear all X</span>}
        </div>
        <span>{WEEK_DATES[selDay]}</span>
      </div>
    </div>
  </div>;
}

// ======================== OTHER PAGES (unchanged logic) ========================
function Emps({toast,initialEmployee,onClearInitial}){const[s,setS]=useState('');const[d,setD]=useState('All');const[lo,setLo]=useState('All');const[sel,setSel]=useState(initialEmployee||null);const[modal,setModal]=useState(false);const[tile,setTile]=useState(null);const[statusF,setStatusF]=useState('All');const[shiftF,setShiftF]=useState('All');const[sc,setSc]=useState(null);const[sd,setSd]=useState('asc');
var _refresh=useState(0);var refresh=_refresh[0];var setRefresh=_refresh[1];
// Form state
var _fn=useState('');var fn=_fn[0];var setFn=_fn[1];
var _fDept=useState(DEPTS[0]);var fDept=_fDept[0];var setFDept=_fDept[1];
var _fLoc=useState(LOCS[0]);var fLoc=_fLoc[0];var setFLoc=_fLoc[1];
var _fDesig=useState(DESIG[0]);var fDesig=_fDesig[0];var setFDesig=_fDesig[1];
var _fBio=useState('');var fBio=_fBio[0];var setFBio=_fBio[1];
var _fShift=useState('Day');var fShift=_fShift[0];var setFShift=_fShift[1];
var _fAlt=useState('A');var fAlt=_fAlt[0];var setFAlt=_fAlt[1];
var _fWeekly=useState(['Sunday']);var fWeekly=_fWeekly[0];var setFWeekly=_fWeekly[1];
var _fPan=useState('');var fPan=_fPan[0];var setFPan=_fPan[1];
var _fAadh=useState('');var fAadh=_fAadh[0];var setFAadh=_fAadh[1];
var _fBankN=useState('');var fBankN=_fBankN[0];var setFBankN=_fBankN[1];
var _fBankAcc=useState('');var fBankAcc=_fBankAcc[0];var setFBankAcc=_fBankAcc[1];
var _fAccT=useState('Savings');var fAccT=_fAccT[0];var setFAccT=_fAccT[1];
var _fBank=useState(BANKS[0]);var fBank=_fBank[0];var setFBank=_fBank[1];
var _fPf=useState('');var fPf=_fPf[0];var setFPf=_fPf[1];
var _fEsi=useState('');var fEsi=_fEsi[0];var setFEsi=_fEsi[1];

var resetForm=function(){setFn('');setFDept(DEPTS[0]);setFLoc(LOCS[0]);setFDesig(DESIG[0]);setFBio('');setFShift('Day');setFAlt('A');setFWeekly(['Sunday']);setFPan('');setFAadh('');setFBankN('');setFBankAcc('');setFAccT('Savings');setFBank(BANKS[0]);setFPf('');setFEsi('');};
var addEmployee=function(){
  if(!fn.trim()){toast('Please enter employee name','error');return;}
  var newId='MKS'+String(EMPS.length+1).padStart(4,'0');
  var newEmp={id:newId,name:fn.trim(),dept:fDept,loc:fLoc,desig:fDesig,shift:fShift,bioId:fBio||'-',altShift:fAlt,weeklyOff:fWeekly,status:'Active',join:new Date().toISOString().split('T')[0],pan:fPan||'-',aadhaar:fAadh||'-',bankHolder:fBankN||fn.trim(),bankAcc:fBankAcc||'-',accType:fAccT,bankName:fBank,pf:fPf||'-',esi:fEsi||'-'};
  EMPS.unshift(newEmp);
  ACT=EMPS.filter(function(e){return e.status==='Active';}).length;
  setModal(false);resetForm();setRefresh(function(x){return x+1;});
  toast('Employee '+fn.trim()+' ('+newId+') added successfully','success');
};
const INACT=EMPS.length-ACT;const DAY_COUNT=EMPS.filter(e=>e.status==='Active'&&e.shift==='Day').length;const NIGHT_COUNT=EMPS.filter(e=>e.status==='Active'&&e.shift==='Night').length;
const clickTile=t=>{if(tile===t){setTile(null);setStatusF('All');setShiftF('All');}else{setTile(t);if(t==='active'){setStatusF('Active');setShiftF('All');}else if(t==='inactive'){setStatusF('Inactive');setShiftF('All');}else if(t==='day'){setShiftF('Day');setStatusF('Active');}else if(t==='night'){setShiftF('Night');setStatusF('Active');}else{setStatusF('All');setShiftF('All');}}};
const resetAll=()=>{setTile(null);setStatusF('All');setShiftF('All');setS('');setD('All');setLo('All');setSc(null);};
const hasFilters=statusF!=='All'||shiftF!=='All'||d!=='All'||lo!=='All'||s;
const isModified=hasFilters||tile!==null||sc!==null;
const ts=col=>{if(sc===col)setSd(x=>x==='asc'?'desc':'asc');else{setSc(col);setSd('asc');}};
const ar=col=>sc===col?(sd==='asc'?'\u25B2':'\u25BC'):'\u25B4';
const fil=useMemo(()=>{let r=EMPS;if(statusF!=='All')r=r.filter(e=>e.status===statusF);if(shiftF!=='All')r=r.filter(e=>e.shift===shiftF);if(d!=='All')r=r.filter(e=>e.dept===d);if(lo!=='All')r=r.filter(e=>e.loc===lo);if(s)r=r.filter(e=>e.name.toLowerCase().includes(s.toLowerCase())||e.id.toLowerCase().includes(s.toLowerCase()));if(sc)r=[...r].sort((a,b)=>{let va=a[sc]||'',vb=b[sc]||'';return sd==='asc'?String(va).localeCompare(String(vb)):String(vb).localeCompare(String(va));});return r;},[s,d,lo,statusF,shiftF,sc,sd,refresh]);
var _attDays=useState(7);var attDays=_attDays[0];var setAttDays=_attDays[1];
var _editing=useState(false);var editing=_editing[0];var setEditing=_editing[1];
var _editData=useState({});var editData=_editData[0];var setEditData=_editData[1];
var startEdit=function(){setEditData({name:sel.name,dept:sel.dept,desig:sel.desig,loc:sel.loc,shift:sel.shift,altShift:sel.altShift,weeklyOff:Array.isArray(sel.weeklyOff)?sel.weeklyOff.slice():[sel.weeklyOff||'Sunday'],status:sel.status,bioId:sel.bioId||'',pan:sel.pan||'',aadhaar:sel.aadhaar||'',bankHolder:sel.bankHolder||'',bankAcc:sel.bankAcc||'',accType:sel.accType||'Savings',bankName:sel.bankName||BANKS[0],pf:sel.pf||'',esi:sel.esi||''});setEditing(true);};
var cancelEdit=function(){setEditing(false);setEditData({});};
var saveEdit=function(){
  if(!editData.name||!editData.name.trim()){toast('Name is required','error');return;}
  var idx=EMPS.findIndex(function(e){return e.id===sel.id;});
  if(idx>=0){Object.assign(EMPS[idx],editData);Object.assign(sel,editData);ACT=EMPS.filter(function(e){return e.status==='Active';}).length;}
  setEditing(false);setEditData({});setRefresh(function(x){return x+1;});
  toast(sel.name+' updated successfully','success');
};
var ed=function(key,val){setEditData(function(p){var n=Object.assign({},p);n[key]=val;return n;});};

if(sel)return<div className="fade-in">
{/* EDIT MODAL */}
{editing&&<Modal title={'Edit Employee - '+sel.id} onClose={cancelEdit}>
<div style={{display:'flex',gap:12}}><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Full Name</label><span className="tip-icon" data-tip="Employee's full legal name as it appears on official documents.">i</span></div><input value={editData.name||''} onChange={function(e){ed('name',V.alpha(e.target.value));}} placeholder="Full Name"/></div><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Status</label><span className="tip-icon" data-tip="Current employment status. Changing to Inactive will hide from active employee reports.">i</span></div><select value={editData.status||'Active'} onChange={function(e){ed('status',e.target.value);}}><option>Active</option><option>Inactive</option><option>On Leave</option><option>Terminated</option></select></div></div>
<div style={{display:'flex',gap:12}}><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Department</label><span className="tip-icon" data-tip="The department where this employee primarily works.">i</span></div><select value={editData.dept||''} onChange={function(e){ed('dept',e.target.value);}}>{DEPTS.map(x=><option key={x}>{x}</option>)}</select></div><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Location</label><span className="tip-icon" data-tip="Factory or office location where this employee is stationed.">i</span></div><select value={editData.loc||''} onChange={function(e){ed('loc',e.target.value);}}>{LOCS.map(x=><option key={x}>{x}</option>)}</select></div></div>
<div style={{display:'flex',gap:12}}><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Designation</label><span className="tip-icon" data-tip="Job title or role designation.">i</span></div><select value={editData.desig||''} onChange={function(e){ed('desig',e.target.value);}}>{DESIG.map(x=><option key={x}>{x}</option>)}</select></div><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Biometric ID</label><span className="tip-icon" data-tip="The ID enrolled on the biometric device. Changing this affects punch matching.">i</span></div><input value={editData.bioId||''} onChange={function(e){ed('bioId',e.target.value);}} placeholder="e.g. BIO001"/><div className="field-hint" style={{color:'#92400e'}}><span className="hi" style={{background:'var(--amber-bg)',color:'#92400e'}}>!</span>Changing this affects punch matching with the device</div></div></div>
<div style={{display:'flex',gap:12}}><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Time Shift</label><span className="tip-icon" data-tip="Actual work shift. Day = 6AM-6PM (12 hrs), Night = 6PM-6AM (12 hrs).">i</span></div><select value={editData.shift||'Day'} onChange={function(e){ed('shift',e.target.value);}}><option value="Day">Day (06:00 AM - 06:00 PM)</option><option value="Night">Night (06:00 PM - 06:00 AM)</option></select><div className="field-hint"><span className="hi">i</span>Actual 12-hour shift</div></div><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Alternate Time Shift</label><span className="tip-icon" data-tip="Compliance shift window. System generates 8-hour punch data in this window. Can differ from actual shift.">i</span></div><select value={editData.altShift||'A'} onChange={function(e){ed('altShift',e.target.value);}}>{COMP_SHIFTS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select><div className="field-hint"><span className="hi">i</span>8-hour compliance window</div></div></div>
<div className="form-group"><div className="lbl-tip"><label>Weekly Off Days</label><span className="tip-icon" data-tip="Select the day(s) this employee has as weekly holidays. The compliance system will NOT generate punch data on these days. Multiple days can be selected (e.g. Saturday + Sunday for office staff).">i</span></div>
<div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:6}}>{WEEKDAYS.map(function(day){var checked=(editData.weeklyOff||[]).indexOf(day)>=0;return<label key={day} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:6,border:'1.5px solid '+(checked?'var(--primary)':'var(--border)'),background:checked?'#eef2ff':'var(--surface2)',cursor:'pointer',fontSize:12,fontWeight:checked?600:400,color:checked?'var(--primary)':'var(--text2)',transition:'.15s'}}><input type="checkbox" checked={checked} onChange={function(){ed('weeklyOff',checked?(editData.weeklyOff||[]).filter(function(d){return d!==day;}):(editData.weeklyOff||[]).concat([day]));}} style={{accentColor:'var(--primary)',width:14,height:14}}/>{day.slice(0,3)}</label>;})}
</div>
<div className="field-hint"><span className="hi">i</span>Dummy data will skip selected days automatically</div></div>
<div style={{display:'flex',gap:12}}><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>PAN Card Number</label><span className="tip-icon" data-tip="Format: 5 letters, 4 digits, 1 letter (e.g. ABCPD1234F).">i</span></div><input value={editData.pan||''} onChange={function(e){ed('pan',V.pan(e.target.value));}} placeholder="ABCPD1234F" maxLength="10" style={{textTransform:'uppercase'}}/></div><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Aadhaar Number</label><span className="tip-icon" data-tip="12-digit UIDAI number.">i</span></div><input value={editData.aadhaar||''} onChange={function(e){ed('aadhaar',V.aadhaar(e.target.value));}} placeholder="1234 5678 9012" maxLength="14"/></div></div>
<div style={{fontSize:12,fontWeight:600,color:'var(--text3)',marginTop:12,marginBottom:10,textTransform:'uppercase',letterSpacing:'.5px'}}>Bank Account Details</div>
<div style={{display:'flex',gap:12}}><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Account Holder</label><span className="tip-icon" data-tip="Name exactly as per bank passbook.">i</span></div><input value={editData.bankHolder||''} onChange={function(e){ed('bankHolder',V.alpha(e.target.value));}} placeholder="Name as per bank"/></div><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Account Number</label><span className="tip-icon" data-tip="9-18 digit bank account number.">i</span></div><input value={editData.bankAcc||''} onChange={function(e){ed('bankAcc',V.bankAcc(e.target.value));}} placeholder="Bank account number" maxLength="18"/></div></div>
<div style={{display:'flex',gap:12}}><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Account Type</label><span className="tip-icon" data-tip="Savings, Current, or Salary account.">i</span></div><select value={editData.accType||'Savings'} onChange={function(e){ed('accType',e.target.value);}}>{ACCTYPES.map(x=><option key={x}>{x}</option>)}</select></div><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Bank Name</label><span className="tip-icon" data-tip="Select the employee's bank.">i</span></div><select value={editData.bankName||BANKS[0]} onChange={function(e){ed('bankName',e.target.value);}}>{BANKS.map(x=><option key={x}>{x}</option>)}</select></div></div>
<div style={{fontSize:12,fontWeight:600,color:'var(--text3)',marginTop:12,marginBottom:10,textTransform:'uppercase',letterSpacing:'.5px'}}>Statutory Compliance</div>
<div style={{display:'flex',gap:12}}><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>PF Number</label><span className="tip-icon" data-tip="PF UAN or member ID. Format: State/Region/Estd/Acct.">i</span></div><input value={editData.pf||''} onChange={function(e){ed('pf',e.target.value);}} placeholder="GJ/SUR/12345/123"/></div><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>ESI Number</label><span className="tip-icon" data-tip="10-digit ESIC number.">i</span></div><input value={editData.esi||''} onChange={function(e){ed('esi',V.esi(e.target.value));}} placeholder="1234567890" maxLength="10"/></div></div>
<div className="modal-actions"><button className="btn btn-outline" onClick={cancelEdit}>Cancel</button><button className="btn btn-primary" onClick={saveEdit} style={{background:'var(--green)',border:'none'}}>Save Changes</button></div>
</Modal>}

{/* HEADER with back + edit button */}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
<button className="btn btn-outline" onClick={()=>{setSel(null);setAttDays(7);setEditing(false);if(onClearInitial)onClearInitial();}}>&larr; Back to Employees</button>
<button className="btn btn-primary" onClick={startEdit}>Edit Employee</button>
</div>
<div className="emp-detail-grid">
<div>
{/* PROFILE CARD - always read-only, clean */}
<div className="emp-profile-card" style={{marginBottom:16}}>
<div className="emp-avatar">{sel.name.split(' ').map(n=>n[0]).join('')}</div>
<h2>{sel.name}</h2><div className="emp-id">{sel.id}</div>
<span className={'badge '+(sel.status==='Active'?'green':sel.status==='Inactive'?'red':'amber')}>{sel.status}</span>
<div className="emp-meta-list" style={{marginTop:20}}>
{[['Department',sel.dept],['Designation',sel.desig],['Location',sel.loc],['Time Shift',sel.shift+' (12-hour)'],['Alt Time Shift',compShiftLabel(sel.altShift)],['Date of Joining',fmtD(sel.join)],['Biometric ID',sel.bioId||sel.id]].map(([l,v],i)=><div className="meta-row" key={i}><span className="meta-label">{l}</span><span className={'meta-value'+(l==='Biometric ID'?' mono':'')}>{v}</span></div>)}
<div className="meta-row"><span className="meta-label">Weekly Off</span><span className="meta-value"><span style={{display:'flex',gap:4,flexWrap:'wrap'}}>{(Array.isArray(sel.weeklyOff)?sel.weeklyOff:[sel.weeklyOff||'Sunday']).map(function(d){return<span key={d} className="badge blue" style={{fontSize:10,padding:'2px 8px'}}>{d}</span>;})}</span></span></div>
</div>
</div>
{/* STATUTORY & BANK - always read-only */}
<div className="emp-profile-card" style={{textAlign:'left'}}>
<h3 style={{fontSize:14,fontWeight:700,marginBottom:14,paddingBottom:10,borderBottom:'1px solid var(--border)',color:'var(--primary)'}}>Statutory & Bank Details</h3>
<div className="emp-meta-list">
<div className="meta-row"><span className="meta-label">PAN Number</span><span className="meta-value mono">{sel.pan}</span></div>
<div className="meta-row"><span className="meta-label">Aadhaar Number</span><span className="meta-value mono">{sel.aadhaar}</span></div>
</div>
<h4 style={{fontSize:12,fontWeight:600,color:'var(--text3)',marginTop:16,marginBottom:10,textTransform:'uppercase',letterSpacing:'.5px'}}>Bank Account</h4>
<div className="emp-meta-list">
<div className="meta-row"><span className="meta-label">Account Holder</span><span className="meta-value">{sel.bankHolder}</span></div>
<div className="meta-row"><span className="meta-label">Account Number</span><span className="meta-value mono">{sel.bankAcc}</span></div>
<div className="meta-row"><span className="meta-label">Account Type</span><span className="meta-value">{sel.accType}</span></div>
<div className="meta-row"><span className="meta-label">Bank Name</span><span className="meta-value">{sel.bankName}</span></div>
</div>
<h4 style={{fontSize:12,fontWeight:600,color:'var(--text3)',marginTop:16,marginBottom:10,textTransform:'uppercase',letterSpacing:'.5px'}}>Provident Fund & ESI</h4>
<div className="emp-meta-list">
<div className="meta-row"><span className="meta-label">PF Number</span><span className="meta-value mono">{sel.pf}</span></div>
<div className="meta-row"><span className="meta-label">ESI Number</span><span className="meta-value mono">{sel.esi}</span></div>
</div>
</div>
</div>
{/* HOURS SUMMARY - For Phase 2 payroll readiness */}
{(function(){
  var monthDays=Array.from({length:30},function(_,x){var dt=new Date(2026,2,20-x);return genAtt([sel],dt.toISOString().split('T')[0],dt.getDay())[0];});
  var totalReal=monthDays.reduce(function(s,a){return s+parseFloat(a?.realHrs||0);},0);
  var totalComp=monthDays.reduce(function(s,a){return s+parseFloat(a?.compHrs||0);},0);
  var totalOT=monthDays.reduce(function(s,a){return s+parseFloat(a?.otHrs||0);},0);
  var presentDays=monthDays.filter(function(a){return a?.st==='Present';}).length;
  var absentDays=monthDays.filter(function(a){return a?.st==='Absent';}).length;
  var weeklyOffDays=monthDays.filter(function(a){return a?.st==='Weekly Off';}).length;
  var stdHrs=9.5;
  var equivDays=(totalReal/stdHrs).toFixed(1);
  return<div className="table-card" style={{marginBottom:14}}>
<div className="card-hd" style={{padding:'14px 18px',borderBottom:'1px solid var(--border)'}}>
<h3 style={{fontSize:14,fontWeight:700,display:'flex',alignItems:'center',gap:8}}>Hours Summary <span style={{fontSize:11,fontWeight:500,color:'var(--text3)'}}>(Last 30 days)</span> <span className="tip-icon" data-tip="Captures total hours worked, OT hours, and equivalent days. Makson is hours-based: total hours divided by standard hours per day (9.5) gives the equivalent days for payroll. This data is captured now to support Phase 2 payroll without rework.">i</span></h3>
</div>
<div style={{padding:'14px 18px',display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))',gap:12}}>
<div style={{padding:'10px 12px',background:'#eef2ff',borderRadius:8,border:'1px solid #c7d2fe'}}>
<div style={{fontSize:10,color:'var(--primary)',textTransform:'uppercase',letterSpacing:'.5px',fontWeight:600,marginBottom:4}}>Total Real Hours <span className="tip-icon" data-tip="Sum of net hours worked (gross hours minus break time). This is the source of truth for hours-based payroll.">i</span></div>
<div style={{fontSize:22,fontWeight:700,color:'var(--primary)'}}>{totalReal.toFixed(1)}</div>
<div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>net hours worked</div>
</div>
<div style={{padding:'10px 12px',background:'#f0fdf4',borderRadius:8,border:'1px solid #bbf7d0'}}>
<div style={{fontSize:10,color:'#166534',textTransform:'uppercase',letterSpacing:'.5px',fontWeight:600,marginBottom:4}}>Compliant Hours <span className="tip-icon" data-tip="Hours within the legal 9.5/day cap. This is what shows in compliance reports. Anything beyond 9.5 hrs/day moves to OT.">i</span></div>
<div style={{fontSize:22,fontWeight:700,color:'#166534'}}>{totalComp.toFixed(1)}</div>
<div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>capped at 9.5 hrs/day</div>
</div>
<div style={{padding:'10px 12px',background:'var(--amber-bg)',borderRadius:8,border:'1px solid #fde68a'}}>
<div style={{fontSize:10,color:'#92400e',textTransform:'uppercase',letterSpacing:'.5px',fontWeight:600,marginBottom:4}}>OT Hours <span className="tip-icon" data-tip="Hours worked beyond the standard 9.5 hours/day. In Makson's system, OT hours are converted to equivalent days for payroll.">i</span></div>
<div style={{fontSize:22,fontWeight:700,color:'#92400e'}}>{totalOT.toFixed(1)}</div>
<div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>beyond 9.5 hrs/day</div>
</div>
<div style={{padding:'10px 12px',background:'#f8f9fb',borderRadius:8,border:'1px solid var(--border)'}}>
<div style={{fontSize:10,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'.5px',fontWeight:600,marginBottom:4}}>Equivalent Days <span className="tip-icon" data-tip="Total real hours divided by 9.5 (standard hours/day). This is the days figure that goes to payroll - includes regular days plus OT converted to days.">i</span></div>
<div style={{fontSize:22,fontWeight:700,color:'var(--text)'}}>{equivDays}</div>
<div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>{totalReal.toFixed(0)} hrs ÷ {stdHrs}</div>
</div>
<div style={{padding:'10px 12px',background:'#f8f9fb',borderRadius:8,border:'1px solid var(--border)'}}>
<div style={{fontSize:10,color:'var(--text2)',textTransform:'uppercase',letterSpacing:'.5px',fontWeight:600,marginBottom:4}}>Day Breakdown</div>
<div style={{fontSize:13,fontWeight:600,color:'var(--text)',lineHeight:1.5}}>
<span style={{color:'var(--green)'}}>{presentDays}P</span> · <span style={{color:'var(--red)'}}>{absentDays}A</span> · <span style={{color:'var(--primary)'}}>{weeklyOffDays}WO</span>
</div>
<div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>Present / Absent / Weekly Off</div>
</div>
</div>
<div style={{padding:'10px 18px',borderTop:'1px solid var(--border)',background:'var(--surface2)',fontSize:11,color:'var(--text3)',display:'flex',alignItems:'center',gap:6}}>
<span style={{color:'var(--primary)',fontWeight:600}}>i</span> Phase 1 captures all hours data needed for Phase 2 payroll. The conversion (hours → days) and salary calculation will be added in Phase 2 without schema changes.
</div>
</div>;
})()}
{/* ATTENDANCE HISTORY WITH 7/14/30 TOGGLE */}
<div className="table-card">
<div className="card-hd" style={{padding:'14px 18px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
<h3 style={{fontSize:14,fontWeight:700}}>Attendance History</h3>
<div style={{display:'flex',gap:6}}>
{[7,14,30].map(d=><button key={d} className={'btn btn-sm '+(attDays===d?'btn-primary':'btn-outline')} style={{borderRadius:16,minWidth:60}} onClick={()=>setAttDays(d)}>{d} Days</button>)}
</div>
</div>
<div className="tbl-scroll" style={{maxHeight:'none'}}>
<table>
<thead><tr><th>Date</th><th>Entry</th><th>Exit</th><th>Real Hrs <span className="tip-icon" data-tip="Net hours worked (after break deduction)">i</span></th><th>Comp Hrs <span className="tip-icon" data-tip="Compliant hours capped at 9.5/day">i</span></th><th>OT <span className="tip-icon" data-tip="Hours beyond 9.5 standard">i</span></th><th>Status</th></tr></thead>
<tbody>{Array.from({length:attDays},(_,x)=>x).map(x=>{const dt=new Date(2026,2,20-x);const ds=dt.toISOString().split('T')[0];const a=genAtt([sel],ds,dt.getDay())[0];return<tr key={x}><td className="mono" style={{fontSize:11}}>{fmtD(ds)}</td><td className="time">{a?.ein||'-'}</td><td className="time">{a?.eout||'-'}</td><td className="time">{a?.realHrs||'-'}</td><td className="time">{a?.compHrs||'-'}</td><td className="time" style={{color:parseFloat(a?.otHrs||0)>0?'#92400e':'var(--text3)',fontWeight:parseFloat(a?.otHrs||0)>0?600:400}}>{a?.otHrs||'-'}</td><td><span className={'badge '+(a?.st==='Present'?'green':a?.st==='Weekly Off'?'blue':'red')}>{a?.st}</span></td></tr>;})}</tbody>
</table></div>
<div style={{padding:'10px 18px',borderTop:'1px solid var(--border)',fontSize:11,color:'var(--text3)',display:'flex',justifyContent:'space-between'}}>
<span>Showing last {attDays} days</span>
<span>Present: {Array.from({length:attDays},(_,x)=>x).map(x=>{const dt=new Date(2026,2,20-x);const ds=dt.toISOString().split('T')[0];return genAtt([sel],ds)[0];}).filter(a=>a&&a.st==='Present').length} / {attDays}</span>
</div>
</div>
</div></div>;
return<div className="fade-in">{modal&&<Modal title="Add Employee" onClose={()=>{setModal(false);resetForm();}}>
<div className="form-group"><div className="lbl-tip"><label>Full Name</label><span className="tip-icon" data-tip="Enter the employee's full legal name as it appears on official documents.">i</span></div><input value={fn} onChange={function(e){setFn(V.alpha(e.target.value));}} placeholder="e.g. Rajesh Kumar Patel"/></div>
<div style={{display:'flex',gap:12}}><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Department</label><span className="tip-icon" data-tip="The department where this employee primarily works.">i</span></div><select value={fDept} onChange={function(e){setFDept(e.target.value);}}>{DEPTS.map(x=><option key={x}>{x}</option>)}</select></div><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Location</label><span className="tip-icon" data-tip="The factory or office location where this employee is stationed.">i</span></div><select value={fLoc} onChange={function(e){setFLoc(e.target.value);}}>{LOCS.map(x=><option key={x}>{x}</option>)}</select></div></div>
<div style={{display:'flex',gap:12}}><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Designation</label><span className="tip-icon" data-tip="The employee's job title or role designation.">i</span></div><select value={fDesig} onChange={function(e){setFDesig(e.target.value);}}>{DESIG.map(x=><option key={x}>{x}</option>)}</select></div><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Biometric ID</label><span className="tip-icon" data-tip="The unique ID assigned to this employee on the biometric device. Must match the enrollment ID on the eSSL machine.">i</span></div><input value={fBio} onChange={function(e){setFBio(e.target.value);}} placeholder="e.g. BIO001"/><div className="field-hint"><span className="hi">i</span>Must match the ID enrolled on the attendance device</div></div></div>
<div style={{display:'flex',gap:12}}><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Time Shift</label><span className="tip-icon" data-tip="The actual work shift this employee follows. Day = 6AM to 6PM (12 hrs), Night = 6PM to 6AM (12 hrs).">i</span></div><select value={fShift} onChange={function(e){setFShift(e.target.value);}}><option value="Day">Day (06:00 AM - 06:00 PM)</option><option value="Night">Night (06:00 PM - 06:00 AM)</option></select><div className="field-hint"><span className="hi">i</span>Actual working hours (12-hour shift)</div></div><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Alternate Time Shift</label><span className="tip-icon" data-tip="The compliance shift window for this employee. The system will auto-generate 8-hour punch data within this time window. Can be different from the actual time shift.">i</span></div><select value={fAlt} onChange={function(e){setFAlt(e.target.value);}}>{COMP_SHIFTS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select><div className="field-hint"><span className="hi">i</span>8-hour compliance window (can differ from actual shift)</div></div></div>
<div className="form-group"><div className="lbl-tip"><label>Weekly Off Days</label><span className="tip-icon" data-tip="Select the day(s) this employee has as weekly holidays. The compliance system will NOT generate punch data on these days. Multiple days can be selected. Different employees can have different off days based on shift rotation.">i</span></div>
<div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:6}}>{WEEKDAYS.map(function(day){var checked=fWeekly.indexOf(day)>=0;return<label key={day} style={{display:'flex',alignItems:'center',gap:5,padding:'6px 12px',borderRadius:6,border:'1.5px solid '+(checked?'var(--primary)':'var(--border)'),background:checked?'#eef2ff':'var(--surface2)',cursor:'pointer',fontSize:12,fontWeight:checked?600:400,color:checked?'var(--primary)':'var(--text2)',transition:'.15s'}}><input type="checkbox" checked={checked} onChange={function(){setFWeekly(checked?fWeekly.filter(function(d){return d!==day;}):fWeekly.concat([day]));}} style={{accentColor:'var(--primary)',width:14,height:14}}/>{day.slice(0,3)}</label>;})}
</div>
<div className="field-hint"><span className="hi">i</span>Dummy data will skip selected days automatically</div></div>
<div style={{display:'flex',gap:12}}><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>PAN Card Number</label><span className="tip-icon" data-tip="Permanent Account Number issued by Income Tax Department. Format: 5 letters, 4 digits, 1 letter (e.g. ABCPD1234F).">i</span></div><input value={fPan} onChange={function(e){setFPan(V.pan(e.target.value));}} placeholder="ABCPD1234F" maxLength="10" style={{textTransform:'uppercase'}}/><div className="field-hint"><span className="hi">i</span>Format: 5 letters + 4 digits + 1 letter (e.g. ABCPD1234F)</div></div><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Aadhaar Number</label><span className="tip-icon" data-tip="12-digit unique identity number issued by UIDAI. Enter without spaces - the system will format it automatically.">i</span></div><input value={fAadh} onChange={function(e){setFAadh(V.aadhaar(e.target.value));}} placeholder="1234 5678 9012" maxLength="14"/><div className="field-hint"><span className="hi">i</span>12-digit UIDAI number (e.g. 1234 5678 9012)</div></div></div>
<div style={{fontSize:12,fontWeight:600,color:'var(--text3)',marginTop:12,marginBottom:10,textTransform:'uppercase',letterSpacing:'.5px',display:'flex',alignItems:'center',gap:6}}>Bank Account Details<span className="tip-icon" data-tip="Bank details are required for salary processing as per Indian labour laws. Ensure account number and IFSC match.">i</span></div>
<div style={{display:'flex',gap:12}}><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Account Holder Name</label><span className="tip-icon" data-tip="Name exactly as it appears on the bank passbook or cheque book. Must match bank records for salary credit.">i</span></div><input value={fBankN} onChange={function(e){setFBankN(V.alpha(e.target.value));}} placeholder="e.g. Rajesh Kumar Patel"/><div className="field-hint"><span className="hi">i</span>Exactly as per bank passbook</div></div><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Account Number</label><span className="tip-icon" data-tip="Bank account number (9 to 18 digits). Verify carefully - incorrect numbers will cause salary credit failures.">i</span></div><input value={fBankAcc} onChange={function(e){setFBankAcc(V.bankAcc(e.target.value));}} placeholder="e.g. 50100123456789" maxLength="18"/><div className="field-hint"><span className="hi">i</span>9-18 digit bank account number</div></div></div>
<div style={{display:'flex',gap:12}}><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Account Type</label><span className="tip-icon" data-tip="Savings = personal account. Current = business account. Salary = special salary account (lower minimum balance).">i</span></div><select value={fAccT} onChange={function(e){setFAccT(e.target.value);}}>{ACCTYPES.map(x=><option key={x}>{x}</option>)}</select></div><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>Bank Name</label><span className="tip-icon" data-tip="Select the employee's bank. If the bank is not listed, contact admin to add it to the system.">i</span></div><select value={fBank} onChange={function(e){setFBank(e.target.value);}}>{BANKS.map(x=><option key={x}>{x}</option>)}</select></div></div>
<div style={{fontSize:12,fontWeight:600,color:'var(--text3)',marginTop:12,marginBottom:10,textTransform:'uppercase',letterSpacing:'.5px',display:'flex',alignItems:'center',gap:6}}>Statutory Compliance<span className="tip-icon" data-tip="PF and ESI are mandatory under Indian labour law for eligible employees. PF for all earning below Rs. 15,000/month. ESI for all earning below Rs. 21,000/month.">i</span></div>
<div style={{display:'flex',gap:12}}><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>PF Number</label><span className="tip-icon" data-tip="Provident Fund UAN (Universal Account Number) or PF member ID. Format: State/Region/Establishment/Account (e.g. GJ/SUR/12345/123).">i</span></div><input value={fPf} onChange={function(e){setFPf(e.target.value);}} placeholder="e.g. GJ/SUR/12345/123"/><div className="field-hint"><span className="hi">i</span>UAN or PF ID: State/Region/Estd/Acct</div></div><div style={{flex:1}} className="form-group"><div className="lbl-tip"><label>ESI Number</label><span className="tip-icon" data-tip="Employee State Insurance number (10 digits). Issued by ESIC. Required for employees earning below Rs. 21,000/month.">i</span></div><input value={fEsi} onChange={function(e){setFEsi(V.esi(e.target.value));}} placeholder="e.g. 1234567890" maxLength="10"/><div className="field-hint"><span className="hi">i</span>10-digit ESIC number</div></div></div>
<div className="modal-actions"><button className="btn btn-outline" onClick={()=>{setModal(false);resetForm();}}>Cancel</button><button className="btn btn-primary" onClick={addEmployee}>Add Employee</button></div>
</Modal>}
{isModified&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,padding:'10px 16px',background:'var(--primary-bg)',borderRadius:8,border:'1px solid #c5cae9'}}>
<span style={{fontSize:13,color:'var(--primary)',fontWeight:500}}>Filtered: <strong>{fil.length} employees</strong>{statusF!=='All'&&<span> / {statusF}</span>}{shiftF!=='All'&&<span> / {shiftF} Shift</span>}{d!=='All'&&<span> / {d}</span>}{lo!=='All'&&<span> / {lo}</span>}{s&&<span> / "{s}"</span>}{sc&&<span> / sorted by {sc}</span>}</span>
<button className="btn btn-primary btn-sm" onClick={resetAll}>Reset to Default View</button></div>}
<div className="stats-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
<div className={'stat-card c1'+(tile==='total'?' selected':'')} onClick={()=>clickTile('total')}><div className="click-hint">Click to filter</div><div className="label">Total</div><div className="value">{EMPS.length.toLocaleString()}</div><div className="sub">all employees</div></div>
<div className={'stat-card c2'+(tile==='active'?' selected':'')} onClick={()=>clickTile('active')}><div className="click-hint">Click to filter</div><div className="label">Active</div><div className="value">{ACT.toLocaleString()}</div><div className="sub">{(ACT/EMPS.length*100).toFixed(1)}% of total</div></div>
<div className={'stat-card c4'+(tile==='day'?' selected':'')} onClick={()=>clickTile('day')}><div className="click-hint">Click to filter</div><div className="label">Day Shift</div><div className="value">{DAY_COUNT}</div><div className="sub">active day workers</div></div>
<div className={'stat-card c3'+(tile==='night'?' selected':'')} onClick={()=>clickTile('night')}><div className="click-hint">Click to filter</div><div className="label">Night Shift</div><div className="value">{NIGHT_COUNT}</div><div className="sub">active night workers</div></div>
</div>
<div className="table-card"><div className="table-header"><h3>Employee Directory</h3><div className="table-filters"><input placeholder="Search..." value={s} onChange={e=>setS(e.target.value)} style={{width:160}}/><select value={d} onChange={e=>setD(e.target.value)}><option value="All">All Depts</option>{DEPTS.map(x=><option key={x}>{x}</option>)}</select><select value={lo} onChange={e=>setLo(e.target.value)}><option value="All">All Locations</option>{LOCS.map(x=><option key={x}>{x}</option>)}</select><button className="btn btn-primary" onClick={()=>setModal(true)}>+ Add Employee</button></div></div><div className="tbl-scroll"><table><thead><tr>
<th className={sc==='name'?'sorted':''} onClick={()=>ts('name')}>Employee <span className="sort-arrow">{ar('name')}</span></th>
<th className={sc==='id'?'sorted':''} onClick={()=>ts('id')}>ID <span className="sort-arrow">{ar('id')}</span></th>
<th className={sc==='dept'?'sorted':''} onClick={()=>ts('dept')}>Department <span className="sort-arrow">{ar('dept')}</span></th>
<th className={sc==='desig'?'sorted':''} onClick={()=>ts('desig')}>Designation <span className="sort-arrow">{ar('desig')}</span></th>
<th className={sc==='loc'?'sorted':''} onClick={()=>ts('loc')}>Location <span className="sort-arrow">{ar('loc')}</span></th>
<th className={sc==='shift'?'sorted':''} onClick={()=>ts('shift')}>Time Shift <span className="sort-arrow">{ar('shift')}</span></th>
<th className={sc==='altShift'?'sorted':''} onClick={()=>ts('altShift')}>Alt Time Shift <span className="sort-arrow">{ar('altShift')}</span></th>
<th className={sc==='status'?'sorted':''} onClick={()=>ts('status')}>Status <span className="sort-arrow">{ar('status')}</span></th>
</tr></thead><tbody>{fil.slice(0,50).map((e,i)=><tr key={i} onClick={()=>setSel(e)} style={{cursor:'pointer'}}><td className="emp-name">{e.name}</td><td className="mono" style={{fontSize:11}}>{e.id}</td><td>{e.dept}</td><td>{e.desig}</td><td style={{fontSize:12}}>{e.loc}</td><td><span className={'badge '+(e.shift==='Day'?'blue':'amber')}>{e.shift}</span></td><td style={{fontSize:11}}>{compShiftLabel(e.altShift)}</td><td><span className={'badge '+(e.status==='Active'?'green':'red')}>{e.status}</span></td></tr>)}</tbody></table></div>
<div className="table-footer"><div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}><span>Showing {Math.min(50,fil.length)} of {fil.length}</span>
{statusF!=='All'&&<span className="active-filter-tag" onClick={()=>{setStatusF('All');setTile(null);}}>{statusF} X</span>}
{shiftF!=='All'&&<span className="active-filter-tag" onClick={()=>{setShiftF('All');setTile(null);}}>{shiftF} Shift X</span>}
{d!=='All'&&<span className="active-filter-tag" onClick={()=>setD('All')}>{d} X</span>}
{lo!=='All'&&<span className="active-filter-tag" onClick={()=>setLo('All')}>{lo} X</span>}
</div><span>Page 1</span></div></div></div>;}
function Att({cr,toast,goHome}){
var _punches=useState([]);var punches=_punches[0];var setPunches=_punches[1];
var _paused=useState(false);var paused=_paused[0];var setPaused=_paused[1];
var _search=useState('');var search=_search[0];var setSearch=_search[1];
var _devF=useState('All');var devF=_devF[0];var setDevF=_devF[1];
var _methodF=useState('All');var methodF=_methodF[0];var setMethodF=_methodF[1];
var _tileF=useState(null);var tileF=_tileF[0];var setTileF=_tileF[1];
var clickTile=function(t){if(tileF===t)setTileF(null);else setTileF(t);};
var VERIFY_METHODS=['Face','Fingerprint','Card'];
var PUNCH_TYPES=['Check In','Check Out'];
var DEV_NAMES=['Main Gate - Entry','Main Gate - Exit','Unit 2 - Entry','Pharma Block Gate','Healthcare Unit 1','Machinery Division','Tiles Factory','Warehouse Block A','Admin Building'];
var DEV_SERIALS=['TFDB244600829','TFDB244600830','ZKTF20240015','MCOS20240045','TFDB244600835','ZKTV5L240020','TFDB244600840','TFDB244600842','MCOS20240050'];

// Generate a realistic punch
var genPunch=function(){
  var now=new Date();
  var empIdx=Math.floor(Math.random()*EMPS.length);
  var emp=EMPS[empIdx];
  while(emp.status!=='Active'){empIdx=Math.floor(Math.random()*EMPS.length);emp=EMPS[empIdx];}
  var devIdx=Math.floor(Math.random()*DEV_NAMES.length);
  var hr=now.getHours();
  var ptype=(hr>=5&&hr<14)?0:1;
  return{
    id:Date.now()+Math.random(),
    time:now,
    empId:emp.id,
    empName:emp.name,
    dept:emp.dept,
    loc:emp.loc,
    biometricId:'BIO'+String(empIdx+1).padStart(3,'0'),
    device:DEV_NAMES[devIdx],
    serial:DEV_SERIALS[devIdx],
    method:VERIFY_METHODS[Math.floor(Math.random()*VERIFY_METHODS.length)],
    punchType:PUNCH_TYPES[ptype],
    isNew:true
  };
};

// Simulate punches arriving
useEffect(function(){
  // Seed 15 initial punches
  var initial=[];
  for(var k=0;k<15;k++){
    var p=genPunch();
    p.time=new Date(Date.now()-k*Math.floor(Math.random()*25000+5000));
    p.isNew=false;
    initial.push(p);
  }
  setPunches(initial);

  var interval=setInterval(function(){
    if(!paused){
      setPunches(function(prev){
        var newP=genPunch();
        var updated=[newP].concat(prev.slice(0,99));
        // Clear isNew after animation
        setTimeout(function(){
          setPunches(function(p2){return p2.map(function(x){return x.id===newP.id?Object.assign({},x,{isNew:false}):x;});});
        },1500);
        return updated;
      });
    }
  },Math.floor(Math.random()*3000)+2000);
  return function(){clearInterval(interval);};
},[paused]);

var fmtTime=function(d){return d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true,timeZone:'Asia/Kolkata'});};
var fmtDate=function(d){return d.toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Kolkata'});};

var filtered=punches.filter(function(p){
  if(search&&!p.empName.toLowerCase().includes(search.toLowerCase())&&!p.empId.toLowerCase().includes(search.toLowerCase())&&!p.biometricId.toLowerCase().includes(search.toLowerCase()))return false;
  if(devF!=='All'&&p.device!==devF)return false;
  if(methodF!=='All'&&p.method!==methodF)return false;
  if(tileF==='in'&&p.punchType!=='Check In')return false;
  if(tileF==='out'&&p.punchType!=='Check Out')return false;
  return true;
});
// For 'unique' tile: deduplicate to first punch per employee
var displayData=tileF==='unique'?Object.values(filtered.reduce(function(acc,p){if(!acc[p.empId])acc[p.empId]=p;return acc;},{})):filtered;

var totalToday=punches.length;
var checkIns=punches.filter(function(p){return p.punchType==='Check In';}).length;
var checkOuts=punches.filter(function(p){return p.punchType==='Check Out';}).length;
var uniqueEmps=[...new Set(punches.map(function(p){return p.empId;}))].length;

return(<div className="fade-in">
  {/* STATS */}
  <div className="stats-grid" style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:20}}>
    <div className={'stat-card c1'+(tileF==='all'?' selected':'')} onClick={function(){clickTile('all');}}><div className="click-hint">Click to filter</div><div className="stat-label">Total Punches</div><div className="stat-value">{totalToday}</div><div className="stat-sub">today</div></div>
    <div className={'stat-card c2'+(tileF==='in'?' selected':'')} onClick={function(){clickTile('in');}}><div className="click-hint">Click to filter</div><div className="stat-label">Check Ins</div><div className="stat-value">{checkIns}</div><div className="stat-sub">recorded</div></div>
    <div className={'stat-card c3'+(tileF==='out'?' selected':'')} onClick={function(){clickTile('out');}}><div className="click-hint">Click to filter</div><div className="stat-label">Check Outs</div><div className="stat-value">{checkOuts}</div><div className="stat-sub">recorded</div></div>
    <div className={'stat-card c4'+(tileF==='unique'?' selected':'')} onClick={function(){clickTile('unique');}}><div className="click-hint">Click to filter</div><div className="stat-label">Unique Employees</div><div className="stat-value">{uniqueEmps}</div><div className="stat-sub">punched today</div></div>
  </div>

  {tileF&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,padding:'10px 16px',background:'var(--primary-bg)',borderRadius:8,border:'1px solid #c5cae9'}}>
  <span style={{fontSize:13,color:'var(--primary)',fontWeight:500}}>Filtered: <strong>{tileF==='in'?'Check Ins only':tileF==='out'?'Check Outs only':tileF==='unique'?'Unique employees (first punch)':'All punches'}</strong> - {displayData.length} results</span>
  <button className="btn btn-primary btn-sm" onClick={function(){setTileF(null);}}>Reset to Default View</button></div>}

  {/* LIVE FEED */}
  <div className="table-card">
    <div className="table-header" style={{flexWrap:'wrap',gap:10}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <h3 style={{display:'flex',alignItems:'center',gap:8}}><span className="live-dot"></span>Live Punch Feed</h3>
        <button className={'btn btn-sm '+(paused?'btn-primary':'btn-outline')} onClick={function(){setPaused(!paused);toast(paused?'Feed resumed':'Feed paused','info');}} style={{borderRadius:16}}>{paused?'Resume':'Pause'}</button>
      </div>
      <div className="table-filters" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
        <input placeholder="Search employee..." value={search} onChange={function(e){setSearch(e.target.value);}} style={{width:160}}/>
        <select value={devF} onChange={function(e){setDevF(e.target.value);}}><option value="All">All Devices</option>{DEV_NAMES.map(function(d){return<option key={d} value={d}>{d}</option>;})}</select>
        <select value={methodF} onChange={function(e){setMethodF(e.target.value);}}><option value="All">All Methods</option>{VERIFY_METHODS.map(function(m){return<option key={m} value={m}>{m}</option>;})}</select>
      </div>
    </div>
    <div style={{fontSize:11,color:'var(--text3)',padding:'6px 20px',background:'var(--surface2)',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between'}}>
      <span>Raw biometric data from ADMS push protocol | Showing {displayData.length} punches{tileF?' (filtered)':''}</span>
      <span className="mono">{paused?'PAUSED':'RECEIVING'}</span>
    </div>
    <div className="tbl-scroll" style={{maxHeight:460}}>
    <table>
      <thead><tr><th style={{width:50}}>#</th><th>Time</th><th>Employee</th><th>Biometric ID</th><th>Department</th><th>Device</th><th>Method</th><th>Type</th></tr></thead>
      <tbody>{displayData.map(function(p,i){
        return<tr key={p.id} style={{background:p.isNew?'rgba(115,174,37,.08)':'transparent',transition:'background .8s'}}>
          <td style={{fontSize:10,color:'var(--text3)'}}>{i+1}</td>
          <td style={{whiteSpace:'nowrap'}}><span className="mono" style={{fontSize:11,fontWeight:600}}>{fmtTime(p.time)}</span><span style={{fontSize:10,color:'var(--text3)',marginLeft:6}}>{fmtDate(p.time)}</span></td>
          <td className="emp-name">{p.empName}</td>
          <td className="mono" style={{fontSize:11}}>{p.biometricId}</td>
          <td style={{fontSize:12}}>{p.dept}</td>
          <td style={{fontSize:11}}>{p.device}<div style={{fontSize:9,color:'var(--text3)'}}>{p.serial}</div></td>
          <td><span className={'badge '+(p.method==='Face'?'blue':p.method==='Fingerprint'?'green':'amber')}>{p.method}</span></td>
          <td><span className={'badge '+(p.punchType==='Check In'?'green':p.punchType==='Check Out'?'red':'amber')} style={{minWidth:65,justifyContent:'center',display:'inline-flex'}}>{p.punchType}</span></td>
        </tr>;
      })}</tbody>
    </table></div>
    <div className="table-footer" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
      <span>Feed refreshes every 2-5 seconds | Last 100 punches retained</span>
      <button className="btn btn-outline btn-sm" onClick={function(){toast('Punch_Log_'+fmtD(new Date().toISOString().split('T')[0]).replace(/\//g,'')+'.csv downloaded','success');}}>Export Log</button>
    </div>
  </div>
</div>);}

function Reps({toast,compName,logo,compInfo,onShowPDF}){const[gen,setGen]=useState(false);const[preview,setPreview]=useState(null);
var _rType=useState('Daily Attendance');var rType=_rType[0];var setRType=_rType[1];
var todayStr=new Date().toISOString().split('T')[0];
var _rStart=useState(todayStr);var rStart=_rStart[0];var setRStart=_rStart[1];
var _rEnd=useState(todayStr);var rEnd=_rEnd[0];var setREnd=_rEnd[1];
var _rFmt=useState('CSV (.csv)');var rFmt=_rFmt[0];var setRFmt=_rFmt[1];
var _rDept=useState('All');var rDept=_rDept[0];var setRDept=_rDept[1];
var _rLoc=useState('All');var rLoc=_rLoc[0];var setRLoc=_rLoc[1];
// Enterprise FMCG file naming: MAKSON_{ReportType}_{Dept}_{Location}_{DateRange}_{Timestamp}.ext
var genFileName=function(){
  var typeMap={'Daily Attendance':'DailyAttendance','Monthly Summary':'MonthlySummary','Department-wise':'DeptWise','Location-wise':'LocationWise'};
  var typeCode=typeMap[rType]||'Report';
  var deptCode=rDept==='All'?'AllDepts':rDept.replace(/[^a-zA-Z0-9]/g,'');
  var locCode=rLoc==='All'?'AllLocations':rLoc.split(',')[0].replace(/[^a-zA-Z0-9]/g,'');
  var sp=rStart.split('-');var ep=rEnd.split('-');
  var startStr=sp[2]+sp[1]+sp[0].slice(2);var endStr=ep[2]+ep[1]+ep[0].slice(2);
  var ext=rFmt.includes('xlsx')?'xlsx':'csv';
  var prefix=(compName||'MAKSON').replace(/[^a-zA-Z0-9]/g,'').toUpperCase();
  return prefix+'_'+typeCode+'_'+deptCode+'_'+locCode+'_'+startStr+'-'+endStr+'.'+ext;
};
var genPreview=function(){
  var rows=[];var start=new Date(rStart);var end=new Date(rEnd);
  var activeEmps=EMPS.filter(function(e){return e.status==='Active';});
  if(rDept!=='All')activeEmps=activeEmps.filter(function(e){return e.dept===rDept;});
  if(rLoc!=='All')activeEmps=activeEmps.filter(function(e){return e.loc===rLoc;});
  var days=Math.min(Math.round((end-start)/(1000*60*60*24))+1,7);
  for(var day=0;day<days;day++){var dt=new Date(start);dt.setDate(dt.getDate()+day);var ds=dt.toISOString().split('T')[0];
    genAtt(activeEmps,ds).forEach(function(a){
      rows.push({date:ds,code:a.id,name:a.name,dept:a.dept,loc:a.loc||activeEmps.find(function(e){return e.id===a.id;})?.loc||'-',shift:a.shift,entry:a.st==='Present'?a.ein:'-',exit:a.st==='Present'?a.eout:'-',hours:a.st==='Present'?a.hrs:'-',status:a.st});
    });}return rows;
};
var buildCSV=function(rows,cn,ci){
  var NL=String.fromCharCode(10);
  var L=[];
  L.push('Company,'+(cn||'Makson Group'));
  if(ci&&ci.addr1){L.push('Address,"'+(ci.addr1||'')+(ci.addr2?', '+ci.addr2:'')+(ci.city?', '+ci.city:'')+(ci.state?', '+ci.state:'')+(ci.pincode?' - '+ci.pincode:'')+'"');}
  if(ci&&ci.cin)L.push('CIN,'+ci.cin);
  if(ci&&ci.gstin)L.push('GSTIN,'+ci.gstin);
  if(ci&&ci.pfCode)L.push('PF Code,'+ci.pfCode);
  if(ci&&ci.esiCode)L.push('ESI Code,'+ci.esiCode);
  if(ci&&ci.factoryLic)L.push('Factory License,'+ci.factoryLic);
  L.push('Report Type,'+rType);
  L.push('Date Range,'+fmtD(rStart)+' to '+fmtD(rEnd));
  L.push('Generated,'+new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'}).replace(/\//g,'/'));
  if(ci&&ci.signatory)L.push('Authorized By,'+ci.signatory+(ci.sigDesig?' ('+ci.sigDesig+')':''));
  L.push('');
  L.push('Date,Employee Code,Employee Name,Department,Location,Shift,Entry Time,Exit Time,Hours Worked,Status');
  rows.forEach(function(r){L.push([fmtD(r.date),r.code,'"'+r.name+'"','"'+r.dept+'"','"'+r.loc+'"',r.shift,r.entry,r.exit,r.hours,r.status].join(','));});
  L.push('');
  if(ci&&ci.confNotice)L.push('"'+(ci.confText||'Confidential - Contains employee PII protected under IT Act 2000. Unauthorized distribution prohibited.')+'"');
  return String.fromCharCode(0xFEFF)+L.join(NL);
};
var triggerDL=function(csvStr,fname){
  try{
    var blob=new Blob([csvStr],{type:'text/csv;charset=utf-8'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');a.href=url;a.download=fname;a.style.display='none';
    document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},200);
  }catch(e){
    var dataUri='data:text/csv;charset=utf-8,'+encodeURIComponent(csvStr);
    var a=document.createElement('a');a.href=dataUri;a.download=fname;a.style.display='none';
    document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);},200);
  }
};
var buildPDFHtml=function(rows,cn,ci,lg){
  var fa=(ci&&ci.addr1||'')+(ci&&ci.addr2?', '+ci.addr2:'')+(ci&&ci.city?', '+ci.city:'')+(ci&&ci.state?', '+ci.state:'')+(ci&&ci.pincode?' - '+ci.pincode:'');
  var pres=rows.filter(function(r){return r.status==='Present';}).length;
  var abs=rows.filter(function(r){return r.status==='Absent';}).length;
  var uniq=[];rows.forEach(function(r){if(uniq.indexOf(r.code)<0)uniq.push(r.code);});
  var rate=rows.length>0?Math.round(pres/rows.length*100):0;
  var h='<!DOCTYPE html><html><head><meta charset="utf-8"><title>'+(cn||'Report')+'</title>';
  h+='<style>';
  h+='*{margin:0;padding:0;box-sizing:border-box}';
  h+='body{font-family:Arial,Helvetica,sans-serif;color:#1a1f36;padding:30px 40px;font-size:11px}';
  h+='.hdr{border-bottom:3px solid #1A2878;padding-bottom:14px;margin-bottom:16px}';
  h+='.co{font-size:22px;font-weight:700;color:#1A2878}';
  h+='.ad{font-size:10px;color:#4e5d78;margin-top:3px}';
  h+='.mt{display:flex;gap:14px;margin-top:8px;font-size:9px;color:#8492a6;flex-wrap:wrap}';
  h+='.mt span{background:#eef1f6;padding:2px 8px;border-radius:3px;white-space:nowrap}';
  h+='.rt{font-size:15px;font-weight:700;color:#1A2878;margin-bottom:4px}';
  h+='.rs{font-size:10px;color:#4e5d78;margin-bottom:14px}';
  h+='table{width:100%;border-collapse:collapse;font-size:10px;margin-top:6px}';
  h+='th{background:#1A2878;color:#fff;padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;letter-spacing:.5px}';
  h+='td{padding:5px 8px;border-bottom:1px solid #e2e6ed}';
  h+='tr:nth-child(even){background:#f8f9fb}';
  h+='.p{color:#4a7a16;font-weight:600}.a{color:#E82C2C;font-weight:600}';
  h+='.m{font-family:Consolas,monospace;font-size:10px}';
  h+='.ft{margin-top:24px;padding-top:14px;border-top:1px solid #e2e6ed;font-size:9px;color:#8492a6}';
  h+='.sg{margin-top:30px;width:180px}.sl{border-top:1px solid #4e5d78;padding-top:4px;font-weight:600;color:#1a1f36;font-size:10px}';
  h+='.sd{color:#8492a6;font-size:9px}';
  h+='.cn{margin-top:16px;padding:8px 12px;background:#fef3c7;border:1px solid #fde68a;border-radius:4px;font-size:9px;color:#92400e;text-align:center}';
  h+='.st{display:flex;gap:20px;margin-bottom:12px;font-size:10px}.st strong{font-size:13px}';
  h+='@media print{body{padding:20px}@page{size:A4 landscape;margin:12mm}}';
  h+='.logo-row{display:flex;align-items:center;gap:14px;margin-bottom:8px}';
  h+='.logo-img{width:50px;height:50px;object-fit:contain;border-radius:6px;border:1px solid #e2e6ed;padding:3px;background:#fff}';
  h+='</style></head><body>';
  h+='<div class="hdr">';
  h+='<div class="logo-row">';
  if(lg)h+='<img class="logo-img" src="'+lg+'" alt="Logo"/>';
  h+='<div><div class="co">'+(cn||'Makson Group')+'</div>';
  if(fa)h+='<div class="ad">'+fa+'</div>';
  h+='</div></div>';
  h+='<div class="mt">';
  if(ci&&ci.cin)h+='<span><b>CIN:</b> '+ci.cin+'</span>';
  if(ci&&ci.gstin)h+='<span><b>GSTIN:</b> '+ci.gstin+'</span>';
  if(ci&&ci.pfCode)h+='<span><b>PF:</b> '+ci.pfCode+'</span>';
  if(ci&&ci.esiCode)h+='<span><b>ESI:</b> '+ci.esiCode+'</span>';
  if(ci&&ci.factoryLic)h+='<span><b>Factory Lic:</b> '+ci.factoryLic+'</span>';
  h+='</div></div>';
  h+='<div class="rt">'+rType+'</div>';
  h+='<div class="rs">Period: '+fmtD(rStart)+' to '+fmtD(rEnd)+' &nbsp;|&nbsp; Generated: '+new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'}).replace(/\//g,'/')+'</div>';
  h+='<div class="st"><div><strong>'+rows.length+'</strong> records</div><div><strong>'+pres+'</strong> present</div><div><strong>'+abs+'</strong> absent</div><div><strong>'+uniq.length+'</strong> employees</div><div><strong>'+rate+'%</strong> rate</div></div>';
  h+='<table><thead><tr><th>Date</th><th>Code</th><th>Employee</th><th>Department</th><th>Location</th><th>Shift</th><th>Entry</th><th>Exit</th><th>Hours</th><th>Status</th></tr></thead><tbody>';
  rows.forEach(function(r){
    h+='<tr><td class="m">'+fmtD(r.date)+'</td><td class="m">'+r.code+'</td><td><b>'+r.name+'</b></td><td>'+r.dept+'</td><td>'+r.loc+'</td><td>'+r.shift+'</td><td class="m">'+r.entry+'</td><td class="m">'+r.exit+'</td><td class="m">'+r.hours+'</td><td class="'+(r.status==='Present'?'p':'a')+'">'+r.status+'</td></tr>';
  });
  h+='</tbody></table>';
  h+='<div class="ft"><div style="display:flex;justify-content:space-between;align-items:flex-end">';
  if(ci&&ci.signatory)h+='<div class="sg"><div class="sl">'+ci.signatory+'</div><div class="sd">'+(ci.sigDesig||'Authorized Signatory')+'</div></div>';
  h+='<div style="text-align:right">';
  if(ci&&ci.hrPhone)h+='Contact: '+ci.hrPhone+(ci.hrEmail?' | '+ci.hrEmail:'')+'<br>';
  h+='Generated by MAMS v1.0</div></div>';
  if(ci&&ci.confNotice)h+='<div class="cn">'+(ci.confText||'Confidential - This document contains employee PII protected under the IT Act, 2000. Unauthorized distribution prohibited.')+'</div>';
  h+='</div>';
  h+='<script>window.onload=function(){setTimeout(function(){window.print();},400);};<\/script>';
  h+='</body></html>';
  return h;
};
var triggerPDF=function(rows,fname,cn,ci,lg){
  if(onShowPDF)onShowPDF({rows:rows,fname:fname,cn:cn,ci:ci,lg:lg,rType:rType,dateRange:fmtD(rStart)+' to '+fmtD(rEnd)});
};
var doPreview=function(){setGen(true);setPreview(null);setTimeout(function(){var rows=genPreview();setPreview(rows);setGen(false);toast('Preview loaded - '+rows.length+' records','success');},800);};
var doDownload=function(){setGen(true);setTimeout(function(){var rows=preview||genPreview();var fname=genFileName();triggerDL(buildCSV(rows,compName,compInfo),fname);setGen(false);toast('Downloaded: '+fname,'success');},500);};
var doDownloadPDF=function(){var rows=preview||genPreview();var fname=genFileName().replace(/\.csv$/,'.pdf').replace(/\.xlsx$/,'.pdf');triggerPDF(rows,fname,compName,compInfo,logo);toast('PDF report ready - use Print button to save as PDF','success');};
var doDownloadFromPreview=function(){if(!preview)return;var fname=genFileName();triggerDL(buildCSV(preview,compName,compInfo),fname);toast('Downloaded: '+fname,'success');};
var doDownloadPDFFromPreview=function(){if(!preview)return;var fname=genFileName().replace(/\.csv$/,'.pdf').replace(/\.xlsx$/,'.pdf');triggerPDF(preview,fname,compName,compInfo,logo);toast('PDF report ready','success');};

var prevPresent=preview?preview.filter(function(r){return r.status==='Present';}).length:0;
var prevAbsent=preview?preview.filter(function(r){return r.status==='Absent';}).length:0;
var prevTotal=preview?preview.length:0;
var prevUnique=preview?[...new Set(preview.map(function(r){return r.code;}))].length:0;
var previewFileName=genFileName();
var recentPrefix=(compName||'MAKSON').replace(/[^a-zA-Z0-9]/g,'').toUpperCase();
return<div className="fade-in"><div className="report-config"><div className="config-card"><h3>Report Configuration</h3>
<div className="form-row"><div><label>Report Type</label><select value={rType} onChange={function(e){var t=e.target.value;setRType(t);setPreview(null);var now=new Date();var y=now.getFullYear();var m=now.getMonth();var d=now.getDate();if(t==='Daily Attendance'){setRStart(todayStr);setREnd(todayStr);}else if(t==='Monthly Summary'){var ms=new Date(y,m,1).toISOString().split('T')[0];var me=new Date(y,m+1,0).toISOString().split('T')[0];setRStart(ms);setREnd(me);}else if(t==='Department-wise'||t==='Location-wise'){var ws=new Date(now);ws.setDate(d-now.getDay()+1);setRStart(ws.toISOString().split('T')[0]);setREnd(todayStr);}}}><option>Daily Attendance</option><option>Monthly Summary</option><option>Department-wise</option><option>Location-wise</option></select></div><div><label>Format</label><select value={rFmt} onChange={function(e){setRFmt(e.target.value);}}><option>CSV (.csv)</option><option>Excel (.xlsx)</option></select></div></div>
<div className="form-row"><div><label>Start Date</label><input type="date" value={rStart} onChange={function(e){setRStart(e.target.value);setPreview(null);}}/></div><div><label>End Date</label><input type="date" value={rEnd} onChange={function(e){setREnd(e.target.value);setPreview(null);}}/></div></div>
<div className="form-row"><div><label>Department</label><select value={rDept} onChange={function(e){setRDept(e.target.value);setPreview(null);}}><option>All</option>{DEPTS.map(x=><option key={x}>{x}</option>)}</select></div><div><label>Location</label><select value={rLoc} onChange={function(e){setRLoc(e.target.value);setPreview(null);}}><option>All</option>{LOCS.map(x=><option key={x}>{x}</option>)}</select></div></div>
<div style={{marginTop:12,padding:'8px 12px',background:'var(--surface2)',borderRadius:6,fontSize:11,color:'var(--text3)',display:'flex',alignItems:'center',gap:6}}><span style={{fontWeight:600}}>File name:</span><span className="mono">{previewFileName}</span></div>
<div style={{marginTop:14,display:'flex',gap:10}}>
<button className="btn btn-outline" onClick={doPreview} disabled={gen}>{gen?'Loading...':'Preview'}</button>
<button className="btn btn-primary" onClick={doDownload} disabled={gen}>{Ic.dl} Download CSV</button>
<button className="btn btn-outline" onClick={doDownloadPDF} disabled={gen}>{Ic.dl} Download PDF</button>
</div></div>
<div className="config-card"><h3>Recent Reports</h3>{[
{n:recentPrefix+'_DailyAttendance_AllDepts_AllLocations_140326-200326',d:'19/03/2026',s:'2.4 MB'},
{n:recentPrefix+'_MonthlySummary_AllDepts_AllLocations_010226-280226',d:'01/03/2026',s:'1.8 MB'},
{n:recentPrefix+'_DeptWise_Confectionery_Surendranagar_010326-150326',d:'28/02/2026',s:'980 KB'},
{n:recentPrefix+'_LocationWise_AllDepts_Mandideep_010226-280226',d:'25/02/2026',s:'1.2 MB'}
].map((r,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:i<3?'1px solid var(--surface2)':'none'}}><div style={{flex:1,minWidth:0}}><div className="mono" style={{fontSize:11,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.n}.csv</div><div style={{fontSize:11,color:'var(--text3)'}}>{r.d} - {r.s}</div></div><button className="btn btn-outline btn-sm" style={{marginLeft:12}} onClick={()=>toast(r.n+'.csv downloaded','success')}>{Ic.dl}</button></div>)}</div></div>
{preview&&<div className="table-card" style={{marginTop:20}}>
{/* Preview header - logo + name only (full compliance details appear in PDF/print) */}
<div style={{padding:'14px 20px',borderBottom:'1px solid var(--border)',background:'var(--surface2)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div style={{display:'flex',alignItems:'center',gap:12}}>
{logo&&<img src={logo} alt="Logo" style={{width:40,height:40,objectFit:'contain',borderRadius:6,border:'1px solid var(--border)',padding:2,background:'#fff'}}/>}
<div style={{fontSize:16,fontWeight:700,color:'var(--primary)'}}>{compName||'Makson Group'}</div>
</div>
<div style={{textAlign:'right',fontSize:11,color:'var(--text3)'}}>
<div style={{fontWeight:600,color:'var(--text2)'}}>{rType}</div>
<div>{fmtD(rStart)} to {fmtD(rEnd)}</div>
</div>
</div>
<div className="table-header" style={{flexWrap:'wrap',gap:10}}>
<div><h3>Report Preview</h3><div style={{fontSize:11,color:'var(--text3)',marginTop:4}}>{rType} | {fmtD(rStart)} to {fmtD(rEnd)}{rDept!=='All'?' | '+rDept:''}{rLoc!=='All'?' | '+rLoc:''}</div></div>
<div style={{display:'flex',gap:8}}>
<button className="btn btn-primary btn-sm" onClick={doDownloadFromPreview}>{Ic.dl} CSV</button>
<button className="btn btn-outline btn-sm" onClick={doDownloadPDFFromPreview}>{Ic.dl} PDF</button>
<button className="btn btn-outline btn-sm" onClick={function(){setPreview(null);}}>Close</button>
</div></div>
<div style={{padding:'8px 20px',background:'var(--surface2)',borderBottom:'1px solid var(--border)',fontSize:11,color:'var(--text3)'}}><span className="mono">{previewFileName}</span></div>
<div style={{display:'flex',gap:20,padding:'12px 20px',background:'var(--surface)',borderBottom:'1px solid var(--border)',fontSize:12,flexWrap:'wrap'}}>
<span><strong style={{color:'var(--primary)'}}>{prevTotal.toLocaleString()}</strong> <span style={{color:'var(--text3)'}}>total records</span></span>
<span><strong style={{color:'var(--green)'}}>{prevPresent.toLocaleString()}</strong> <span style={{color:'var(--text3)'}}>present</span></span>
<span><strong style={{color:'var(--red)'}}>{prevAbsent.toLocaleString()}</strong> <span style={{color:'var(--text3)'}}>absent</span></span>
<span><strong style={{color:'var(--primary)'}}>{prevUnique}</strong> <span style={{color:'var(--text3)'}}>employees</span></span>
<span><strong style={{color:'var(--green)'}}>{prevTotal>0?Math.round(prevPresent/prevTotal*100):0}%</strong> <span style={{color:'var(--text3)'}}>attendance rate</span></span>
</div>
<div className="tbl-scroll" style={{maxHeight:400}}><table>
<thead><tr><th>Date</th><th>Code</th><th>Employee</th><th>Department</th><th>Location</th><th>Shift</th><th>Entry</th><th>Exit</th><th>Hours</th><th>Status</th></tr></thead>
<tbody>{preview.slice(0,200).map(function(r,i){return<tr key={i}>
<td className="mono" style={{fontSize:11}}>{fmtD(r.date)}</td><td className="mono" style={{fontSize:11}}>{r.code}</td><td className="emp-name">{r.name}</td><td style={{fontSize:12}}>{r.dept}</td><td style={{fontSize:11}}>{r.loc}</td><td><span className={'badge '+(r.shift==='Day'?'blue':'amber')}>{r.shift}</span></td><td className="mono time">{r.entry}</td><td className="mono time">{r.exit}</td><td className="mono time">{r.hours}</td><td><span className={'badge '+(r.status==='Present'?'green':'red')}>{r.status}</span></td>
</tr>;})}</tbody></table></div>
<div className="table-footer" style={{display:'flex',justifyContent:'space-between'}}><span>Showing {Math.min(200,preview.length)} of {preview.length.toLocaleString()} records{preview.length>200?' (preview capped at 200)':''}</span><span style={{fontSize:11,color:'var(--text2)'}}>Download as CSV or PDF using the buttons above</span></div>
{/* Report footer - confidentiality + print note */}
<div style={{padding:'14px 20px',borderTop:'1px solid var(--border)',background:'var(--surface2)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',flexWrap:'wrap',gap:12}}>
{compInfo&&compInfo.signatory&&<div style={{fontSize:11,color:'var(--text3)',fontStyle:'italic',display:'flex',alignItems:'center',gap:6}}>
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
Authorized signatory details will appear on downloaded PDF/print only
</div>}
<div style={{fontSize:10,color:'var(--text3)',textAlign:'right'}}>
{compInfo&&compInfo.hrPhone&&<div>Contact: {compInfo.hrPhone}{compInfo.hrEmail?' | '+compInfo.hrEmail:''}</div>}
<div style={{marginTop:2}}>Generated by MAMS v1.0 | Page 1 of 1</div>
</div>
</div>
{compInfo&&compInfo.confNotice&&<div style={{marginTop:10,padding:'8px 12px',background:'var(--amber-bg)',borderRadius:6,fontSize:10,color:'#92400e',textAlign:'center',fontWeight:500}}>{compInfo.confText||'Confidential - This document contains employee PII protected under the IT Act, 2000. Unauthorized distribution prohibited.'}</div>}
</div>
</div>}



</div>;}

function Adj({toast}){
var _tab=useState('queue');var tab=_tab[0];var setTab=_tab[1];
var _modal=useState(false);var modal=_modal[0];var setModal=_modal[1];
var _selEmp=useState('');var selEmp=_selEmp[0];var setSelEmp=_selEmp[1];
var _adjDates=useState([]);var adjDates=_adjDates[0];var setAdjDates=_adjDates[1];
var _reason=useState('');var reason=_reason[0];var setReason=_reason[1];
var _adjType=useState('mark_absent');var adjType=_adjType[0];var setAdjType=_adjType[1];
var _approveModal=useState(null);var approveModal=_approveModal[0];var setApproveModal=_approveModal[1];
var _approverNotes=useState('');var approverNotes=_approverNotes[0];var setApproverNotes=_approverNotes[1];
var _bulkSelected=useState({});var bulkSelected=_bulkSelected[0];var setBulkSelected=_bulkSelected[1];

// Demo adjustment data
var _adjustments=useState([
{id:'ADJ001',empId:'MKS0008',empName:'Ramesh Solanki',dept:'Confectionery',month:'March 2026',dates:['2026-03-05','2026-03-06','2026-03-07','2026-03-12','2026-03-13','2026-03-14','2026-03-18','2026-03-19','2026-03-20','2026-03-25','2026-03-26'],type:'mark_absent',reason:'Employee absent without leave application. No biometric punches recorded on device for 11 days.',
justification:'Real attendance: 15 days (biometric confirmed). Dummy auto-generated: 26 days. Mismatch: 11 days. Without this adjustment, payroll would pay for 11 unworked days. The compliance record must show 15 days so salary deduction is legally valid under Payment of Wages Act, 1936.',
evidence:'Zero punches on device BIO008 for 11 dates. Cross-verified with shift supervisor Ravi Mehta. No leave application found in HR records.',
salaryImpact:'Deduction of 11 days pro-rata salary (approx 42% of monthly gross)',
beforeDays:26,afterDays:15,impact:42.3,status:'pending',requestedBy:'Priya Patel',requestedAt:'28/03/2026 10:30 AM',approvedBy:null,approvedAt:null,notes:null},
{id:'ADJ002',empId:'MKS0023',empName:'Dinesh Parmar',dept:'Packaging',month:'March 2026',dates:['2026-03-10','2026-03-11','2026-03-17'],type:'mark_absent',reason:'Unauthorised absence. HR verified - employee did not report to any shift.',
justification:'Real attendance: 23 days (biometric confirmed). Dummy auto-generated: 26 days. Mismatch: 3 days. Employee did not submit any leave application. Verbal enquiry revealed personal reasons. Adjustment needed so payroll deducts 3 days accurately.',
evidence:'Biometric device BIO023 shows no punches on 10/03, 11/03, 17/03. Shift supervisor confirmed absence. No leave record on file.',
salaryImpact:'Deduction of 3 days pro-rata salary (approx 11.5% of monthly gross)',
beforeDays:26,afterDays:23,impact:11.5,status:'pending',requestedBy:'Priya Patel',requestedAt:'27/03/2026 04:15 PM',approvedBy:null,approvedAt:null,notes:null},
{id:'ADJ003',empId:'MKS0015',empName:'Suresh Jadeja',dept:'Quality Control',month:'February 2026',dates:['2026-02-03','2026-02-04','2026-02-05','2026-02-06','2026-02-07'],type:'mark_absent',reason:'Medical leave without documentation. Employee could not provide medical certificate.',
justification:'Real attendance: 19 days (biometric confirmed). Dummy auto-generated: 24 days. Mismatch: 5 days. Employee claimed illness but could not produce medical certificate. As per company medical leave policy, unpaid leave applies when no documentation is provided and PL/SL balance is zero.',
evidence:'Biometric device BIO015 - no punches for 5 consecutive days. Employee returned on 08/02. No medical certificate submitted despite 3 reminders. PL balance: 0, SL balance: 0.',
salaryImpact:'Deduction of 5 days - ESI medical benefit not applicable without documentation',
beforeDays:24,afterDays:19,impact:20.8,status:'approved',requestedBy:'Priya Patel',requestedAt:'25/02/2026 11:00 AM',approvedBy:'Kalpesh Makasana',approvedAt:'25/02/2026 03:45 PM',notes:'Verified with factory supervisor. Employee was absent. Salary deduction approved.'},
{id:'ADJ004',empId:'MKS0031',empName:'Bhavna Mehta',dept:'Confectionery',month:'February 2026',dates:['2026-02-14','2026-02-15'],type:'mark_absent',reason:'Absent without information. Biometric shows no punches.',
justification:'HR flagged 2 days as unauthorized absence. However, during review it was found that shift supervisor Mahesh Patel had verbally approved half-day leave on both dates. Partial biometric punches exist (morning only). Late leave application was submitted and approved.',
evidence:'Partial biometric punches on BIO031 (morning punch present, no exit). Shift supervisor Mahesh Patel provided written confirmation. Leave application backdated and approved by HR Head.',
salaryImpact:'No deduction - leave approved retrospectively',
beforeDays:24,afterDays:22,impact:8.3,status:'rejected',requestedBy:'Rajesh Shah',requestedAt:'24/02/2026 09:30 AM',approvedBy:'Kalpesh Makasana',approvedAt:'24/02/2026 02:00 PM',notes:'Employee submitted late leave application. Approved as paid leave instead. No salary deduction.'}
]);var adjustments=_adjustments[0];var setAdjustments=_adjustments[1];

var pending=adjustments.filter(function(a){return a.status==='pending';});
var approved=adjustments.filter(function(a){return a.status==='approved';});
var rejected=adjustments.filter(function(a){return a.status==='rejected';});

var selEmpData=selEmp?EMPS.find(function(e){return e.id===selEmp;}):null;

// Calculate dummy vs real days for selected employee
var dummyDays=26;
var realPresent=selEmpData?Math.floor(Math.random()*12+14):0;
var absentDays=dummyDays-realPresent;

var submitAdj=function(){
  if(!selEmp){toast('Please select an employee','error');return;}
  if(!reason.trim()){toast('Please enter a reason','error');return;}
  if(absentDays<=0){toast('No days to adjust - employee has full attendance','error');return;}
  var newAdj={id:'ADJ'+String(adjustments.length+1).padStart(3,'0'),empId:selEmp,empName:selEmpData?selEmpData.name:'',dept:selEmpData?selEmpData.dept:'',month:'March 2026',dates:Array.from({length:absentDays},function(_,i){return '2026-03-'+String(i+3).padStart(2,'0');}),type:adjType,reason:reason,beforeDays:dummyDays,afterDays:realPresent,impact:Math.round((absentDays/dummyDays)*1000)/10,status:'pending',requestedBy:'Priya Patel',requestedAt:new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Kolkata'}),approvedBy:null,approvedAt:null,notes:null};
  setAdjustments(function(p){return[newAdj].concat(p);});
  setModal(false);setSelEmp('');setReason('');
  toast('Adjustment request submitted for approval','success');
};

var approveAdj=function(id){
  setAdjustments(function(p){return p.map(function(a){if(a.id===id)return Object.assign({},a,{status:'approved',approvedBy:'Kalpesh Makasana',approvedAt:new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Kolkata'}),notes:approverNotes||'Approved. Salary deduction authorised.'});return a;});});
  setApproveModal(null);setApproverNotes('');
  toast('Adjustment approved - compliant data updated','success');
};

var rejectAdj=function(id){
  setAdjustments(function(p){return p.map(function(a){if(a.id===id)return Object.assign({},a,{status:'rejected',approvedBy:'Kalpesh Makasana',approvedAt:new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Kolkata'}),notes:approverNotes||'Rejected. No changes to compliant data.'});return a;});});
  setApproveModal(null);setApproverNotes('');
  toast('Adjustment rejected','info');
};

var statusColor=function(s){return s==='pending'?'amber':s==='approved'?'green':'red';};

var bulkCount=Object.keys(bulkSelected).filter(function(k){return bulkSelected[k];}).length;
var toggleBulk=function(id){setBulkSelected(function(p){var n=Object.assign({},p);n[id]=!n[id];return n;});};
var toggleAllPending=function(){var allChecked=pending.every(function(a){return bulkSelected[a.id];});var n={};pending.forEach(function(a){n[a.id]=!allChecked;});setBulkSelected(n);};
var bulkApprove=function(){
  var ids=Object.keys(bulkSelected).filter(function(k){return bulkSelected[k];});
  var ts=new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Kolkata'});
  setAdjustments(function(p){return p.map(function(a){
    if(ids.indexOf(a.id)>=0&&a.status==='pending')return Object.assign({},a,{status:'approved',approvedBy:'Kalpesh Makasana',approvedAt:ts,notes:'Bulk approved. Salary deductions authorised.'});
    return a;});});
  setBulkSelected({});
  toast(ids.length+' adjustment(s) approved in bulk','success');
};
var bulkReject=function(){
  var ids=Object.keys(bulkSelected).filter(function(k){return bulkSelected[k];});
  var ts=new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'})+' '+new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:'Asia/Kolkata'});
  setAdjustments(function(p){return p.map(function(a){
    if(ids.indexOf(a.id)>=0&&a.status==='pending')return Object.assign({},a,{status:'rejected',approvedBy:'Kalpesh Makasana',approvedAt:ts,notes:'Bulk rejected. No changes applied.'});
    return a;});});
  setBulkSelected({});
  toast(ids.length+' adjustment(s) rejected in bulk','info');
};

var filtered=tab==='queue'?pending:tab==='approved'?approved:tab==='rejected'?rejected:adjustments;

return<div className="fade-in">
{/* NEW ADJUSTMENT MODAL */}
{modal&&<Modal title="Request Attendance Adjustment" onClose={function(){setModal(false);setSelEmp('');setReason('');}}>
<div style={{padding:'10px 14px',background:'var(--surface2)',borderRadius:8,marginBottom:16,fontSize:11,color:'var(--text2)',lineHeight:1.6}}>
<span className="tip-icon" data-tip="This form lets HR request an adjustment to an employee's compliant (dummy) attendance data. When actual attendance is less than what the system auto-generated, use this to sync them so payroll deductions are legally backed by official records.">i</span> <strong>When to use:</strong> When an employee's actual working days are fewer than the auto-generated compliant days, and you need to deduct salary legally. The adjustment modifies the compliant data to match reality.
</div>
<div className="form-group"><div className="lbl-tip"><label>Select Employee</label><span className="tip-icon" data-tip="Choose the employee whose compliant attendance needs adjustment. The system will show their current compliant vs actual days.">i</span></div><select value={selEmp} onChange={function(e){setSelEmp(e.target.value);}}><option value="">-- Select Employee --</option>{EMPS.filter(function(e){return e.status==='Active';}).map(function(e){return<option key={e.id} value={e.id}>{e.id} - {e.name} ({e.dept})</option>;})}</select></div>

{selEmpData&&<div style={{padding:'12px 14px',background:'var(--surface2)',borderRadius:8,marginBottom:14,border:'1px solid var(--border)'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
<div><div style={{fontWeight:700,fontSize:14}}>{selEmpData.name}</div><div style={{fontSize:11,color:'var(--text3)'}}>{selEmpData.id} | {selEmpData.dept} | {selEmpData.loc}</div></div>
<span className="badge amber">March 2026</span>
</div>
<div style={{display:'flex',gap:16}}>
<div style={{flex:1,padding:'10px 14px',background:'#fff',borderRadius:8,border:'1px solid var(--border)',textAlign:'center'}}>
<div className="lbl-tip" style={{justifyContent:'center'}}><div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.5px'}}>Compliant Days</div><span className="tip-icon" data-tip="Days the Smart Anchor auto-generated in the compliant (8-hour) view. Currently set to the standard working days for this month.">i</span></div>
<div style={{fontSize:24,fontWeight:700,color:'var(--primary)'}}>{dummyDays}</div>
</div>
<div style={{flex:1,padding:'10px 14px',background:'#fff',borderRadius:8,border:'1px solid var(--border)',textAlign:'center'}}>
<div className="lbl-tip" style={{justifyContent:'center'}}><div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.5px'}}>Actual Present</div><span className="tip-icon" data-tip="Days this employee actually showed up and punched on the biometric device. This is from the real (12-hour) attendance data.">i</span></div>
<div style={{fontSize:24,fontWeight:700,color:realPresent<dummyDays?'var(--red)':'var(--green)'}}>{realPresent}</div>
</div>
<div style={{flex:1,padding:'10px 14px',background:absentDays>0?'var(--amber-bg)':'#f0fdf4',borderRadius:8,border:'1px solid '+(absentDays>0?'#fde68a':'#bbf7d0'),textAlign:'center'}}>
<div className="lbl-tip" style={{justifyContent:'center'}}><div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.5px'}}>Difference</div><span className="tip-icon" data-tip="Number of days to deduct from compliant data. After approval, the system will mark these specific dates as Absent in the compliance view, making salary deduction legally valid.">i</span></div>
<div style={{fontSize:24,fontWeight:700,color:absentDays>0?'#92400e':'var(--green)'}}>{absentDays>0?'-'+absentDays:'0'}</div>
</div>
</div>
{absentDays>0&&<div style={{marginTop:10,padding:'8px 12px',background:'var(--amber-bg)',borderRadius:6,fontSize:11,color:'#92400e',display:'flex',alignItems:'center',gap:6}}>
<strong>Impact:</strong> Compliant days will change from {dummyDays} to {realPresent}. Salary deduction: {Math.round((absentDays/dummyDays)*1000)/10}% of monthly pay.
</div>}
</div>}

<div className="form-group"><div className="lbl-tip"><label>Adjustment Type</label><span className="tip-icon" data-tip="Mark Absent: Changes selected dates from Present to Absent in compliant view. This is the most common action for salary deduction. Mark Present: Reverses a previous absence (rare). Modify Hours: Changes the hours without changing status (for partial day adjustments).">i</span></div><select value={adjType} onChange={function(e){setAdjType(e.target.value);}}><option value="mark_absent">Mark as Absent in Compliant View</option><option value="mark_present">Mark as Present (Reverse Absence)</option><option value="modify_hours">Modify Working Hours</option></select></div>

<div className="form-group"><div className="lbl-tip"><label>Reason for Adjustment</label><span className="tip-icon" data-tip="This reason is stored in the audit trail and visible to the approver. Be specific - mention why the employee was absent and any supporting evidence. This becomes part of the compliance record.">i</span></div><textarea style={{width:'100%',minHeight:80,padding:'8px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:12,fontFamily:'inherit',resize:'vertical'}} value={reason} onChange={function(e){setReason(e.target.value);}} placeholder="e.g. Employee absent without leave application. No biometric punches recorded on device for the above dates. Verified with floor supervisor."/></div>

<div className="modal-actions">
<button className="btn btn-outline" onClick={function(){setModal(false);setSelEmp('');setReason('');}}>Cancel</button>
<button className="btn btn-primary" onClick={submitAdj} disabled={!selEmp||!reason.trim()||absentDays<=0}>Submit for Approval</button>
</div>
</Modal>}

{/* APPROVE/REJECT MODAL */}
{approveModal&&<Modal title={'Review Adjustment - '+approveModal.id} onClose={function(){setApproveModal(null);setApproverNotes('');}}>
<div style={{padding:'14px',background:'var(--surface2)',borderRadius:8,marginBottom:16}}>
<div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
<div><strong style={{fontSize:14}}>{approveModal.empName}</strong><div style={{fontSize:11,color:'var(--text3)'}}>{approveModal.empId} | {approveModal.dept}</div></div>
<span className="badge amber">{approveModal.month}</span>
</div>
<div style={{fontSize:12,marginBottom:8}}><strong>Reason:</strong> {approveModal.reason}</div>
{approveModal.justification&&<div style={{fontSize:11,marginBottom:8,padding:'10px 14px',background:'#f8f9fb',borderRadius:6,borderLeft:'3px solid var(--primary)',lineHeight:1.6}}><div style={{fontWeight:600,color:'var(--primary)',marginBottom:3,fontSize:10,textTransform:'uppercase'}}>Justification</div>{approveModal.justification}</div>}
{approveModal.evidence&&<div style={{fontSize:11,marginBottom:8,padding:'8px 14px',background:'#f0f8ff',borderRadius:6,borderLeft:'3px solid #3b82f6',lineHeight:1.5}}><div style={{fontWeight:600,color:'#1e40af',marginBottom:3,fontSize:10,textTransform:'uppercase'}}>Evidence</div>{approveModal.evidence}</div>}
{approveModal.salaryImpact&&<div style={{fontSize:11,marginBottom:8,padding:'6px 12px',background:'var(--amber-bg)',borderRadius:6,color:'#92400e'}}><strong>Salary Impact:</strong> {approveModal.salaryImpact}</div>}
<div style={{display:'flex',gap:12,marginBottom:8}}>
<div style={{padding:'8px 12px',background:'#fff',borderRadius:6,border:'1px solid var(--border)',fontSize:11,textAlign:'center'}}><div style={{color:'var(--text3)',fontSize:9,textTransform:'uppercase'}}>Compliant Now</div><strong style={{fontSize:18,color:'var(--primary)'}}>{approveModal.beforeDays}</strong> days</div>
<div style={{padding:'8px 12px',fontSize:20,display:'flex',alignItems:'center',color:'var(--text3)'}}>→</div>
<div style={{padding:'8px 12px',background:'#fff',borderRadius:6,border:'1px solid var(--border)',fontSize:11,textAlign:'center'}}><div style={{color:'var(--text3)',fontSize:9,textTransform:'uppercase'}}>After Adjustment</div><strong style={{fontSize:18,color:'var(--red)'}}>{approveModal.afterDays}</strong> days</div>
<div style={{padding:'8px 12px',background:'var(--amber-bg)',borderRadius:6,border:'1px solid #fde68a',fontSize:11,textAlign:'center'}}><div style={{color:'#92400e',fontSize:9,textTransform:'uppercase'}}>Salary Impact</div><strong style={{fontSize:18,color:'#92400e'}}>{approveModal.impact}%</strong> deduction</div>
</div>
<div style={{fontSize:11,color:'var(--text3)'}}>Dates affected: {approveModal.dates.length} days | Requested by: {approveModal.requestedBy} | {approveModal.requestedAt}</div>
</div>
<div className="form-group"><div className="lbl-tip"><label>Approver Notes</label><span className="tip-icon" data-tip="Your notes are permanently recorded in the audit trail. Explain your decision - especially for rejections. This is the official record if an auditor asks why compliant data was modified.">i</span></div><textarea style={{width:'100%',minHeight:60,padding:'8px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:12,fontFamily:'inherit',resize:'vertical'}} value={approverNotes} onChange={function(e){setApproverNotes(e.target.value);}} placeholder="e.g. Verified with factory supervisor. Employee was absent. Salary deduction approved."/></div>
<div className="modal-actions">
<button className="btn btn-outline" onClick={function(){setApproveModal(null);setApproverNotes('');}}>Cancel</button>
<button className="btn" style={{background:'var(--red)',color:'#fff',border:'none'}} onClick={function(){rejectAdj(approveModal.id);}}>Reject</button>
<button className="btn btn-primary" style={{background:'var(--green)',border:'none'}} onClick={function(){approveAdj(approveModal.id);}}>Approve Adjustment</button>
</div>
</Modal>}

{/* STATS TILES */}
<div className="stats-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
<div className={'stat-card c1'+(tab==='all'?' selected':'')} onClick={function(){setTab('all');}}><div className="click-hint">Click to filter</div><div className="stat-label">Total Adjustments</div><div className="stat-value">{adjustments.length}</div><div className="stat-sub">all time</div></div>
<div className={'stat-card c4'+(tab==='queue'?' selected':'')} onClick={function(){setTab('queue');}}><div className="click-hint">Click to filter</div><div className="stat-label">Pending Approval</div><div className="stat-value">{pending.length}</div><div className="stat-sub">{pending.length>0?'requires action':'all clear'}</div></div>
<div className={'stat-card c2'+(tab==='approved'?' selected':'')} onClick={function(){setTab('approved');}}><div className="click-hint">Click to filter</div><div className="stat-label">Approved</div><div className="stat-value">{approved.length}</div><div className="stat-sub">salary deduction applied</div></div>
<div className={'stat-card c3'+(tab==='rejected'?' selected':'')} onClick={function(){setTab('rejected');}}><div className="click-hint">Click to filter</div><div className="stat-label">Rejected</div><div className="stat-value">{rejected.length}</div><div className="stat-sub">no changes made</div></div>
</div>

{/* HOW IT WORKS INFO BOX */}
<div style={{padding:'12px 16px',background:'var(--surface2)',borderRadius:8,marginBottom:16,fontSize:12,color:'var(--text2)',lineHeight:1.7,border:'1px solid var(--border)'}}>
<strong style={{color:'var(--text)'}}>How Attendance Adjustment Works:</strong> When an employee's actual attendance (biometric punches) is lower than the auto-generated compliant data, HR can request an adjustment. Once approved by the designated authority, the system marks the absent dates in the compliant view, making salary deductions legally backed by official records. Every adjustment is permanently logged in an immutable audit trail.
</div>

{/* ACTION BAR */}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
<div style={{display:'flex',gap:6}}>
{['queue','approved','rejected','all'].map(function(t){return<button key={t} className={'btn btn-sm '+(tab===t?'btn-primary':'btn-outline')} onClick={function(){setTab(t);setBulkSelected({});}}>{t==='queue'?'Pending ('+pending.length+')':t==='approved'?'Approved':t==='rejected'?'Rejected':'All'}</button>;})}
</div>
<button className="btn btn-primary" onClick={function(){setModal(true);}}><span style={{marginRight:6}}>+</span> New Adjustment</button>
</div>

{/* BULK ACTION BAR - appears when pending tab and items exist */}
{tab==='queue'&&pending.length>0&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 16px',background:bulkCount>0?'#eef2ff':'var(--surface2)',borderRadius:8,marginBottom:14,border:'1.5px solid '+(bulkCount>0?'var(--primary-light)':'var(--border)'),transition:'.2s'}}>
<div style={{display:'flex',alignItems:'center',gap:10}}>
<label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12,fontWeight:500}}>
<input type="checkbox" checked={pending.length>0&&pending.every(function(a){return bulkSelected[a.id];})} onChange={toggleAllPending} style={{accentColor:'var(--primary)',width:16,height:16}}/>
Select All Pending ({pending.length})
</label>
{bulkCount>0&&<span style={{fontSize:12,color:'var(--primary)',fontWeight:600}}>{bulkCount} selected</span>}
</div>
{bulkCount>0&&<div style={{display:'flex',gap:8}}>
<button className="btn btn-sm" style={{background:'var(--green)',color:'#fff',border:'none'}} onClick={bulkApprove}>Approve {bulkCount} Selected</button>
<button className="btn btn-outline btn-sm" style={{color:'var(--red)',borderColor:'var(--red)'}} onClick={bulkReject}>Reject {bulkCount}</button>
</div>}
</div>}

{/* ADJUSTMENT CARDS */}
{filtered.length===0&&<div style={{textAlign:'center',padding:'40px 20px',color:'var(--text3)'}}>
<div style={{fontSize:40,marginBottom:8,opacity:.3}}>&#9881;</div>
<div style={{fontSize:14,fontWeight:600,marginBottom:4}}>No {tab==='queue'?'pending':tab==='all'?'':tab} adjustments</div>
<div style={{fontSize:12}}>{tab==='queue'?'All caught up! No adjustments waiting for approval.':'No records found in this category.'}</div>
</div>}

{filtered.map(function(adj){return<div key={adj.id} className="table-card" style={{marginBottom:14,border:bulkSelected[adj.id]?'1.5px solid var(--primary)':'',transition:'.15s'}}>
<div style={{padding:'16px 20px'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
<div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
{adj.status==='pending'&&<input type="checkbox" checked={!!bulkSelected[adj.id]} onChange={function(){toggleBulk(adj.id);}} style={{accentColor:'var(--primary)',width:18,height:18,marginTop:3,cursor:'pointer',flexShrink:0}}/>}
<div>
<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
<span className="mono" style={{fontSize:11,color:'var(--text3)'}}>{adj.id}</span>
<span className={'badge '+statusColor(adj.status)}>{adj.status.charAt(0).toUpperCase()+adj.status.slice(1)}</span>
<span className="badge blue">{adj.type==='mark_absent'?'Mark Absent':adj.type==='mark_present'?'Mark Present':'Modify Hours'}</span>
</div>
<div style={{fontSize:16,fontWeight:700,color:'var(--text)'}}>{adj.empName}</div>
<div style={{fontSize:11,color:'var(--text3)'}}>{adj.empId} | {adj.dept} | {adj.month}</div>
</div></div>
<div style={{display:'flex',gap:10,alignItems:'center'}}>
<div style={{textAlign:'center',padding:'6px 12px',background:'var(--surface2)',borderRadius:6}}>
<div style={{fontSize:9,color:'var(--text3)',textTransform:'uppercase'}}>Before</div>
<div style={{fontSize:18,fontWeight:700,color:'var(--primary)'}}>{adj.beforeDays}</div>
</div>
<span style={{fontSize:16,color:'var(--text3)'}}>→</span>
<div style={{textAlign:'center',padding:'6px 12px',background:'var(--surface2)',borderRadius:6}}>
<div style={{fontSize:9,color:'var(--text3)',textTransform:'uppercase'}}>After</div>
<div style={{fontSize:18,fontWeight:700,color:'var(--red)'}}>{adj.afterDays}</div>
</div>
<div style={{textAlign:'center',padding:'6px 12px',background:'var(--amber-bg)',borderRadius:6}}>
<div style={{fontSize:9,color:'#92400e',textTransform:'uppercase'}}>Impact</div>
<div style={{fontSize:14,fontWeight:700,color:'#92400e'}}>{adj.impact}%</div>
</div>
</div>
</div>

<div style={{fontSize:12,color:'var(--text2)',marginBottom:8,lineHeight:1.5}}><strong>Reason:</strong> {adj.reason}</div>
{adj.justification&&<div style={{fontSize:11,color:'var(--text2)',marginBottom:8,lineHeight:1.6,padding:'10px 14px',background:'var(--surface2)',borderRadius:6,borderLeft:'3px solid var(--primary)'}}>
<div style={{fontWeight:600,color:'var(--primary)',marginBottom:4,fontSize:10,textTransform:'uppercase',letterSpacing:'.5px'}}>Justification <span className="tip-icon" data-tip="Detailed business justification explaining why this adjustment is necessary. Covers the mismatch between real and dummy data, legal basis for salary deduction, and payroll impact.">i</span></div>
{adj.justification}
</div>}
{adj.evidence&&<div style={{fontSize:11,color:'var(--text2)',marginBottom:8,lineHeight:1.5,padding:'8px 14px',background:'#f0f8ff',borderRadius:6,borderLeft:'3px solid #3b82f6'}}>
<div style={{fontWeight:600,color:'#1e40af',marginBottom:3,fontSize:10,textTransform:'uppercase',letterSpacing:'.5px'}}>Supporting Evidence <span className="tip-icon" data-tip="Documented proof supporting this adjustment - biometric records, supervisor confirmations, medical documents, leave records. This forms the audit trail if questioned by inspectors.">i</span></div>
{adj.evidence}
</div>}
{adj.salaryImpact&&<div style={{fontSize:11,color:'#92400e',marginBottom:8,padding:'6px 12px',background:'var(--amber-bg)',borderRadius:6,display:'flex',alignItems:'center',gap:6}}>
<strong>Salary Impact:</strong> {adj.salaryImpact}
</div>}
<div style={{fontSize:11,color:'var(--text3)',marginBottom:8}}>Dates affected: <span className="mono">{adj.dates.length} days</span> | Requested by: <strong>{adj.requestedBy}</strong> | {adj.requestedAt}</div>

{adj.status!=='pending'&&<div style={{padding:'10px 14px',background:adj.status==='approved'?'#f0fdf4':'#fef2f2',borderRadius:6,border:'1px solid '+(adj.status==='approved'?'#bbf7d0':'#fecaca'),fontSize:11,marginBottom:8}}>
<div style={{fontWeight:600,color:adj.status==='approved'?'#4a7a16':'#E82C2C'}}>{adj.status==='approved'?'Approved':'Rejected'} by {adj.approvedBy} | {adj.approvedAt}</div>
{adj.notes&&<div style={{marginTop:4,color:'var(--text2)'}}><strong>Notes:</strong> {adj.notes}</div>}
</div>}

{adj.status==='pending'&&<div style={{display:'flex',gap:8,marginTop:8}}>
<button className="btn btn-sm" style={{background:'var(--green)',color:'#fff',border:'none'}} onClick={function(){setApproveModal(adj);setApproverNotes('');}}>Review & Approve</button>
<button className="btn btn-outline btn-sm" style={{color:'var(--red)',borderColor:'var(--red)'}} onClick={function(){setApproveModal(adj);setApproverNotes('');}}>Review & Reject</button>
</div>}
</div>
</div>;})}
</div>;}


function Devs(){const onC=DEVS.filter(x=>x.on).length;const offC=DEVS.length-onC;
const[tile,setTile]=useState(null);const[locF,setLocF]=useState('All');const[search,setSearch]=useState('');
const[syncing,setSyncing]=useState({});
const[lastSync,setLastSync]=useState(function(){var o={};DEVS.forEach(function(d){o[d.id]=d.on?Math.floor(Math.random()*5+1)+'m ago':'47m ago';});return o;});
const[pendingTx,setPendingTx]=useState(function(){var o={};DEVS.forEach(function(d){o[d.id]=d.on?0:Math.floor(Math.random()*800+200);});return o;});
const clickTile=t=>{if(tile===t)setTile(null);else setTile(t);};
const resetAll=()=>{setTile(null);setLocF('All');setSearch('');};
const isModified=tile!==null||locF!=='All'||search;
const devLocs=[...new Set(DEVS.map(d=>d.loc))];
const filtered=useMemo(()=>{let r=DEVS;if(tile==='online')r=r.filter(d=>d.on);if(tile==='offline')r=r.filter(d=>!d.on);if(tile==='pending')r=r.filter(d=>(pendingTx[d.id]||0)>0);if(locF!=='All')r=r.filter(d=>d.loc===locF);if(search)r=r.filter(d=>d.name.toLowerCase().includes(search.toLowerCase())||d.model.toLowerCase().includes(search.toLowerCase())||d.id.toLowerCase().includes(search.toLowerCase()));return r;},[tile,locF,search,pendingTx]);

var handleSync=function(devId){
  setSyncing(function(p){var n=Object.assign({},p);n[devId]=true;return n;});
  setTimeout(function(){
    setSyncing(function(p){var n=Object.assign({},p);n[devId]=false;return n;});
    setLastSync(function(p){var n=Object.assign({},p);n[devId]='just now';return n;});
    setPendingTx(function(p){var n=Object.assign({},p);n[devId]=0;return n;});
  },2500);
};

var handleSyncAll=function(){
  DEVS.forEach(function(d){handleSync(d.id);});
};

var totalPending=Object.values(pendingTx).reduce(function(a,b){return a+b;},0);

return<div className="fade-in">
{isModified&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,padding:'10px 16px',background:'var(--primary-bg)',borderRadius:8,border:'1px solid #c5cae9'}}>
<span style={{fontSize:13,color:'var(--primary)',fontWeight:500}}>Filtered: <strong>{filtered.length} devices</strong>{tile&&<span> / {tile}</span>}{locF!=='All'&&<span> / {locF}</span>}{search&&<span> / "{search}"</span>}</span>
<button className="btn btn-primary btn-sm" onClick={resetAll}>Reset to Default View</button></div>}

{/* Sync Status Banner */}
{totalPending>0&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,padding:'12px 16px',background:'var(--amber-bg)',borderRadius:8,border:'1px solid #fde68a'}}>
<div><span style={{fontSize:13,fontWeight:600,color:'#92400e'}}>&#9888;&#65039; {totalPending.toLocaleString()} pending transactions</span><span style={{fontSize:12,color:'#92400e',marginLeft:8}}>from {Object.values(pendingTx).filter(function(v){return v>0;}).length} offline device(s). Data will auto-sync when devices reconnect.</span></div>
<button className="btn btn-sm" style={{background:'#92400e',color:'#fff',border:'none',borderRadius:16}} onClick={handleSyncAll}>Sync All Now</button>
</div>}

{totalPending===0&&<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:16,padding:'10px 16px',background:'var(--green-bg)',borderRadius:8,border:'1px solid #c6e6a0'}}>
<span className="live-dot"></span><span style={{fontSize:13,color:'#4a7a16',fontWeight:500}}>All devices synced. No pending transactions.</span>
</div>}

<div className="stats-grid" style={{gridTemplateColumns:'repeat(4,1fr)'}}>
<div className={'stat-card c1'+(tile==='total'?' selected':'')} onClick={()=>clickTile('total')}><div className="click-hint">Click to filter</div><div className="stat-label">Total</div><div className="stat-value">{DEVS.length}</div><div className="stat-sub">across {devLocs.length} locations</div></div>
<div className={'stat-card c2'+(tile==='online'?' selected':'')} onClick={()=>clickTile('online')}><div className="click-hint">Click to filter</div><div className="stat-label">Online</div><div className="stat-value">{onC}</div><div className="stat-sub">{Math.round(onC/DEVS.length*100)}% connected</div></div>
<div className={'stat-card c3'+(tile==='offline'?' selected':'')} onClick={()=>clickTile('offline')}><div className="click-hint">Click to filter</div><div className="stat-label">Offline</div><div className="stat-value">{offC}</div><div className="stat-sub">needs attention</div></div>
<div className={'stat-card c4'+(tile==='pending'?' selected':'')} onClick={()=>clickTile('pending')}><div className="click-hint">Click to filter</div><div className="stat-label">Pending Sync</div><div className="stat-value">{totalPending.toLocaleString()}</div><div className="stat-sub">{totalPending>0?'transactions buffered':'all clear'}</div></div>
</div>

{/* Offline buffer info */}
<div style={{padding:'10px 16px',background:'var(--surface2)',borderRadius:8,marginBottom:16,fontSize:12,color:'var(--text2)',lineHeight:1.6,border:'1px solid var(--border)'}}>
<strong style={{color:'var(--text)'}}>Offline Data Protection:</strong> Each OTLBIO 101+ device stores up to 100,000 transactions locally with built-in battery backup. During power or network outages, no punch data is lost. When connectivity restores, the device automatically pushes all buffered data to the server via ADMS protocol. Use "Sync Now" to manually trigger a reprocess if needed.
</div>

<div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center'}}>
<input placeholder="Search device name, model, or SN..." value={search} onChange={e=>setSearch(e.target.value)} style={{padding:'8px 12px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:12,background:'var(--surface2)',outline:'none',width:280}}/>
<select value={locF} onChange={e=>setLocF(e.target.value)} style={{padding:'8px 12px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:12,background:'var(--surface2)',outline:'none'}}><option value="All">All Locations</option>{devLocs.map(l=><option key={l}>{l}</option>)}</select>
{(locF!=='All')&&<span className="active-filter-tag" onClick={()=>setLocF('All')}>{locF} X</span>}
</div>
<div className="device-grid">
{filtered.map((d,i)=><div className="device-card" key={i}>
<div className="dh"><div><div className="dn">{d.name}</div><div className="dm">{d.model}</div></div><span className={'badge '+(d.on?'green':'red')}><span className={'dot '+(d.on?'online':'offline')}></span>{d.on?'Online':'Offline'}</span></div>
<div className="device-meta">
<span>Location: {d.loc}</span>
<span>Enrolled: {d.emp}</span>
<span>Last ping: {d.ping}</span>
<span className="mono" style={{fontSize:11,color:'var(--text3)'}}>SN: {d.id}</span>
</div>
{/* Sync status row */}
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:10,paddingTop:10,borderTop:'1px solid var(--border)'}}>
<div style={{fontSize:11,color:'var(--text3)'}}>
<span style={{marginRight:12}}>Last sync: <strong className="mono">{lastSync[d.id]||'-'}</strong></span>
{pendingTx[d.id]>0&&<span style={{color:'#92400e',fontWeight:600}}>&#9679; {pendingTx[d.id]} pending</span>}
{pendingTx[d.id]===0&&<span style={{color:'var(--green)',fontWeight:600}}>&#10003; Synced</span>}
</div>
<button className={'btn btn-sm '+(syncing[d.id]?'btn-outline':'btn-primary')} style={{borderRadius:16,minWidth:85}} disabled={syncing[d.id]} onClick={function(){handleSync(d.id);}}>{syncing[d.id]?'Syncing...':'Sync Now'}</button>
</div>
</div>)}
{filtered.length===0&&<div style={{gridColumn:'1/-1',textAlign:'center',padding:40,color:'var(--text3)'}}>No devices match the current filters</div>}
</div></div>;}
function Sets({toast,compName,onCompNameChange,logo,onLogoChange,favicon,onFaviconChange,compInfo,onCompInfoChange}){const[tg,setTg]=useState({a:true,s:true});const[modal,setModal]=useState(false);
var _draftName=useState(compName);var draftName=_draftName[0];var setDraftName=_draftName[1];
var _draftTz=useState('IST +5:30');var draftTz=_draftTz[0];var setDraftTz=_draftTz[1];
var _draftOff=useState('Sunday');var draftOff=_draftOff[0];var setDraftOff=_draftOff[1];
var hasChanges=draftName!==compName;
var saveGeneral=function(){onCompNameChange(draftName);toast('Settings saved successfully','success');};
var discardGeneral=function(){setDraftName(compName);toast('Changes discarded','info');};
// Compliance info draft state
var _draftCI=useState(Object.assign({},compInfo));var draftCI=_draftCI[0];var setDraftCI=_draftCI[1];
var ciChanged=JSON.stringify(draftCI)!==JSON.stringify(compInfo);
var updateCI=function(key,val){setDraftCI(function(p){var n=Object.assign({},p);n[key]=val;return n;});};
var saveCI=function(){onCompInfoChange(Object.assign({},draftCI));toast('Compliance information saved','success');};
var discardCI=function(){setDraftCI(Object.assign({},compInfo));toast('Changes discarded','info');};
var handleLogoUpload=function(e){
  var file=e.target.files[0];if(!file)return;e.target.value='';
  if(!file.type.match(/^image\/(png|svg\+xml|jpeg|jpg)$/)){toast('Logo must be PNG, SVG, or JPG format','error');return;}
  if(file.size>500*1024){toast('Logo file size must be under 500 KB. Current: '+(file.size/1024).toFixed(0)+' KB','error');return;}
  var reader=new FileReader();reader.onload=function(ev){
    var img=new Image();img.onload=function(){
      if(img.width<200||img.height<200){toast('Logo too small. Minimum 200x200 px. Uploaded: '+img.width+'x'+img.height+' px','error');return;}
      if(img.width>2000||img.height>2000){toast('Logo too large. Maximum 2000x2000 px. Uploaded: '+img.width+'x'+img.height+' px','error');return;}
      onLogoChange(ev.target.result);toast('Logo updated ('+img.width+'x'+img.height+' px, '+(file.size/1024).toFixed(0)+' KB)','success');
    };img.onerror=function(){toast('Could not read image dimensions','error');};img.src=ev.target.result;
  };reader.readAsDataURL(file);
};
var handleFaviconUpload=function(e){
  var file=e.target.files[0];if(!file)return;e.target.value='';
  if(!file.type.match(/^image\/(png|svg\+xml|x-icon|vnd\.microsoft\.icon|ico)$/)){toast('Favicon must be ICO, PNG, or SVG format','error');return;}
  if(file.size>100*1024){toast('Favicon must be under 100 KB. Current: '+(file.size/1024).toFixed(0)+' KB','error');return;}
  var reader=new FileReader();reader.onload=function(ev){
    var img=new Image();img.onload=function(){
      if(img.width>512||img.height>512){toast('Favicon too large. Maximum 512x512 px. Uploaded: '+img.width+'x'+img.height+' px','error');return;}
      if(img.width!==img.height){toast('Favicon must be square. Uploaded: '+img.width+'x'+img.height+' px. Use 32x32, 64x64, or 128x128','error');return;}
      onFaviconChange(ev.target.result);toast('Favicon updated ('+img.width+'x'+img.height+' px)','success');
    };img.onerror=function(){onFaviconChange(ev.target.result);toast('Favicon updated','success');};img.src=ev.target.result;
  };reader.readAsDataURL(file);
};
return<div className="fade-in">{modal&&<Modal title="Add User" onClose={()=>setModal(false)}><div className="form-group"><label>Full Name</label><input placeholder="Name"/></div><div className="form-group"><label>Email</label><input type="email" placeholder="user@makson-group.com"/></div><div style={{display:'flex',gap:12}}><div style={{flex:1}} className="form-group"><label>Role</label><select><option>Admin</option><option>HR Manager</option><option>HR Viewer</option></select></div><div style={{flex:1}} className="form-group"><label>Type</label><select><option>Internal</option><option>Compliance</option></select></div></div><div className="modal-actions"><button className="btn btn-outline" onClick={()=>setModal(false)}>Cancel</button><button className="btn btn-primary" onClick={()=>{setModal(false);toast('User created','success');}}>Create</button></div></Modal>}<div className="settings-grid">
{/* BRAND ASSETS */}
<div className="settings-card"><h3>Brand Assets</h3>
<div className="s-desc" style={{marginBottom:16,fontSize:12}}>Upload your company logo and favicon. Files are validated for format, size, and dimensions to ensure proper display across reports and browser.</div>
<div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
{/* Logo Upload */}
<div style={{flex:1,minWidth:200}}>
<div style={{display:'flex',alignItems:'center',gap:5,marginBottom:8}}><span className="s-label" style={{margin:0}}>Company Logo</span><span className="tip-icon" data-tip="Used in sidebar and report headers. Upload a square or landscape PNG/SVG/JPG. Min 200x200 px, max 2000x2000 px, max 500 KB. Recommended: 400x400 px transparent PNG for best quality across print and screen.">i</span></div>
<div style={{border:'2px dashed var(--border)',borderRadius:10,padding:20,textAlign:'center',background:'var(--surface2)',cursor:'pointer',position:'relative',minHeight:120,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',transition:'.2s'}} onClick={function(){document.getElementById('logo-upload').click();}}>
{logo?<div><img src={logo} alt="Logo" style={{maxWidth:140,maxHeight:80,objectFit:'contain',marginBottom:8}}/><div style={{fontSize:11,color:'var(--text3)'}}>Click to change</div></div>:<div><div style={{fontSize:28,marginBottom:6,opacity:.3}}>&#128247;</div><div style={{fontSize:12,color:'var(--text3)',fontWeight:500}}>Click to upload logo</div><div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>PNG, SVG, or JPG</div></div>}
<input id="logo-upload" type="file" accept=".png,.svg,.jpg,.jpeg,image/png,image/svg+xml,image/jpeg" style={{display:'none'}} onChange={handleLogoUpload}/>
</div>
<div style={{fontSize:10,color:'var(--text3)',marginTop:6,lineHeight:1.5}}>
<strong>Specs:</strong> 200-2000 px | Max 500 KB | PNG/SVG/JPG<br/>
<strong>Recommended:</strong> 400x400 px transparent PNG<br/>
<strong>Appears in:</strong> Sidebar, Report headers
</div>
{logo&&<button className="btn btn-outline btn-sm" style={{marginTop:8,fontSize:11}} onClick={function(){onLogoChange(null);toast('Logo removed','info');}}>Remove Logo</button>}
</div>
{/* Favicon Upload */}
<div style={{flex:1,minWidth:200}}>
<div style={{display:'flex',alignItems:'center',gap:5,marginBottom:8}}><span className="s-label" style={{margin:0}}>Favicon / Browser Icon</span><span className="tip-icon" data-tip="The small icon shown in the browser tab next to the page title. Must be square. Upload ICO, PNG, or SVG. Max 512x512 px, max 100 KB. Recommended: 32x32 px or 64x64 px PNG.">i</span></div>
<div style={{border:'2px dashed var(--border)',borderRadius:10,padding:20,textAlign:'center',background:'var(--surface2)',cursor:'pointer',position:'relative',minHeight:120,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',transition:'.2s'}} onClick={function(){document.getElementById('favicon-upload').click();}}>
{favicon?<div><img src={favicon} alt="Favicon" style={{width:48,height:48,objectFit:'contain',marginBottom:8,borderRadius:4}}/><div style={{fontSize:11,color:'var(--text3)'}}>Click to change</div></div>:<div><div style={{fontSize:28,marginBottom:6,opacity:.3}}>&#127760;</div><div style={{fontSize:12,color:'var(--text3)',fontWeight:500}}>Click to upload favicon</div><div style={{fontSize:10,color:'var(--text3)',marginTop:4}}>ICO, PNG, or SVG</div></div>}
<input id="favicon-upload" type="file" accept=".ico,.png,.svg,image/x-icon,image/png,image/svg+xml" style={{display:'none'}} onChange={handleFaviconUpload}/>
</div>
<div style={{fontSize:10,color:'var(--text3)',marginTop:6,lineHeight:1.5}}>
<strong>Specs:</strong> Square only | Max 512x512 px | Max 100 KB<br/>
<strong>Recommended:</strong> 32x32 or 64x64 px PNG<br/>
<strong>Appears in:</strong> Browser tab icon
</div>
{favicon&&<button className="btn btn-outline btn-sm" style={{marginTop:8,fontSize:11}} onClick={function(){onFaviconChange(null);toast('Favicon removed','info');}}>Remove Favicon</button>}
</div>
</div>
</div>
{/* GENERAL */}
<div className="settings-card"><h3>General</h3><div className="setting-row"><div><div className="s-label">Company Name</div><div className="s-desc">Used on reports, file names, and sidebar</div></div><input style={{width:220,padding:'6px 10px',border:'1.5px solid '+(hasChanges?'var(--primary-light)':'var(--border)'),borderRadius:6,fontSize:13,flexShrink:0,background:hasChanges?'#f0f2ff':'var(--surface2)'}} value={draftName} onChange={function(e){setDraftName(e.target.value);}}/></div><div className="setting-row"><div><div className="s-label">Time Zone</div></div><select style={{padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:13,flexShrink:0}} value={draftTz} onChange={function(e){setDraftTz(e.target.value);}}><option>IST +5:30</option></select></div><div className="setting-row"><div><div className="s-label">Weekly Off</div></div><select style={{padding:'6px 10px',border:'1.5px solid var(--border)',borderRadius:6,fontSize:13,flexShrink:0}} value={draftOff} onChange={function(e){setDraftOff(e.target.value);}}><option>Sunday</option><option>Sat & Sun</option></select></div>
{hasChanges&&<div style={{marginTop:14,padding:'10px 14px',background:'var(--amber-bg)',borderRadius:8,border:'1px solid #fde68a',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:12,color:'#92400e',fontWeight:500}}>You have unsaved changes</span>
<div style={{display:'flex',gap:8}}>
<button className="btn btn-outline btn-sm" onClick={discardGeneral}>Discard</button>
<button className="btn btn-sm" style={{background:'var(--green)',color:'#fff',border:'none'}} onClick={saveGeneral}>Save Changes</button>
</div></div>}
</div>
{/* COMPANY COMPLIANCE INFORMATION */}
<div className="settings-card"><h3>Company Compliance Information</h3>
<div className="s-desc" style={{marginBottom:14,fontSize:12}}>Statutory details required on official reports. These appear in the report letterhead and footer.</div>
<div style={{display:'flex',gap:12,marginBottom:12}}><div style={{flex:1}} className="form-group"><label style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4,display:'block'}}>CIN (Corporate Identity Number)</label><input style={{padding:'7px 10px',border:'1.5px solid '+(ciChanged?'var(--primary-light)':'var(--border)'),borderRadius:6,fontSize:12,width:'100%',background:ciChanged?'#f0f2ff':'var(--surface2)',fontFamily:'JetBrains Mono,monospace'}} maxLength="21" value={draftCI.cin||''} onChange={function(e){updateCI('cin',V.cin(e.target.value));}}/><div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>e.g. U15200GJ1926PTC000XXX</div></div><div style={{flex:1}} className="form-group"><label style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4,display:'block'}}>GSTIN</label><input style={{padding:'7px 10px',border:'1.5px solid '+(ciChanged?'var(--primary-light)':'var(--border)'),borderRadius:6,fontSize:12,width:'100%',background:ciChanged?'#f0f2ff':'var(--surface2)',fontFamily:'JetBrains Mono,monospace'}} maxLength="15" value={draftCI.gstin||''} onChange={function(e){updateCI('gstin',V.gstin(e.target.value));}}/><div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>e.g. 24AABCM1234A1Z5</div></div></div>
<div className="form-group" style={{marginBottom:12}}><label style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4,display:'block'}}>Address Line 1</label><input style={{padding:'7px 10px',border:'1.5px solid '+(ciChanged?'var(--primary-light)':'var(--border)'),borderRadius:6,fontSize:12,width:'100%',background:ciChanged?'#f0f2ff':'var(--surface2)',fontFamily:'inherit'}} value={draftCI.addr1||''} onChange={function(e){updateCI('addr1',e.target.value);}} placeholder="Building, Plot No., Street"/></div>
<div className="form-group" style={{marginBottom:12}}><label style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4,display:'block'}}>Address Line 2</label><input style={{padding:'7px 10px',border:'1.5px solid '+(ciChanged?'var(--primary-light)':'var(--border)'),borderRadius:6,fontSize:12,width:'100%',background:ciChanged?'#f0f2ff':'var(--surface2)',fontFamily:'inherit'}} value={draftCI.addr2||''} onChange={function(e){updateCI('addr2',e.target.value);}} placeholder="Landmark, Road, Area (optional)"/></div>
<div style={{display:'flex',gap:12,marginBottom:12}}><div style={{flex:2}} className="form-group"><label style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4,display:'block'}}>City / District</label><input style={{padding:'7px 10px',border:'1.5px solid '+(ciChanged?'var(--primary-light)':'var(--border)'),borderRadius:6,fontSize:12,width:'100%',background:ciChanged?'#f0f2ff':'var(--surface2)',fontFamily:'inherit'}} value={draftCI.city||''} onChange={function(e){updateCI('city',e.target.value);}} placeholder="e.g. Surendranagar"/></div><div style={{flex:2}} className="form-group"><label style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4,display:'block'}}>State</label><select style={{padding:'7px 10px',border:'1.5px solid '+(ciChanged?'var(--primary-light)':'var(--border)'),borderRadius:6,fontSize:12,width:'100%',background:ciChanged?'#f0f2ff':'var(--surface2)',fontFamily:'inherit'}} value={draftCI.state||''} onChange={function(e){updateCI('state',e.target.value);}}><option value="">Select State</option>{['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh'].map(function(s){return<option key={s} value={s}>{s}</option>;})}</select></div><div style={{flex:1}} className="form-group"><label style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4,display:'block'}}>PIN Code</label><input style={{padding:'7px 10px',border:'1.5px solid '+(ciChanged?'var(--primary-light)':'var(--border)'),borderRadius:6,fontSize:12,width:'100%',background:ciChanged?'#f0f2ff':'var(--surface2)',fontFamily:'JetBrains Mono,monospace'}} value={draftCI.pincode||''} onChange={function(e){updateCI('pincode',e.target.value.replace(/[^0-9]/g,''));}} placeholder="363001" maxLength="6"/></div></div>
<div style={{display:'flex',gap:12,marginBottom:12}}><div style={{flex:1}} className="form-group"><label style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4,display:'block'}}>PF Establishment Code</label><input style={{padding:'7px 10px',border:'1.5px solid '+(ciChanged?'var(--primary-light)':'var(--border)'),borderRadius:6,fontSize:12,width:'100%',background:ciChanged?'#f0f2ff':'var(--surface2)',fontFamily:'JetBrains Mono,monospace'}} value={draftCI.pfCode||''} onChange={function(e){updateCI('pfCode',V.pf(e.target.value));}}/><div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>EPFO code (e.g. GJSUR0012345000)</div></div><div style={{flex:1}} className="form-group"><label style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4,display:'block'}}>ESI Code</label><input style={{padding:'7px 10px',border:'1.5px solid '+(ciChanged?'var(--primary-light)':'var(--border)'),borderRadius:6,fontSize:12,width:'100%',background:ciChanged?'#f0f2ff':'var(--surface2)',fontFamily:'JetBrains Mono,monospace'}} value={draftCI.esiCode||''} onChange={function(e){updateCI('esiCode',V.numeric(e.target.value));}}/><div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>ESIC number (e.g. 87000XXXXXXX000)</div></div></div>
<div style={{display:'flex',gap:12,marginBottom:12}}><div style={{flex:1}} className="form-group"><label style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4,display:'block'}}>Factory License No.</label><input style={{padding:'7px 10px',border:'1.5px solid '+(ciChanged?'var(--primary-light)':'var(--border)'),borderRadius:6,fontSize:12,width:'100%',background:ciChanged?'#f0f2ff':'var(--surface2)',fontFamily:'JetBrains Mono,monospace'}} value={draftCI.factoryLic||''} onChange={function(e){updateCI('factoryLic',V.factoryLic(e.target.value));}}/><div style={{fontSize:10,color:'var(--text3)',marginTop:3}}>Under Factories Act 1948</div></div><div style={{flex:1}} className="form-group"><label style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4,display:'block'}}>Authorized Signatory</label><input style={{padding:'7px 10px',border:'1.5px solid '+(ciChanged?'var(--primary-light)':'var(--border)'),borderRadius:6,fontSize:12,width:'100%',background:ciChanged?'#f0f2ff':'var(--surface2)',fontFamily:'inherit'}} value={draftCI.signatory||''} onChange={function(e){updateCI('signatory',e.target.value);}}/></div></div>
<div style={{display:'flex',gap:12,marginBottom:12}}><div style={{flex:1}} className="form-group"><label style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4,display:'block'}}>Signatory Designation</label><input style={{padding:'7px 10px',border:'1.5px solid '+(ciChanged?'var(--primary-light)':'var(--border)'),borderRadius:6,fontSize:12,width:'100%',background:ciChanged?'#f0f2ff':'var(--surface2)',fontFamily:'inherit'}} value={draftCI.sigDesig||''} onChange={function(e){updateCI('sigDesig',e.target.value);}}/></div><div style={{flex:1}} className="form-group"><label style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4,display:'block'}}>HR Contact Phone</label><input style={{padding:'7px 10px',border:'1.5px solid '+(ciChanged?'var(--primary-light)':'var(--border)'),borderRadius:6,fontSize:12,width:'100%',background:ciChanged?'#f0f2ff':'var(--surface2)',fontFamily:'inherit'}} value={draftCI.hrPhone||''} onChange={function(e){updateCI('hrPhone',V.phone(e.target.value));}}/></div></div>
<div style={{display:'flex',gap:12,marginBottom:16}}><div style={{flex:1}} className="form-group"><label style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4,display:'block'}}>HR Contact Email</label><input style={{padding:'7px 10px',border:'1.5px solid '+(ciChanged?'var(--primary-light)':'var(--border)'),borderRadius:6,fontSize:12,width:'100%',background:ciChanged?'#f0f2ff':'var(--surface2)',fontFamily:'inherit'}} value={draftCI.hrEmail||''} onChange={function(e){updateCI('hrEmail',V.email(e.target.value));}}/></div><div style={{flex:1}}></div></div>
<div style={{borderTop:'1px solid var(--border)',paddingTop:14}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><div><div className="s-label">Confidentiality Notice on Reports</div><div className="s-desc">Show disclaimer footer on all reports</div></div><div className={'toggle'+(draftCI.confNotice?' on':'')} onClick={function(){updateCI('confNotice',!draftCI.confNotice);}}></div></div>
{draftCI.confNotice&&<div><label style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4,display:'block'}}>Notice Text</label><textarea style={{width:'100%',padding:'8px 10px',border:'1.5px solid '+(ciChanged?'var(--primary-light)':'var(--border)'),borderRadius:6,fontSize:11,background:ciChanged?'#f0f2ff':'var(--surface2)',fontFamily:'inherit',resize:'vertical',minHeight:60,lineHeight:1.5}} value={draftCI.confText||''} onChange={function(e){updateCI('confText',e.target.value);}}/></div>}
</div>
{ciChanged&&<div style={{marginTop:14,padding:'10px 14px',background:'var(--amber-bg)',borderRadius:8,border:'1px solid #fde68a',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<span style={{fontSize:12,color:'#92400e',fontWeight:500}}>You have unsaved changes</span>
<div style={{display:'flex',gap:8}}>
<button className="btn btn-outline btn-sm" onClick={discardCI}>Discard</button>
<button className="btn btn-sm" style={{background:'var(--green)',color:'#fff',border:'none'}} onClick={saveCI}>Save Changes</button>
</div></div>}
</div>
<div className="settings-card"><h3>Time Shifts</h3>
<div style={{fontSize:12,color:'var(--text3)',marginBottom:12,fontWeight:600}}>ACTUAL (12-HOUR)</div>
{[['Day Shift','06:00 AM - 06:00 PM'],['Night Shift','06:00 PM - 06:00 AM']].map(([l,v],i)=><div className="setting-row" key={i}><div><div className="s-label">{l}</div></div><span className="mono" style={{fontSize:13}}>{v}</span></div>)}
<div style={{fontSize:12,color:'var(--text3)',marginTop:16,marginBottom:12,fontWeight:600}}>ALTERNATE / COMPLIANCE (8-HOUR)</div>
{COMP_SHIFTS.map((s,i)=><div className="setting-row" key={i}><div><div className="s-label">Shift {s.id}</div></div><span className="mono" style={{fontSize:13}}>{s.label}</span></div>)}
<div className="setting-row"><div><div className="s-label">Break</div></div><span className="mono" style={{fontSize:13}}>30 min</span></div>
</div><div className="settings-card"><h3>Data Settings</h3><div className="setting-row"><div><div className="s-label">Standard Hours</div></div><span className="mono" style={{fontSize:13}}>8.0 hrs</span></div><div className="setting-row"><div><div className="s-label">Smart Anchor</div><div className="s-desc">Auto-decide timestamp</div></div><div className={'toggle'+(tg.a?' on':'')} onClick={()=>{setTg(p=>({...p,a:!p.a}));toast(tg.a?'Disabled':'Enabled','info');}}></div></div><div className="setting-row"><div><div className="s-label">Offset Range</div></div><span className="mono" style={{fontSize:13}}>-5 to +12m</span></div><div className="setting-row"><div><div className="s-label">Include Seconds</div></div><div className={'toggle'+(tg.s?' on':'')} onClick={()=>{setTg(p=>({...p,s:!p.s}));toast(tg.s?'Disabled':'Enabled','info');}}></div></div></div><div className="settings-card"><h3>Users</h3><div className="tbl-scroll"><table style={{width:'100%'}}><thead><tr><th>User</th><th>Role</th><th>Status</th></tr></thead><tbody>{[['Priya Patel','Admin'],['Kalpesh Makasana','Super Admin'],['Rajesh Shah','HR Manager'],['Sunita Desai','Viewer']].map(([n,r],i)=><tr key={i}><td className="emp-name">{n}</td><td>{r}</td><td><span className="badge green">Active</span></td></tr>)}</tbody></table></div><button className="btn btn-primary" style={{marginTop:16}} onClick={()=>setModal(true)}>+ Add User</button></div></div></div>;}

function App(){const[li,setLi]=useState(false);const[cr,setCr]=useState('internal');const[pg,setPg]=useState('dashboard');const[td,show]=useToast();const[sideOpen,setSideOpen]=useState(false);const[viewEmp,setViewEmp]=useState(null);const[compName,setCompName]=useState('Makson Group');const[pdfView,setPdfView]=useState(null);const[logo,setLogo]=useState(null);const[favicon,setFavicon]=useState(null);
const[compInfo,setCompInfo]=useState({cin:'U15200GJ1926PTC000XXX',addr1:'Plot No. 1234, GIDC Industrial Estate',addr2:'Wadhwan Highway Road',city:'Surendranagar',state:'Gujarat',pincode:'363001',gstin:'24AABCM1234A1Z5',pfCode:'GJSUR0012345000',esiCode:'87000XXXXXXX000',factoryLic:'GJ/SUR/FL/2024/0001',signatory:'Kalpesh Makasana',sigDesig:'Director',hrPhone:'+91 97261 00000',hrEmail:'hr@makson-group.com',confNotice:true,confText:'Confidential - This document contains employee personally identifiable information (PII) protected under the Information Technology Act, 2000. Unauthorized distribution, copying, or disclosure is strictly prohibited.'});var clock=useClock();var fmtDate=clock.toLocaleDateString('en-IN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric',timeZone:'Asia/Kolkata'});var fmtTime=clock.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true,timeZone:'Asia/Kolkata'});const login=c=>{setCr(c);setLi(true);setPg('dashboard');};const logout=()=>{setLi(false);setPg('dashboard');setViewEmp(null);};var openEmployee=function(emp){setViewEmp(emp);setPg('employees');};var updateCompName=function(n){COMPANY_NAME=n;setCompName(n);};
// Update favicon when changed
useEffect(function(){if(favicon){var link=document.querySelector("link[rel*='icon']")||document.createElement('link');link.type='image/x-icon';link.rel='shortcut icon';link.href=favicon;document.head.appendChild(link);}},
[favicon]);
// Update page title with company name
useEffect(function(){document.title=compName+' - MAMS Attendance System';},[compName]);
if(pdfView)return<div id="pdf-page" style={{fontFamily:'Arial,Helvetica,sans-serif',fontSize:11,color:'#1a1f36',minHeight:'100vh',background:'#fff'}}>
<div className="no-print" style={{background:'#1A2878',color:'#fff',padding:'10px 24px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
<div style={{display:'flex',alignItems:'center',gap:10}}><span style={{fontWeight:700,fontSize:14}}>Print-Ready Report</span><span style={{fontSize:11,opacity:.7}}>{pdfView.fname}</span></div>
<div style={{display:'flex',gap:8}}>
<button onClick={function(){window.print();}} style={{background:'#fff',color:'#1A2878',border:'none',padding:'7px 20px',borderRadius:6,fontWeight:700,fontSize:13,cursor:'pointer'}}>Print / Save as PDF</button>
<button onClick={function(){setPdfView(null);}} style={{background:'transparent',color:'#fff',border:'1px solid rgba(255,255,255,.5)',padding:'7px 20px',borderRadius:6,fontWeight:500,fontSize:13,cursor:'pointer'}}>Back to Reports</button>
</div></div>
<div style={{padding:'30px 40px',maxWidth:1100,margin:'0 auto'}}>
<div style={{borderBottom:'3px solid #1A2878',paddingBottom:14,marginBottom:16}}>
<div style={{display:'flex',alignItems:'center',gap:14,marginBottom:8}}>
{pdfView.lg&&<img src={pdfView.lg} alt="Logo" style={{width:50,height:50,objectFit:'contain',borderRadius:6,border:'1px solid #e2e6ed',padding:3,background:'#fff'}}/>}
<div>
<div style={{fontSize:22,fontWeight:700,color:'#1A2878'}}>{pdfView.cn||'Makson Group'}</div>
{pdfView.ci&&pdfView.ci.addr1&&<div style={{fontSize:10,color:'#4e5d78',marginTop:3}}>{pdfView.ci.addr1}{pdfView.ci.addr2?', '+pdfView.ci.addr2:''}{pdfView.ci.city?', '+pdfView.ci.city:''}{pdfView.ci.state?', '+pdfView.ci.state:''}{pdfView.ci.pincode?' - '+pdfView.ci.pincode:''}</div>}
</div></div>
<div style={{display:'flex',gap:14,fontSize:9,color:'#8492a6',flexWrap:'wrap'}}>
{pdfView.ci&&pdfView.ci.cin&&<span style={{background:'#eef1f6',padding:'2px 8px',borderRadius:3}}><b>CIN:</b> {pdfView.ci.cin}</span>}
{pdfView.ci&&pdfView.ci.gstin&&<span style={{background:'#eef1f6',padding:'2px 8px',borderRadius:3}}><b>GSTIN:</b> {pdfView.ci.gstin}</span>}
{pdfView.ci&&pdfView.ci.pfCode&&<span style={{background:'#eef1f6',padding:'2px 8px',borderRadius:3}}><b>PF:</b> {pdfView.ci.pfCode}</span>}
{pdfView.ci&&pdfView.ci.esiCode&&<span style={{background:'#eef1f6',padding:'2px 8px',borderRadius:3}}><b>ESI:</b> {pdfView.ci.esiCode}</span>}
{pdfView.ci&&pdfView.ci.factoryLic&&<span style={{background:'#eef1f6',padding:'2px 8px',borderRadius:3}}><b>Factory Lic:</b> {pdfView.ci.factoryLic}</span>}
</div></div>
<div style={{fontSize:15,fontWeight:700,color:'#1A2878',marginBottom:4}}>{pdfView.rType||'Daily Attendance'}</div>
<div style={{fontSize:10,color:'#4e5d78',marginBottom:14}}>Period: {pdfView.dateRange||''} | Generated: {new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'2-digit',year:'numeric'})}</div>
<div style={{display:'flex',gap:20,marginBottom:12,fontSize:10}}>
{(function(){var pr=pdfView.rows.filter(function(r){return r.status==='Present';}).length;var ab=pdfView.rows.length-pr;var uq={};pdfView.rows.forEach(function(r){uq[r.code]=1;});var rate=pdfView.rows.length>0?Math.round(pr/pdfView.rows.length*100):0;return[<div key="t"><strong style={{fontSize:13}}>{pdfView.rows.length}</strong> records</div>,<div key="p"><strong style={{fontSize:13}}>{pr}</strong> present</div>,<div key="a"><strong style={{fontSize:13}}>{ab}</strong> absent</div>,<div key="u"><strong style={{fontSize:13}}>{Object.keys(uq).length}</strong> employees</div>,<div key="r"><strong style={{fontSize:13}}>{rate}%</strong> rate</div>];})()}
</div>
<table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
<thead><tr>{['Date','Code','Employee','Department','Location','Shift','Entry','Exit','Hours','Status'].map(function(h){return<th key={h} style={{background:'#1A2878',color:'#fff',padding:'6px 8px',textAlign:'left',fontSize:9,textTransform:'uppercase',letterSpacing:'.5px'}}>{h}</th>;})}</tr></thead>
<tbody>{pdfView.rows.map(function(r,i){return<tr key={i} style={{background:i%2===1?'#f8f9fb':'transparent'}}>
<td style={{padding:'5px 8px',borderBottom:'1px solid #e2e6ed',fontFamily:'monospace',fontSize:10}}>{fmtD(r.date)}</td>
<td style={{padding:'5px 8px',borderBottom:'1px solid #e2e6ed',fontFamily:'monospace',fontSize:10}}>{r.code}</td>
<td style={{padding:'5px 8px',borderBottom:'1px solid #e2e6ed',fontWeight:600}}>{r.name}</td>
<td style={{padding:'5px 8px',borderBottom:'1px solid #e2e6ed'}}>{r.dept}</td>
<td style={{padding:'5px 8px',borderBottom:'1px solid #e2e6ed'}}>{r.loc}</td>
<td style={{padding:'5px 8px',borderBottom:'1px solid #e2e6ed'}}>{r.shift}</td>
<td style={{padding:'5px 8px',borderBottom:'1px solid #e2e6ed',fontFamily:'monospace',fontSize:10}}>{r.entry}</td>
<td style={{padding:'5px 8px',borderBottom:'1px solid #e2e6ed',fontFamily:'monospace',fontSize:10}}>{r.exit}</td>
<td style={{padding:'5px 8px',borderBottom:'1px solid #e2e6ed',fontFamily:'monospace',fontSize:10}}>{r.hours}</td>
<td style={{padding:'5px 8px',borderBottom:'1px solid #e2e6ed',color:r.status==='Present'?'#4a7a16':'#E82C2C',fontWeight:600}}>{r.status}</td>
</tr>;})}</tbody></table>
<div style={{marginTop:24,paddingTop:14,borderTop:'1px solid #e2e6ed',fontSize:9,color:'#8492a6'}}>
<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
{pdfView.ci&&pdfView.ci.signatory&&<div style={{marginTop:30}}>
<div style={{width:180,borderTop:'1px solid #4e5d78',paddingTop:4,fontWeight:600,color:'#1a1f36',fontSize:10}}>{pdfView.ci.signatory}</div>
<div style={{color:'#8492a6',fontSize:9}}>{pdfView.ci.sigDesig||'Authorized Signatory'}</div>
</div>}
<div style={{textAlign:'right'}}>
{pdfView.ci&&pdfView.ci.hrPhone&&<div>Contact: {pdfView.ci.hrPhone}{pdfView.ci.hrEmail?' | '+pdfView.ci.hrEmail:''}</div>}
<div>Generated by MAMS v1.0</div>
</div></div>
{pdfView.ci&&pdfView.ci.confNotice&&<div style={{marginTop:16,padding:'8px 12px',background:'#fef3c7',border:'1px solid #fde68a',borderRadius:4,fontSize:9,color:'#92400e',textAlign:'center'}}>{pdfView.ci.confText||'Confidential - Contains employee PII under IT Act 2000.'}</div>}
</div></div></div>;
if(!li)return<Login onLogin={login}/>;const t={dashboard:'Dashboard',employees:'Employees',attendance:'Attendance Log',reports:'Reports',adjustments:'Attendance Adjustments',devices:'Devices',settings:'Settings'};return<div className="app-layout"><Side pg={pg} setPg={function(p){setPg(p);if(p!=='employees')setViewEmp(null);}} onLogout={logout} isOpen={sideOpen} onClose={()=>setSideOpen(false)} compName={compName} logo={logo}/><div className="main-area"><div className="top-bar"><div style={{display:'flex',alignItems:'center',gap:12}}><button className="hamburger" onClick={()=>setSideOpen(!sideOpen)}><span></span></button><h1>{t[pg]}</h1></div><div style={{textAlign:'right'}}><div className="mono" style={{fontSize:14,fontWeight:600,color:'var(--text)',letterSpacing:'.5px'}}><span className="live-dot"></span>{fmtTime}</div><div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{fmtDate}</div></div></div><div className="content">{pg==='dashboard'&&<Dash cr={cr} toast={show} onViewEmployee={openEmployee}/>}{pg==='employees'&&<Emps toast={show} initialEmployee={viewEmp} onClearInitial={function(){setViewEmp(null);}}/>}{pg==='attendance'&&<Att cr={cr} toast={show} goHome={function(){setPg('dashboard');}}/>}{pg==='reports'&&<Reps toast={show} compName={compName} logo={logo} compInfo={compInfo} onShowPDF={setPdfView}/>}{pg==='adjustments'&&<Adj toast={show}/>}{pg==='devices'&&<Devs/>}{pg==='settings'&&<Sets toast={show} compName={compName} onCompNameChange={updateCompName} logo={logo} onLogoChange={setLogo} favicon={favicon} onFaviconChange={setFavicon} compInfo={compInfo} onCompInfoChange={setCompInfo}/>}</div></div><Toast d={td}/></div>;}

export default App;
