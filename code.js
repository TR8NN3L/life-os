// FLOW OS — v6 — Priorität 1: Akkordeon + KR-Filter
// Neon-Blue. Dark. No razzle-dazzle.

const BG     = {r:.047,g:.047,b:.055};
const SIDE   = {r:.060,g:.060,b:.072};
const BORD   = {r:.145,g:.145,b:.170};
const BLUE   = {r:.200,g:.647,b:1.000};
const BLUEBG = {r:.035,g:.090,b:.175};
const BLUEGLOW={r:.055,g:.145,b:.270};
const WHITE  = {r:1,g:1,b:1};
const G1     = {r:.650,g:.650,b:.700};
const G2     = {r:.380,g:.380,b:.420};
const G3     = {r:.200,g:.200,b:.230};
const DARK   = {r:.047,g:.047,b:.055};
const GRID   = {r:.120,g:.120,b:.145};
const RED    = {r:.937,g:.267,b:.267};
const AMBER  = {r:.957,g:.698,b:.200};
const GOLD   = {r:.820,g:.620,b:.180};
const REDBG  = {r:.180,g:.055,b:.055};

const solid = (c, a=1) => [{type:'SOLID', color:c, opacity:a}];

async function loadFonts() {
  for(const s of ['Regular','Medium','Semi Bold','Bold'])
    await figma.loadFontAsync({family:'Inter', style:s});
}

function mkRect(n, x, y, w, h, c, p, cr=0) {
  const r = figma.createRectangle();
  r.name=n; r.x=x; r.y=y; r.resize(w,h);
  r.fills=c?solid(c):[];
  if(cr) r.cornerRadius=cr;
  if(p) p.appendChild(r);
  return r;
}

function mkOutline(n, x, y, w, h, sc, p, cr=0) {
  const r = figma.createRectangle();
  r.name=n; r.x=x; r.y=y; r.resize(w,h);
  r.fills=[];
  r.strokes=[{type:'SOLID', color:sc}];
  r.strokeWeight=1.5; r.strokeAlign='INSIDE';
  if(cr) r.cornerRadius=cr;
  if(p) p.appendChild(r);
  return r;
}

function mkText(s, x, y, sz, c, st, p, fw=0) {
  const t = figma.createText();
  t.fontName={family:'Inter', style:st||'Regular'};
  t.fontSize=sz;
  if(fw>0){t.resize(fw,100);t.textAutoResize='HEIGHT';}
  t.characters=String(s);
  t.x=x; t.y=y; t.fills=solid(c);
  if(p) p.appendChild(t);
  return t;
}

function mkCenter(s, y, sz, c, st, p) {
  const t = figma.createText();
  t.fontName={family:'Inter', style:st||'Regular'};
  t.fontSize=sz;
  t.resize(1440,200); t.textAutoResize='HEIGHT';
  t.textAlignHorizontal='CENTER';
  t.characters=String(s); t.x=0; t.y=y;
  t.fills=solid(c);
  if(p) p.appendChild(t);
  return t;
}

function mkFrame(n, x, y, w, h, c, p, cr=0) {
  const f = figma.createFrame();
  f.name=n; f.x=x; f.y=y; f.resize(w,h);
  f.fills=c?solid(c):[]; f.clipsContent=true;
  if(cr) f.cornerRadius=cr;
  if(p) p.appendChild(f);
  return f;
}

function mkEllipse(n, x, y, d, c, p) {
  const e = figma.createEllipse();
  e.name=n; e.x=x; e.y=y; e.resize(d,d);
  e.fills=c?solid(c):[];
  if(p) p.appendChild(e);
  return e;
}

function btnText(btn, label, color, size=12) {
  const t = figma.createText();
  t.fontName={family:'Inter',style:'Bold'}; t.fontSize=size;
  t.characters=label; t.fills=solid(color);
  t.x=Math.max(8, (btn.width - label.length*size*0.58)/2);
  t.y=(btn.height-size*1.4)/2;
  btn.appendChild(t);
}

function chip(n, x, y, label, active, p) {
  const w = label.length*7+24;
  const f = mkFrame(n, x, y, w, 26,
    active?BLUEBG:{r:.10,g:.10,b:.12}, p, 13);
  f.strokes=[{type:'SOLID', color:active?BLUE:BORD}];
  f.strokeWeight=1;
  const t = figma.createText();
  t.fontName={family:'Inter',style:active?'Bold':'Regular'};
  t.fontSize=10; t.characters=label;
  t.fills=solid(active?BLUE:G2); t.x=12; t.y=7;
  f.appendChild(t);
  return f;
}

// ─────────────────────────────────────────────────────────
// SIDEBAR (persistent)
// ─────────────────────────────────────────────────────────
function buildSidebar(D, active) {
  const sb = mkFrame('Sidebar', 0, 0, 220, 900, SIDE, D);

  mkRect('logo-icon', 20, 18, 28, 28, BLUE, sb, 6);
  mkText('FLOW OS', 58, 23, 12, WHITE, 'Bold', sb);
  mkRect('div-logo', 0, 60, 220, 1, BORD, sb);

  mkText('MAIN QUEST', 20, 76, 9, BLUE, 'Bold', sb);
  mkText('Launch Flow OS V1', 20, 91, 13, WHITE, 'Semi Bold', sb, 180);
  mkRect('mq-track', 20, 120, 180, 4, G3, sb, 2);
  mkRect('mq-fill',  20, 120, 117, 4, BLUE, sb, 2);
  mkText('65%  •  Q2 2026', 20, 130, 9, G2, 'Regular', sb);
  mkRect('div-mq', 0, 150, 220, 1, BORD, sb);

  mkText('POV TOGGLE', 20, 162, 9, G2, 'Medium', sb);
  [
    {label:'Founder', sub:'Vertrieb & Business', on:true},
    {label:'Student', sub:'Wirtschaftspsychologie', on:false},
    {label:'Athlete', sub:'Bodybuilding', on:false},
  ].forEach(function(pov, i) {
    var y=178+i*52;
    if(pov.on){
      mkRect('pov-bg-'+i, 10, y-2, 200, 44, BLUEBG, sb, 4);
      mkRect('pov-bar-'+i, 10, y-2, 3, 44, BLUE, sb);
    }
    mkText(pov.label, 22, y+4, 12, pov.on?WHITE:G2, pov.on?'Semi Bold':'Regular', sb);
    mkText(pov.sub, 22, y+20, 9, pov.on?BLUE:G3, 'Regular', sb);
  });
  mkRect('div-pov', 0, 338, 220, 1, BORD, sb);

  [
    {label:'Dashboard',        key:'dashboard'},
    {label:'Focus',            key:'focus'},
    {label:'Mission Control',  key:'mc'},
    {label:'Planner',          key:'planner'},
    {label:'Insights',         key:'insights'},
  ].forEach(function(nav, i) {
    var isA=nav.key===active, y=352+i*52;
    if(isA){
      mkRect('nav-bg-'+i, 0, y-2, 220, 44, {r:.08,g:.10,b:.15}, sb);
      mkRect('nav-bar-'+i, 0, y-2, 3, 44, BLUE, sb);
    }
    mkText(nav.label, 32, y+12, 12, isA?WHITE:G2, isA?'Medium':'Regular', sb);
  });

  mkRect('div-user', 0, 820, 220, 1, BORD, sb);
  mkRect('av-bg', 20, 856, 32, 32, BLUE, sb, 16);
  mkText('L', 30, 862, 13, DARK, 'Bold', sb);
  mkText('Lennart', 62, 858, 12, WHITE, 'Medium', sb);
  mkText('Executive Mode', 62, 874, 9, BLUE, 'Regular', sb);
}

// ─────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────
function buildDashboard(page) {
  const D = mkFrame('Dashboard', 0, 0, 1440, 900, BG, page);
  buildSidebar(D, 'dashboard');
  const X=221, W=319, bW=W-82;

  mkText('STRATEGIC ANCHOR', X+24, 22, 10, G2, 'Medium', D);
  mkRect('div-sa', X, 44, W, 1, BORD, D);
  mkText('QUARTERLY OBJECTIVE', X+24, 58, 9, G2, 'Regular', D);
  mkText('Launch Flow OS V1\nund skalieren', X+24, 75, 18, WHITE, 'Bold', D, W-48);
  mkText('Q2 2026  •  1. Mai – 31. Jul', X+24, 136, 11, G2, 'Regular', D);
  mkRect('div-kr', X, 158, W, 1, BORD, D);
  mkText('KEY RESULTS', X+24, 168, 9, G2, 'Medium', D);
  [
    ['KR1: Prototyp fertiggestellt', 65],
    ['KR2: 10 Beta-Nutzer ongeboardet', 20],
    ['KR3: Ersten zahlenden Kunden', 0],
    ['KR4: MRR > 500€', 0],
  ].forEach(function(kr, i) {
    var y=188+i*58;
    mkText(kr[0], X+24, y, 11, G1, 'Regular', D, bW);
    mkRect('kt-'+i, X+24, y+18, bW, 4, G3, D, 2);
    if(kr[1]>0) mkRect('kf-'+i, X+24, y+18, bW*kr[1]/100, 4, BLUE, D, 2);
    mkText(kr[1]+'%', X+24+bW+8, y+12, 11, kr[1]>0?G1:G3, 'Medium', D);
  });

  const DX=541, DW=899;
  mkRect('div-v', DX, 0, 1, 460, BORD, D);

  mkRect('qs-bg', DX, 0, DW, 92, BLUEBG, D);
  mkRect('qs-accent', DX, 0, 4, 92, BLUE, D);
  mkText('QUICK START — WAS IST DIE EINE SACHE, DIE JETZT ZÄHLT?', DX+22, 14, 9, BLUE, 'Bold', D);
  mkText('Leads abtelefonieren', DX+22, 30, 22, WHITE, 'Bold', D);
  mkText('Vorqualifizierte Leads — Opening & Setting', DX+22, 60, 11, G2, 'Regular', D, 620);
  const engBtn = mkFrame('engage-btn', DX+DW-138, 22, 114, 44, BLUE, D, 4);
  btnText(engBtn, 'ENGAGE  →', DARK, 13);
  mkRect('div-qs', DX, 92, DW, 1, BORD, D);

  mkText('AUFGABEN HEUTE', DX+22, 106, 9, G2, 'Regular', D);
  mkText('So, 4. Mai 2026', DX+DW-150, 106, 9, G2, 'Regular', D);
  mkRect('div-th', DX, 124, DW, 1, BORD, D);
  [
    ['1.','Leads abtelefonieren','Opening & Setting.','01:23:45',true],
    ['2.','Uni: Kapitel 3 lesen','Notizen erstellen.','00:00:00',false],
    ['3.','Gym — Push Day','Brust & Schultern.','00:00:00',false],
    ['4.','Wochenplanung','OKR-Fortschritt tracken.','00:00:00',false],
  ].forEach(function(task, i) {
    var y=132+i*80;
    if(i>0) mkRect('sep-'+i, DX, y-2, DW, 1, {r:.09,g:.09,b:.11}, D);
    mkText(task[0], DX+22, y+14, 12, G2, 'Regular', D);
    mkText(task[1], DX+46, y+10, 13, WHITE, 'Semi Bold', D);
    mkText(task[2], DX+46, y+28, 10, G2, 'Regular', D, 360);
    mkText(task[3], DX+500, y+14, 20, task[4]?BLUE:G2, 'Bold', D);
    if(task[4]){mkRect('ld',DX+666,y+22,6,6,BLUE,D,3);mkText('LIVE',DX+676,y+19,8,BLUE,'Bold',D);}
    const b=mkFrame('btn-'+i,DX+730,y+14,88,30,task[4]?BLUE:{r:.12,g:.12,b:.14},D,4);
    btnText(b,task[4]?'PAUSE':'START',task[4]?DARK:G1);
  });

  const TY=461,TX=221,TW=1219,mH=10,cH=210,bwBar=42,gap=19,bY=TY+348;
  mkRect('div-h', TX, TY, TW, 1, BORD, D);
  mkText('THE TRUTH LOOP', TX+24, TY+16, 11, WHITE, 'Bold', D);
  mkText('Plan (outline) vs. Realität (blau)', TX+170, TY+18, 9, G2, 'Regular', D);
  mkRect('div-tl', TX, TY+40, TW, 1, BORD, D);

  const dX=TX+490;
  mkRect('debt-bg', dX-16, TY+54, 160, 80, REDBG, D, 6);
  mkText('IGNORANCE DEBT', dX-8, TY+62, 9, RED, 'Bold', D);
  mkText('-12.5h', dX-12, TY+78, 40, RED, 'Bold', D);
  mkText('Stunden Selbstbetrug', dX-8, TY+130, 9, {r:.6,g:.2,b:.2}, 'Regular', D);

  mkText('PLAN', TX+24, TY+56, 9, G2, 'Regular', D);
  [10,8,6,4,2,0].forEach(function(v,i){
    var ly=TY+78+(i/5)*cH;
    mkText(v+'h',TX+8,ly-6,9,G2,'Regular',D);
    mkRect('gl-'+v,TX+30,ly,380,1,GRID,D);
  });
  [[6,'MO'],[8,'DI'],[6,'MI'],[6,'DO'],[4,'FR']].forEach(function(item,i){
    var bx=TX+36+i*(bwBar+gap),bh=(item[0]/mH)*cH,by=bY-bh;
    mkOutline('pb-'+i,bx,by,bwBar,bh,G2,D,2);
    mkText(item[0]+'h',bx+3,by-16,9,G2,'Regular',D);
    mkText(item[1],bx+9,bY+10,9,G2,'Regular',D);
  });

  const rX=TX+650;
  mkText('REALITÄT', rX, TY+56, 9, BLUE, 'Regular', D);
  [10,8,6,4,2,0].forEach(function(v,i){
    var ly=TY+78+(i/5)*cH;
    mkText(v+'h',rX-22,ly-6,9,G2,'Regular',D);
    mkRect('gr-'+v,rX,ly,390,1,GRID,D);
  });
  var planH=[6,8,6,6,4];
  [[4.5,'MO'],[6,'DI'],[3,'MI'],[2,'DO'],[2,'FR']].forEach(function(item,i){
    var bx=rX+6+i*(bwBar+gap),bh=(item[0]/mH)*cH,by=bY-bh;
    var under=item[0]<planH[i];
    mkRect('tb-'+i,bx,by,bwBar,bh,under?{r:.5,g:.18,b:.35}:BLUE,D,2);
    mkText(item[0]+'h',bx+3,by-16,9,G1,'Regular',D);
    mkText(item[1],bx+9,bY+10,9,G2,'Regular',D);
  });
}

// ─────────────────────────────────────────────────────────
// FOCUS — Radical Minimalism
// ─────────────────────────────────────────────────────────
function buildFocus(page) {
  const D = mkFrame('Focus', 0, 0, 1440, 900, {r:.028,g:.028,b:.035}, page);

  const pb=mkFrame('pov',620,28,200,26,BLUEBG,D,13);
  pb.strokes=[{type:'SOLID',color:BLUE}]; pb.strokeWeight=1;
  const pt=figma.createText();
  pt.fontName={family:'Inter',style:'Bold'}; pt.fontSize=9;
  pt.characters='FOUNDER  —  ACTIVE'; pt.fills=solid(BLUE); pt.x=20; pt.y=8;
  pb.appendChild(pt);

  mkCenter('LEADS', 130, 100, WHITE, 'Bold', D);
  mkCenter('ABTELEFONIEREN', 242, 68, {r:.22,g:.22,b:.28}, 'Bold', D);
  mkRect('line', 680, 328, 80, 2, BLUE, D);

  const bD=190, bX=(1440-bD)/2, bY=356;
  mkEllipse('glow2', bX-18, bY-18, bD+36, {r:.04,g:.08,b:.18}, D);
  mkEllipse('glow1', bX-7,  bY-7,  bD+14, {r:.06,g:.14,b:.30}, D);
  mkEllipse('btn',   bX,    bY,    bD,    BLUE, D);
  const st=figma.createText();
  st.fontName={family:'Inter',style:'Bold'}; st.fontSize=28;
  st.characters='START'; st.fills=solid(DARK);
  st.x=bX+55; st.y=bY+78; D.appendChild(st);

  mkCenter('00:00:00', 585, 68, WHITE, 'Bold', D);
  mkCenter('REALITY TRACKER', 665, 10, G2, 'Medium', D);
  mkCenter('Kein zweiter Timer. Eine Aufgabe. Volle Präsenz.', 828, 11, G3, 'Regular', D);

  const vig=figma.createRectangle();
  vig.name='vignette'; vig.x=0; vig.y=0; vig.resize(1440,900);
  vig.fills=[{
    type:'GRADIENT_RADIAL', gradientTransform:[[1,0,0],[0,1,0]],
    gradientStops:[
      {position:0,   color:{r:.028,g:.028,b:.035,a:0}},
      {position:0.48,color:{r:.028,g:.028,b:.035,a:0}},
      {position:0.76,color:{r:.028,g:.028,b:.035,a:0.62}},
      {position:1,   color:{r:.028,g:.028,b:.035,a:0.97}},
    ]
  }];
  D.appendChild(vig);
}

// ─────────────────────────────────────────────────────────
// MISSION CONTROL — Screen A: Project Overview
// ─────────────────────────────────────────────────────────
function buildMCOverview(page) {
  const D = mkFrame('MC Overview', 0, 0, 1440, 900, BG, page);
  buildSidebar(D, 'mc');
  const X=221, W=1219;

  mkText('MISSION CONTROL', X+24, 22, 10, G2, 'Medium', D);
  mkRect('div-mc', X, 44, W, 1, BORD, D);

  mkText('FILTER:', X+24, 58, 9, G2, 'Regular', D);
  chip('pov-f', X+80,  52, 'FOUNDER', true, D);
  chip('pov-s', X+186, 52, 'STUDENT', false, D);
  chip('pov-a', X+282, 52, 'ATHLETE', false, D);
  mkRect('div-filter', X, 88, W, 1, BORD, D);

  const projects = [
    {name:'Flow OS — Produktentwicklung', pov:'FOUNDER', reality:'22.5h', plan:'30h', pct:65, status:'AKTIV'},
    {name:'Immobilienvertrieb Q2',        pov:'FOUNDER', reality:'18h',   plan:'20h', pct:40, status:'AKTIV'},
    {name:'Wirtschaftspsychologie Sem 1', pov:'STUDENT', reality:'8h',    plan:'15h', pct:30, status:'BEHIND'},
    {name:'Bodybuilding — Push/Pull/Legs',pov:'ATHLETE', reality:'12h',   plan:'12h', pct:80, status:'ON TRACK'},
  ];

  projects.forEach(function(proj, i) {
    var cY = 104 + i*182;
    var cH = 164, cW = W-2;

    mkRect('card-bg-'+i, X+1, cY, cW, cH, {r:.060,g:.060,b:.072}, D, 6);
    mkRect('card-accent-'+i, X+1, cY, 3, cH,
      proj.status==='AKTIV'?BLUE : proj.status==='BEHIND'?RED : {r:.2,g:.7,b:.3}, D);

    const povBadge = mkFrame('pov-badge-'+i, X+24, cY+14, 70, 18, BLUEBG, D, 9);
    const pvt = figma.createText();
    pvt.fontName={family:'Inter',style:'Bold'}; pvt.fontSize=8;
    pvt.characters=proj.pov; pvt.fills=solid(BLUE); pvt.x=10; pvt.y=4;
    povBadge.appendChild(pvt);

    mkText(proj.name, X+108, cY+12, 18, WHITE, 'Bold', D, 620);

    const sc = proj.status==='AKTIV'?BLUE : proj.status==='BEHIND'?RED : {r:.2,g:.7,b:.3};
    const sbg = mkFrame('st-badge-'+i, X+cW-120, cY+14, 90, 20,
      proj.status==='BEHIND'?REDBG:BLUEBG, D, 4);
    const sbt = figma.createText();
    sbt.fontName={family:'Inter',style:'Bold'}; sbt.fontSize=8;
    sbt.characters=proj.status; sbt.fills=solid(sc); sbt.x=8; sbt.y=5;
    sbg.appendChild(sbt);

    mkRect('metric-div-'+i, X+16, cY+46, cW-32, 1, BORD, D);
    mkText('REALITY TIME', X+24, cY+58, 9, G2, 'Regular', D);
    mkText(proj.reality, X+24, cY+72, 28, WHITE, 'Bold', D);
    mkText('PLAN TIME', X+200, cY+58, 9, G2, 'Regular', D);
    mkText(proj.plan, X+200, cY+72, 28, G1, 'Regular', D);

    var delta = parseFloat(proj.reality) - parseFloat(proj.plan);
    var deltaColor = delta>=0?BLUE:RED;
    mkText('DELTA', X+360, cY+58, 9, G2, 'Regular', D);
    mkText((delta>=0?'+':'')+delta.toFixed(1)+'h', X+360, cY+72, 28, deltaColor, 'Bold', D);

    mkRect('pbar-t-'+i, X+24, cY+118, cW-200, 6, G3, D, 3);
    mkRect('pbar-f-'+i, X+24, cY+118, (cW-200)*proj.pct/100, 6, BLUE, D, 3);
    mkText(proj.pct+'% abgeschlossen', X+24, cY+130, 9, G2, 'Regular', D);

    const ob = mkFrame('open-btn-'+i, X+cW-112, cY+108, 96, 32, BLUE, D, 4);
    btnText(ob, 'ÖFFNEN  →', DARK);
  });
}

// ─────────────────────────────────────────────────────────
// MISSION CONTROL — Screen B: Project Detail (Akkordeon)
// ─────────────────────────────────────────────────────────
function buildMCDetail(page) {
  const D = mkFrame('MC Detail', 0, 0, 1440, 900, BG, page);
  buildSidebar(D, 'mc');
  const X=221, W=1219;

  // Breadcrumb
  mkText('MISSION CONTROL', X+24, 18, 9, G2, 'Regular', D);
  mkText('›', X+140, 17, 9, G2, 'Regular', D);
  mkText('Flow OS — Produktentwicklung', X+154, 18, 9, BLUE, 'Regular', D);
  mkRect('div-top', X, 38, W, 1, BORD, D);

  // OBJECTIVE
  mkRect('obj-bg', X+1, 48, W-2, 80, {r:.060,g:.060,b:.072}, D, 6);
  mkRect('obj-line', X+1, 48, 3, 80, BLUE, D);
  mkText('OBJECTIVE', X+24, 56, 9, BLUE, 'Bold', D);
  mkText('Flow OS V1 launchen und ersten zahlenden Kunden gewinnen', X+24, 72, 16, WHITE, 'Bold', D, W-240);
  mkRect('obj-prog-t', X+820, 78, 180, 4, G3, D, 2);
  mkRect('obj-prog-f', X+820, 78, 117, 4, BLUE, D, 2);
  mkText('65%', X+1010, 72, 11, G1, 'Medium', D);

  mkRect('div-kr-top', X+1, 128, W-2, 1, BORD, D);

  // Filter chips + AI button
  mkText('TASKS', X+24, 138, 9, G2, 'Medium', D);
  var cx = X+90;
  var filterLabels = ['ALLE', '⚡ FLOW STATE', '⏱ QUICK <15m', '😴 EASY TASK'];
  filterLabels.forEach(function(l, idx) {
    var c = chip('chip-filter-'+idx, cx, 132, l, idx===0, D);
    cx += c.width + 8;
  });

  const aiBg = mkFrame('ai-btn', X+W-230, 130, 148, 30, BLUEGLOW, D, 4);
  aiBg.strokes=[{type:'SOLID',color:BLUE}]; aiBg.strokeWeight=1;
  const ait=figma.createText();
  ait.fontName={family:'Inter',style:'Bold'}; ait.fontSize=10;
  ait.characters='✦ GENERATE OKR / TASKS'; ait.fills=solid(BLUE);
  ait.x=10; ait.y=9; aiBg.appendChild(ait);
  const premBadge=mkFrame('premium', X+W-76, 126, 58, 18, {r:.22,g:.16,b:.04}, D, 9);
  const premt=figma.createText();
  premt.fontName={family:'Inter',style:'Bold'}; premt.fontSize=8;
  premt.characters='PREMIUM'; premt.fills=solid(GOLD); premt.x=8; premt.y=5;
  premBadge.appendChild(premt);

  mkRect('div-tasks-top', X+1, 168, W-2, 1, BORD, D);

  // ── ACCORDION KR DATA ──────────────────────────────────
  var krs = [
    {
      key:'KR1', label:'Prototyp fertiggestellt', pct:65, status:'AKTIV',
      tasks:[
        {title:'Plugin Code schreiben',          type:'⚡ FLOW',  time:'02:14:30', live:true},
        {title:'Figma Prototype finalisieren',    type:'⚡ FLOW',  time:'00:00:00', live:false},
      ]
    },
    {
      key:'KR2', label:'10 Beta-Nutzer ongeboardet', pct:20, status:'AKTIV',
      tasks:[
        {title:'Beta-Nutzer anschreiben',         type:'⏱ QUICK', time:'00:00:00', live:false},
      ]
    },
    {
      key:'KR3', label:'Ersten zahlenden Kunden',    pct:0,  status:'OFFEN',
      tasks:[
        {title:'Pricing Strategie definieren',    type:'😴 EASY',  time:'00:00:00', live:false},
      ]
    },
    {
      key:'KR4', label:'MRR > 500€',                 pct:0,  status:'OFFEN',
      tasks:[]
    },
  ];

  var curY = 176;
  var KR_H = 40;
  var TASK_H = 44;

  krs.forEach(function(kr, ki) {
    var isActive = kr.status === 'AKTIV';
    var hdrColor = isActive ? {r:.064,g:.076,b:.096} : {r:.056,g:.056,b:.068};

    // Clickable KR header row (named for prototype wiring)
    mkRect('kr-hdr-bg-'+ki, X+1, curY, W-2, KR_H, hdrColor, D);
    mkRect('kr-hdr-line-'+ki, X+1, curY, 3, KR_H, isActive?BLUE:G3, D);

    // Chevron: filled = open (active KRs show open)
    mkText(isActive?'▾':'▸', X+18, curY+13, 10, isActive?BLUE:G3, 'Bold', D);
    mkText(kr.key+':', X+34, curY+13, 10, isActive?BLUE:G3, 'Bold', D);
    mkText(kr.label, X+78, curY+13, 12, isActive?WHITE:G2, isActive?'Semi Bold':'Regular', D, 330);

    mkRect('kr-h-pt-'+ki, X+440, curY+18, 180, 4, G3, D, 2);
    if(kr.pct>0) mkRect('kr-h-pf-'+ki, X+440, curY+18, 180*kr.pct/100, 4, BLUE, D, 2);
    mkText(kr.pct+'%', X+630, curY+13, 10, kr.pct>0?G1:G3, 'Medium', D);
    mkText(kr.tasks.length+' Tasks', X+690, curY+13, 9, G2, 'Regular', D);

    var sc2 = isActive?BLUE:G3;
    var sb2 = mkFrame('kr-s2-'+ki, X+W-180, curY+10, 54, 20, isActive?BLUEBG:{r:.11,g:.11,b:.13}, D, 3);
    var sbt=figma.createText(); sbt.fontName={family:'Inter',style:'Bold'};
    sbt.fontSize=8; sbt.characters=kr.status; sbt.fills=solid(sc2);
    sbt.x=isActive?10:12; sbt.y=5;
    sb2.appendChild(sbt);

    curY += KR_H;

    // Task rows (only shown for active KRs — accordion open state)
    if(isActive) {
      kr.tasks.forEach(function(task, ti) {
        mkRect('t-sep-'+ki+'-'+ti, X+1, curY, W-2, 1, {r:.09,g:.09,b:.11}, D);
        // Indent stripe
        mkRect('t-indent-'+ki+'-'+ti, X+1, curY, 28, TASK_H, {r:.060,g:.060,b:.074}, D);
        mkRect('t-conn-'+ki+'-'+ti, X+27, curY, 2, TASK_H, BLUE, D);

        mkText(task.title, X+44, curY+10, 12, WHITE, 'Regular', D, 380);

        var lb=mkFrame('t-kr-lnk-'+ki+'-'+ti, X+460, curY+11, 50, 22, BLUEBG, D, 4);
        var lt=figma.createText(); lt.fontName={family:'Inter',style:'Bold'};
        lt.fontSize=9; lt.characters='→ '+kr.key; lt.fills=solid(BLUE); lt.x=6; lt.y=6;
        lb.appendChild(lt);

        var typeColor = task.type.indexOf('FLOW')>=0?BLUE : task.type.indexOf('QUICK')>=0?{r:.2,g:.8,b:.6} : G2;
        mkText(task.type, X+530, curY+14, 10, typeColor, 'Regular', D);

        mkText(task.time, X+700, curY+13, 13, task.live?BLUE:G2, 'Bold', D);
        if(task.live){
          mkRect('t-dot-'+ki+'-'+ti, X+790, curY+19, 6, 6, BLUE, D, 3);
          mkText('LIVE', X+800, curY+16, 8, BLUE, 'Bold', D);
        }

        var b=mkFrame('t-btn-'+ki+'-'+ti, X+900, curY+8, 88, 28, task.live?BLUE:{r:.12,g:.12,b:.14}, D, 4);
        btnText(b, task.live?'PAUSE':'START', task.live?DARK:G1);

        curY += TASK_H;
      });
    }

    mkRect('kr-div-'+ki, X+1, curY, W-2, 1, BORD, D);
    curY += 1;
  });

  // ── SIDE QUESTS SECTION ───────────────────────────────
  curY += 8;
  mkRect('sq-section-bg', X+1, curY, W-2, 36, {r:.12,g:.09,b:.05}, D);
  mkRect('sq-section-line', X+1, curY, 3, 36, AMBER, D);
  mkText('⚠ SIDE QUESTS', X+18, curY+12, 10, AMBER, 'Bold', D);
  mkText('Tasks ohne Key Result — tragen zu keinem Ziel bei', X+164, curY+14, 9, {r:.5,g:.35,b:.1}, 'Regular', D);
  curY += 36;

  mkRect('sq-task-sep', X+1, curY, W-2, 1, {r:.15,g:.12,b:.07}, D);
  mkRect('sq-task-bg', X+1, curY, W-2, TASK_H, {r:.11,g:.09,b:.07}, D);
  mkText('Twitter / Social Media', X+44, curY+15, 12, AMBER, 'Medium', D);
  var sq=mkFrame('sq-badge', X+460, curY+12, 86, 22, {r:.28,g:.18,b:.05}, D, 4);
  var sqt=figma.createText(); sqt.fontName={family:'Inter',style:'Bold'};
  sqt.fontSize=9; sqt.characters='⚠ SIDE QUEST'; sqt.fills=solid(AMBER); sqt.x=8; sqt.y=6;
  sq.appendChild(sqt);
  mkText('Warum machst du das?', X+560, curY+15, 10, {r:.6,g:.4,b:.1}, 'Regular', D);
  var sqBtn=mkFrame('sq-btn', X+900, curY+8, 88, 28, {r:.10,g:.10,b:.10}, D, 4);
  sqBtn.strokes=[{type:'SOLID',color:{r:.22,g:.18,b:.12}}]; sqBtn.strokeWeight=1;
  var sqBt=figma.createText(); sqBt.fontName={family:'Inter',style:'Regular'};
  sqBt.fontSize=10; sqBt.characters='GESPERRT'; sqBt.fills=solid({r:.35,g:.28,b:.18});
  sqBt.x=14; sqBt.y=8; sqBtn.appendChild(sqBt);

  // ── ERFOLGSKETTE ──────────────────────────────────────
  var chainY = 742;
  mkRect('div-chain', X+1, chainY, W-2, 1, BORD, D);
  mkText('ERFOLGSKETTE:', X+24, chainY+12, 9, G2, 'Regular', D);
  mkText('Plugin Code  →  KR1: Prototyp fertig  →  Objective: Launch V1  →  MAIN QUEST', X+128, chainY+12, 9, BLUE, 'Regular', D, W-200);
}

// ─────────────────────────────────────────────────────────
// MISSION CONTROL — Screen C: KR-gefilterte Ansicht
// krKey: 'KR1' | 'KR2'
// ─────────────────────────────────────────────────────────
function buildMCDetailFiltered(page, krKey, krLabel, krPct, tasks) {
  var frameName = page.name;
  const D = mkFrame(frameName, 0, 0, 1440, 900, BG, page);
  buildSidebar(D, 'mc');
  const X=221, W=1219;

  // Breadcrumb
  mkText('MISSION CONTROL', X+24, 18, 9, G2, 'Regular', D);
  mkText('›', X+140, 17, 9, G2, 'Regular', D);
  mkText('Flow OS', X+154, 18, 9, G2, 'Regular', D);
  mkText('›', X+196, 17, 9, G2, 'Regular', D);
  mkText(krKey+': '+krLabel, X+210, 18, 9, BLUE, 'Regular', D);
  mkRect('div-top', X, 38, W, 1, BORD, D);

  // OBJECTIVE (condensed)
  mkRect('obj-bg', X+1, 48, W-2, 76, {r:.060,g:.060,b:.072}, D, 6);
  mkRect('obj-line', X+1, 48, 3, 76, BLUE, D);
  mkText('OBJECTIVE', X+24, 56, 9, BLUE, 'Bold', D);
  mkText('Flow OS V1 launchen und ersten zahlenden Kunden gewinnen', X+24, 72, 15, WHITE, 'Bold', D, W-240);
  mkRect('obj-prog-t', X+820, 78, 180, 4, G3, D, 2);
  mkRect('obj-prog-f', X+820, 78, 117, 4, BLUE, D, 2);
  mkText('65%', X+1010, 72, 11, G1, 'Medium', D);
  mkRect('div-kr-top', X+1, 124, W-2, 1, BORD, D);

  // Filter chips — ALLE inactive (back), active KR highlighted, other KR clickable
  mkText('TASKS', X+24, 134, 9, G2, 'Medium', D);
  var cx2 = X+90;
  // ALLE chip (leads back)
  chip('chip-alle-back', cx2, 128, 'ALLE', false, D);
  cx2 += 52+8;
  // KR1 chip
  chip('chip-kr1-filter', cx2, 128, 'KR1', krKey==='KR1', D);
  cx2 += 45+8;
  // KR2 chip
  chip('chip-kr2-filter', cx2, 128, 'KR2', krKey==='KR2', D);
  cx2 += 45+8;

  // AI button
  var aiBg2 = mkFrame('ai-btn', X+W-230, 126, 148, 30, BLUEGLOW, D, 4);
  aiBg2.strokes=[{type:'SOLID',color:BLUE}]; aiBg2.strokeWeight=1;
  var ait2=figma.createText();
  ait2.fontName={family:'Inter',style:'Bold'}; ait2.fontSize=10;
  ait2.characters='✦ GENERATE OKR / TASKS'; ait2.fills=solid(BLUE);
  ait2.x=10; ait2.y=9; aiBg2.appendChild(ait2);

  mkRect('div-tasks-top', X+1, 164, W-2, 1, BORD, D);

  // Expanded KR header (this KR is open/active)
  var curY2 = 172;
  mkRect('kr-expanded-bg', X+1, curY2, W-2, 44, BLUEBG, D);
  mkRect('kr-expanded-line', X+1, curY2, 3, 44, BLUE, D);
  mkText('▾', X+18, curY2+16, 10, BLUE, 'Bold', D);
  mkText(krKey+':', X+34, curY2+16, 10, BLUE, 'Bold', D);
  mkText(krLabel, X+78, curY2+16, 14, WHITE, 'Semi Bold', D, 340);
  mkRect('kr-exp-pt', X+440, curY2+22, 180, 4, G3, D, 2);
  if(krPct>0) mkRect('kr-exp-pf', X+440, curY2+22, 180*krPct/100, 4, BLUE, D, 2);
  mkText(krPct+'%', X+630, curY2+16, 10, krPct>0?G1:G3, 'Medium', D);
  mkText(tasks.length+' Tasks gefiltert', X+700, curY2+16, 9, BLUE, 'Regular', D);

  var scKR = mkFrame('kr-exp-status', X+W-180, curY2+12, 54, 20, BLUEBG, D, 3);
  var scKRt=figma.createText(); scKRt.fontName={family:'Inter',style:'Bold'};
  scKRt.fontSize=8; scKRt.characters='AKTIV'; scKRt.fills=solid(BLUE); scKRt.x=10; scKRt.y=5;
  scKR.appendChild(scKRt);

  curY2 += 44;

  // Tasks
  tasks.forEach(function(task, i) {
    var TASK_H2 = 48;
    mkRect('ft-sep-'+i, X+1, curY2, W-2, 1, {r:.09,g:.09,b:.11}, D);
    mkRect('ft-indent-'+i, X+1, curY2, 28, TASK_H2, {r:.060,g:.060,b:.074}, D);
    mkRect('ft-conn-'+i, X+27, curY2, 2, TASK_H2, BLUE, D);

    mkText(task.title, X+44, curY2+11, 13, WHITE, 'Regular', D, 380);

    var lb2=mkFrame('ft-lnk-'+i, X+460, curY2+13, 50, 22, BLUEBG, D, 4);
    var lt2=figma.createText(); lt2.fontName={family:'Inter',style:'Bold'};
    lt2.fontSize=9; lt2.characters='→ '+krKey; lt2.fills=solid(BLUE); lt2.x=6; lt2.y=6;
    lb2.appendChild(lt2);

    var typeColor2 = task.type.indexOf('FLOW')>=0?BLUE : task.type.indexOf('QUICK')>=0?{r:.2,g:.8,b:.6} : G2;
    mkText(task.type, X+530, curY2+16, 10, typeColor2, 'Regular', D);

    mkText(task.time, X+700, curY2+15, 13, task.live?BLUE:G2, 'Bold', D);
    if(task.live){
      mkRect('ft-dot-'+i, X+790, curY2+21, 6, 6, BLUE, D, 3);
      mkText('LIVE', X+800, curY2+18, 8, BLUE, 'Bold', D);
    }

    var b2=mkFrame('ft-btn-'+i, X+900, curY2+10, 88, 28, task.live?BLUE:{r:.12,g:.12,b:.14}, D, 4);
    btnText(b2, task.live?'PAUSE':'START', task.live?DARK:G1);

    curY2 += TASK_H2;
  });

  curY2 += 12;
  mkRect('div-count', X+1, curY2, W-2, 1, BORD, D);
  mkText(tasks.length+' Tasks für '+krKey+' — '+tasks.filter(function(t){return t.live;}).length+' aktiv', X+24, curY2+12, 10, G2, 'Regular', D);

  // Erfolgskette
  mkRect('div-chain', X+1, 742, W-2, 1, BORD, D);
  mkText('ERFOLGSKETTE:', X+24, 754, 9, G2, 'Regular', D);
  mkText('→  '+krKey+': '+krLabel+'  →  Objective: Launch V1  →  MAIN QUEST', X+128, 754, 9, BLUE, 'Regular', D, W-200);
}

// ─────────────────────────────────────────────────────────
// PLANNER
// ─────────────────────────────────────────────────────────
function buildPlanner(page) {
  const D = mkFrame('Planner', 0, 0, 1440, 900, BG, page);
  buildSidebar(D, 'planner');
  const X=221, W=1219;

  mkText('PLANNER', X+24, 22, 10, G2, 'Medium', D);
  mkText('KW 19  •  5.–11. Mai 2026', X+24, 40, 18, WHITE, 'Bold', D);
  mkRect('div-top', X, 74, W, 1, BORD, D);

  const lH=376, L1=88, L2=88+lH+1;
  mkRect('l1-bg', X, L1, W, lH, {r:.052,g:.068,b:.076}, D);
  mkRect('l2-bg', X, L2, W, lH, BG, D);
  mkRect('div-l', X, L2, W, 1, BORD, D);
  mkText('STRATEGIC GROWTH', X+16, L1+12, 10, BLUE, 'Bold', D);
  mkText('Main Quest only — Side Quests eliminiert.', X+190, L1+13, 10, G2, 'Regular', D);
  mkText('HUMANING — SOPs', X+16, L2+12, 10, G1, 'Bold', D);
  mkText('Training, Uni, Admin — System läuft.', X+190, L2+13, 10, G2, 'Regular', D);

  const days=['MO 05','DI 06','MI 07','DO 08','FR 09','SA 10','SO 11'];
  const cW=Math.floor(W/7);
  days.forEach(function(day, i){
    var cx=X+i*cW;
    if(i>0) mkRect('cd-'+i,cx,L1,1,lH*2+1,BORD,D);
    mkRect('ch-'+i,cx,L1+32,cW,22,{r:.09,g:.09,b:.11},D);
    mkText(day,cx+8,L1+38,10,G1,'Regular',D);
  });

  [
    [0,L1+58,150,'FLOW OS\nPLUGIN CODE',{r:.06,g:.14,b:.26},'MAKER'],
    [1,L1+58,110,'VERTRIEB\nVORB.',     {r:.06,g:.14,b:.26},'MAKER'],
    [2,L1+58,130,'BETA NUTZER\nONBOARD',{r:.06,g:.14,b:.26},'MAKER'],
    [3,L1+58, 88,'STRATEGIE\nSESSION',  {r:.04,g:.10,b:.20},'MANAGER'],
    [4,L1+58,150,'DEEP WORK\nBLOCK',    {r:.06,g:.14,b:.26},'MAKER'],
  ].forEach(function(item){
    var cx=X+item[0]*cW+4, bw=cW-8;
    var blk=mkFrame('mk-'+item[0],cx,item[1],bw,item[2],item[3],D,4);
    var lt=figma.createText(); lt.fontName={family:'Inter',style:'Bold'};
    lt.fontSize=9; lt.characters=item[4]; lt.fills=solid(WHITE); lt.x=8; lt.y=8;
    blk.appendChild(lt);
    var tt=figma.createText(); tt.fontName={family:'Inter',style:'Regular'};
    tt.fontSize=8; tt.characters=item[5]; tt.fills=solid(BLUE); tt.x=8; tt.y=item[2]-18;
    blk.appendChild(tt);
  });

  [
    [0,L2+36,80,'GYM\nPUSH DAY',{r:.10,g:.10,b:.16},false],
    [1,L2+36,60,'UNI\nLERNEN',  {r:.08,g:.08,b:.16},false],
    [2,L2+36,80,'GYM\nPULL DAY',{r:.10,g:.10,b:.16},false],
    [3,L2+36,60,'UNI\nLERNEN',  {r:.08,g:.08,b:.16},false],
    [4,L2+36,80,'GYM\nLEGS',    {r:.10,g:.10,b:.16},false],
    [5,L2+36,60,'MEAL\nPREP',   {r:.14,g:.12,b:.08},true],
  ].forEach(function(item){
    var cx=X+item[0]*cW+4, bw=cW-8;
    var blk=mkFrame('sp-'+item[0],cx,item[1],bw,item[2],item[3],D,4);
    var lt=figma.createText(); lt.fontName={family:'Inter',style:'Bold'};
    lt.fontSize=9; lt.characters=item[4]; lt.fills=solid(G1); lt.x=8; lt.y=8;
    blk.appendChild(lt);
    if(item[5]){
      var sb=mkFrame('sq-b-'+item[0],bw-38,4,34,16,{r:.28,g:.22,b:.04},blk,3);
      var st2=figma.createText(); st2.fontName={family:'Inter',style:'Bold'};
      st2.fontSize=7; st2.characters='SIDE'; st2.fills=solid(AMBER); st2.x=7; st2.y=4;
      sb.appendChild(st2);
    }
  });

  mkRect('leg1',X+24,876,10,10,{r:.06,g:.14,b:.26},D,2); mkText('MAKER',X+40,874,9,G2,'Regular',D);
  mkRect('leg2',X+110,876,10,10,{r:.04,g:.10,b:.20},D,2); mkText('MANAGER',X+126,874,9,G2,'Regular',D);
  mkRect('leg3',X+230,876,10,10,{r:.10,g:.10,b:.16},D,2); mkText('SOP',X+246,874,9,G2,'Regular',D);
  mkRect('leg4',X+310,876,10,10,{r:.28,g:.22,b:.04},D,2); mkText('SIDE QUEST',X+326,874,9,AMBER,'Regular',D);
}

// ─────────────────────────────────────────────────────────
// INSIGHTS
// ─────────────────────────────────────────────────────────
function buildInsights(page) {
  const D = mkFrame('Insights', 0, 0, 1440, 900, BG, page);
  buildSidebar(D, 'insights');
  const X=221, W=1219;

  mkText('INSIGHTS', X+24, 22, 10, G2, 'Medium', D);
  mkRect('div-top', X, 44, W, 1, BORD, D);

  mkText('EFFICIENCY SCORE', X+24, 62, 9, G2, 'Regular', D);
  mkText('74%', X+24, 78, 86, BLUE, 'Bold', D);
  mkText('Deep Work vs. Busy Work Ratio — KW 19', X+24, 176, 11, G2, 'Regular', D);

  [
    ['Deep Work', '22.5h', BLUE,  '+4.5h'],
    ['Busy Work',  '7.5h', RED,   '-2.0h'],
    ['Lost Time',  '6.0h', AMBER, '+1.0h'],
  ].forEach(function(m, i){
    var mx=X+24+i*215;
    mkRect('mb-'+i,mx,198,198,66,{r:.08,g:.08,b:.10},D,4);
    mkText(m[0],mx+14,208,9,G2,'Regular',D);
    mkText(m[1],mx+14,222,22,m[2],'Bold',D);
    mkText(m[3],mx+14,252,9,i===0?BLUE:RED,'Regular',D);
  });

  mkRect('div-pvd', X, 288, W, 1, BORD, D);
  mkText('WHAT YOU PROMISED VS. WHAT YOU DELIVERED', X+24, 304, 10, G1, 'Bold', D);
  mkRect('pvh', X, 324, W, 1, BORD, D);
  mkText('AUFGABE',X+24,332,9,G2,'Regular',D);
  mkText('VERSPROCHEN',X+460,332,9,G2,'Regular',D);
  mkText('GELIEFERT',X+640,332,9,G2,'Regular',D);
  mkText('DELTA',X+830,332,9,G2,'Regular',D);
  mkRect('pvh2',X,348,W,1,BORD,D);

  [
    ['Flow OS Plugin fertig','Sprint 1','Sprint 1',true],
    ['Beta Nutzer onboarden','5 Nutzer','2 Nutzer',false],
    ['Gym Sessions',         '4 Sessions','3 Sessions',false],
    ['Wochenplanung',        '1x Sonntag','1x Sonntag',true],
  ].forEach(function(row, i){
    var y=358+i*56;
    if(i>0) mkRect('pvs-'+i,X,y-4,W,1,{r:.09,g:.09,b:.11},D);
    mkText(row[0],X+24,y+10,13,WHITE,'Regular',D);
    mkText(row[1],X+460,y+10,13,G1,'Regular',D);
    mkText(row[2],X+640,y+10,13,row[3]?BLUE:RED,'Medium',D);
    var b=mkFrame('bd-'+i,X+830,y+8,82,24,row[3]?BLUEBG:REDBG,D,4);
    var bt=figma.createText(); bt.fontName={family:'Inter',style:'Bold'};
    bt.fontSize=9; bt.characters=row[3]?'DELIVERED':'MISS';
    bt.fills=solid(row[3]?BLUE:RED); bt.x=row[3]?8:18; bt.y=7; b.appendChild(bt);
  });

  mkRect('div-bct',X,588,W,1,BORD,D);
  mkText('BEHAVIOR CHANGE TRACKER',X+24,604,10,G1,'Bold',D);
  mkText('Was lernst du diese Woche — und wendest du nächste Woche an?',X+24,622,11,G2,'Regular',D,700);
  mkRect('input-bg',X+24,650,820,108,{r:.08,g:.08,b:.10},D,6);
  mkText('Schreibe hier deine Erkenntnis...',X+44,670,13,G3,'Regular',D,780);
  mkRect('cursor',X+44,670,2,18,BLUE,D);
  mkText('"Clear beats clever. Stop planning. Start tracking reality."',X+24,796,12,G3,'Regular',D,680);
}

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────
async function main() {
  await loadFonts();

  function getOrCreatePage(name) {
    var p = figma.root.children.find(function(pg){ return pg.name===name; });
    if(!p){ p=figma.createPage(); p.name=name; figma.root.appendChild(p); }
    // Remove all existing children (clean rebuild)
    p.children.slice().forEach(function(n){ n.remove(); });
    return p;
  }

  var pgDash    = getOrCreatePage('Dashboard');
  var pgFocus   = getOrCreatePage('Focus');
  var pgMCov    = getOrCreatePage('MC Overview');
  var pgMCdet   = getOrCreatePage('MC Detail');
  var pgMCdetKR1= getOrCreatePage('MC Detail KR1');
  var pgMCdetKR2= getOrCreatePage('MC Detail KR2');
  var pgPlan    = getOrCreatePage('Planner');
  var pgIns     = getOrCreatePage('Insights');

  buildDashboard(pgDash);
  buildFocus(pgFocus);
  buildMCOverview(pgMCov);
  buildMCDetail(pgMCdet);

  buildMCDetailFiltered(pgMCdetKR1, 'KR1', 'Prototyp fertiggestellt', 65, [
    {title:'Plugin Code schreiben',         type:'⚡ FLOW',  time:'02:14:30', live:true},
    {title:'Figma Prototype finalisieren',   type:'⚡ FLOW',  time:'00:00:00', live:false},
  ]);
  buildMCDetailFiltered(pgMCdetKR2, 'KR2', '10 Beta-Nutzer ongeboardet', 20, [
    {title:'Beta-Nutzer anschreiben',        type:'⏱ QUICK', time:'00:00:00', live:false},
  ]);

  buildPlanner(pgPlan);
  buildInsights(pgIns);

  // ── PROTOTYPE INTERACTIONS ────────────────────────────
  var fDash    = pgDash.children[0];
  var fFocus   = pgFocus.children[0];
  var fMCov    = pgMCov.children[0];
  var fMCdet   = pgMCdet.children[0];
  var fMCdetKR1= pgMCdetKR1.children[0];
  var fMCdetKR2= pgMCdetKR2.children[0];
  var fPlan    = pgPlan.children[0];
  var fIns     = pgIns.children[0];

  function react(dest) {
    return [{
      trigger:{type:'ON_CLICK'},
      action:{type:'NODE',destinationId:dest.id,navigation:'NAVIGATE',
        transition:{type:'SMART_ANIMATE',easing:{type:'EASE_OUT'},duration:0.25},
        resetScrollPosition:false}
    }];
  }

  // Sidebar navigation (all frames)
  var allFrames = [fDash, fFocus, fMCov, fMCdet, fMCdetKR1, fMCdetKR2, fPlan, fIns];
  var navDests = {
    'Dashboard': fDash,
    'Focus': fFocus,
    'Mission Control': fMCov,
    'Planner': fPlan,
    'Insights': fIns,
  };

  allFrames.forEach(function(frame) {
    if(!frame) return;
    var sb = frame.findOne(function(n){ return n.name==='Sidebar'; });
    if(!sb) return;
    Object.keys(navDests).forEach(function(label) {
      var dest = navDests[label];
      if(!dest || frame===dest) return;
      sb.findAll(function(n){ return n.type==='TEXT' && n.characters===label; })
        .forEach(function(t){ t.reactions = react(dest); });
    });
  });

  // ENGAGE → Focus
  if(fDash && fFocus) {
    var eb = fDash.findOne(function(n){ return n.name==='engage-btn'; });
    if(eb) eb.reactions = react(fFocus);
  }

  // MC Overview ÖFFNEN → MC Detail
  if(fMCov && fMCdet) {
    fMCov.findAll(function(n){ return n.name && n.name.indexOf('open-btn-')===0; })
      .forEach(function(b){ b.reactions = react(fMCdet); });
  }

  // MC Detail KR-Header rows → gefilterte Ansichten (KR1/KR2)
  if(fMCdet && fMCdetKR1) {
    var kr0hdr = fMCdet.findOne(function(n){ return n.name==='kr-hdr-bg-0'; });
    if(kr0hdr) kr0hdr.reactions = react(fMCdetKR1);
  }
  if(fMCdet && fMCdetKR2) {
    var kr1hdr = fMCdet.findOne(function(n){ return n.name==='kr-hdr-bg-1'; });
    if(kr1hdr) kr1hdr.reactions = react(fMCdetKR2);
  }

  // Filtered views: ALLE → back to MC Detail
  if(fMCdetKR1 && fMCdet) {
    var alle1 = fMCdetKR1.findOne(function(n){ return n.name==='chip-alle-back'; });
    if(alle1) alle1.reactions = react(fMCdet);
  }
  if(fMCdetKR2 && fMCdet) {
    var alle2 = fMCdetKR2.findOne(function(n){ return n.name==='chip-alle-back'; });
    if(alle2) alle2.reactions = react(fMCdet);
  }

  // Cross-filter: KR1 view → KR2 and vice versa
  if(fMCdetKR1 && fMCdetKR2) {
    var kr2inKR1 = fMCdetKR1.findOne(function(n){ return n.name==='chip-kr2-filter'; });
    if(kr2inKR1) kr2inKR1.reactions = react(fMCdetKR2);
  }
  if(fMCdetKR2 && fMCdetKR1) {
    var kr1inKR2 = fMCdetKR2.findOne(function(n){ return n.name==='chip-kr1-filter'; });
    if(kr1inKR2) kr1inKR2.reactions = react(fMCdetKR1);
  }

  figma.currentPage = pgDash;
  figma.viewport.scrollAndZoomIntoView(pgDash.children);
  figma.closePlugin('Flow OS v6 — Akkordeon + KR-Filter geladen. 8 Seiten.');
}

main().catch(function(e){ figma.closePlugin('Fehler: ' + e.message); });
