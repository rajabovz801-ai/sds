// Pure attendance presentation helpers. No browser globals, bot secrets, or database access.
const TZ = 'Asia/Tashkent';
export const OWNER_ID = '5170628705';
export const ADMIN_IDS = Object.freeze([OWNER_ID, '1060535083']);
export const isAttendanceAdmin = (id) => ADMIN_IDS.includes(String(id || ''));
export function todayInTashkent(now = new Date()) {
  const fields = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).map(x => [x.type, x.value]));
  return fields.year + '-' + fields.month + '-' + fields.day;
}
export const validDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') &&
  !Number.isNaN(Date.parse(s + 'T00:00:00Z')) &&
  new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
export const validMonth = s => /^\d{4}-(0[1-9]|1[0-2])$/.test(s || '');
export function moveMonth(month, offset) {
  if (!validMonth(month)) return todayInTashkent().slice(0, 7);
  const d = new Date(month + '-01T12:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + offset);
  return d.toISOString().slice(0, 7);
}
export const displayDate = day => validDay(day) ? day.slice(8) + '.' + day.slice(5,7) + '.' + day.slice(0,4) : '—';
export const htmlEscape = x => String(x ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export function localClock(date) {
  if (!date) return '—';
  const n = new Date(date);
  if (!Number.isFinite(n.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {timeZone:TZ,hour:'2-digit',minute:'2-digit',hour12:false}).format(n);
}
export function duration(inTime,outTime) {
  if (!inTime || !outTime) return '—';
  const m = Math.max(0, Math.floor((Date.parse(outTime) - Date.parse(inTime)) / 60000));
  return Math.floor(m / 60) + 's ' + (m % 60) + 'd';
}
export function summarizeAttendance(sessions, groups, students, attendance, automaticEvents=[]) {
  const groupMap = new Map(groups.map(g => [g.id,g]));
  const studentMap = new Map(students.map(s => [s.id,s.name]));
  const autoSet = new Set(automaticEvents.map(e => e.session_id + ':' + e.student_id));
  const organized = new Map();
  for (const session of sessions) {
    const group = groupMap.get(session.group_id);
    if (!organized.has(session.group_id)) organized.set(session.group_id, {
      id:session.group_id, name:group?.name || 'Arxivdagi guruh',
      teacher:group?.teacher || '', sessions:[], rows:[],
      present:0,absent:0,pending:0,late:0,auto:0
    });
    organized.get(session.group_id).sessions.push(session);
  }
  for (const item of attendance) {
    const session = sessions.find(s => s.id === item.session_id);
    if (!session) continue;
    const g = organized.get(session.group_id);
    const grace = Number(groupMap.get(session.group_id)?.late_grace_min ?? 5);
    const checkedIn = Boolean(item.checked_in);
    const checkedOut = Boolean(item.checked_out);
    const late = checkedIn && Number(item.late_min || 0) > grace;
    const auto = autoSet.has(item.session_id + ':' + item.student_id);
    const status = !checkedIn ? (session.status === 'closed' ? 'Kelmadi' : 'Kutilmoqda') :
      late ? (checkedOut ? 'Kechikib ketdi' : 'Kechikdi') : (checkedOut ? 'Ketdi' : 'Keldi');
    g.rows.push({name:studentMap.get(item.student_id)||'O‘quvchi',in:item.checked_in,
      out:item.checked_out,status,late,auto,absent:!checkedIn&&session.status==='closed',
      pending:!checkedIn&&session.status!=='closed',present:checkedIn,sessionId:session.id});
    g.present += Number(checkedIn);
    g.absent += Number(!checkedIn && session.status==='closed');
    g.pending += Number(!checkedIn && session.status!=='closed');
    g.late += Number(late);
    g.auto += Number(auto);
  }
  const ordered = [...organized.values()].sort((a,b)=>a.name.localeCompare(b.name,'uz'));
  for (const g of ordered) {
    g.rows.sort((a,b)=>a.name.localeCompare(b.name,'uz'));
    g.total = g.rows.length;
    g.percent = g.total ? Math.round(g.present / g.total * 100) : 0;
  }
  const totals = ordered.reduce((n,g)=>({total:n.total+g.total,present:n.present+g.present,
    absent:n.absent+g.absent,pending:n.pending+g.pending,late:n.late+g.late,
    auto:n.auto+g.auto}),{total:0,present:0,absent:0,pending:0,late:0,auto:0});
  return {groups:ordered, totals, percent:totals.total?Math.round(totals.present / totals.total * 100):0,
    unfinished:ordered.filter(g=>g.sessions.some(s=>s.status!=='closed')).map(g=>g.name)};
}
export function monthKeyboard(month, today=todayInTashkent()) {
  if (!validMonth(month)) month = today.slice(0,7);
  const start=new Date(month+'-01T12:00:00Z');
  const last=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0)).getUTCDate();
  const weekDay=(start.getUTCDay()+6)%7;
  const cells=[...Array(weekDay).fill(null), ...Array.from({length:last},(_,i)=>i+1)];
  while(cells.length%7)cells.push(null);
  const rows=[[{text:'‹',callback_data:'att:month:'+moveMonth(month,-1)},
    {text:displayDate(month+'-01').slice(3),callback_data:'att:noop'},
    {text:'›',callback_data:'att:month:'+moveMonth(month,1)}],
    ['Du','Se','Ch','Pa','Ju','Sh','Ya'].map(x=>({text:x,callback_data:'att:noop'}))];
  for(let i=0;i<cells.length;i+=7) rows.push(cells.slice(i,i+7).map(n=>{
    const day=n?month+'-'+String(n).padStart(2,'0'):'';
    return {text:n?String(n)+(day===today?' •':''):'·',
      callback_data:day && day<=today?'att:day:'+day:'att:noop'};
  }));
  rows.push([{text:'🏠 Admin menyusi',callback_data:'att:home'}]);
  return {inline_keyboard:rows};
}
function rowMarkup(row,i) {
  const state = row.absent ? 'absent' : row.pending ? 'pending' : row.late ? 'late' : 'present';
  return '<tr><td class="number">'+(i+1)+'</td><td><strong>'+htmlEscape(row.name)+'</strong>'+
    (row.auto?'<small class="auto">● Avtomatik ketdi</small>':'')+'</td><td class="mono">'+localClock(row.in)+
    '</td><td class="mono">'+localClock(row.out)+'</td><td class="mono">'+duration(row.in,row.out)+
    '</td><td><span class="status '+state+'">'+htmlEscape(row.status)+'</span></td></tr>';
}
export function renderAttendanceHTML(report) {
  const t=report.totals; const groups=report.groups.map((g,index)=>
    '<section class="group"><div class="group-head"><div><div class="group-kicker">GURUH '+String(index+1).padStart(2,'0')+
    '</div><h2>'+htmlEscape(g.name)+'</h2><p>'+htmlEscape(g.teacher||'ARK Education Centre')+
    '</p></div><div class="percent">'+g.percent+'<small>%</small></div></div>'+
    '<div class="bar"><div style="width:'+g.percent+'%"></div></div>'+
    '<div class="group-stats"><span><b>'+g.total+'</b> Jami</span><span class="good"><b>'+g.present+'</b> Keldi</span>'+
    '<span class="bad"><b>'+g.absent+'</b> Kelmadi</span><span class="warn"><b>'+g.late+'</b> Kechikdi</span></div>'+
    '<div class="table-wrap"><table><thead><tr><th>№</th><th>O‘quvchi</th><th>Kelish</th><th>Ketish</th>'+
    '<th>Davomiylik</th><th>Holat</th></tr></thead><tbody>'+g.rows.map(rowMarkup).join('')+
    '</tbody></table></div></section>').join('');
  return '<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'+
    '<meta name="color-scheme" content="light"><title>ARK Davomat · '+htmlEscape(displayDate(report.date))+'</title>'+
    '<style>*{box-sizing:border-box}body{margin:0;background:#edf2f7;color:#17283e;font:15px/1.5 Inter,system-ui,-apple-system,Segoe UI,Arial,sans-serif}'+
    '.wrap{max-width:1100px;margin:auto;padding:28px 18px 60px}.hero{background:linear-gradient(120deg,#14263d,#244e71);color:#fff;border-radius:24px;padding:36px 38px;box-shadow:0 14px 34px #223e5b20}'+
    '.brand{color:#ffc773;font-size:13px;letter-spacing:3px;font-weight:800}.hero h1{font-size:38px;line-height:1.15;letter-spacing:-1.4px;margin:15px 0 8px}.hero p{color:#d4e1ee;margin:0}'+
    '.hero-line{width:66px;height:4px;border-radius:8px;background:#ffc773;margin:21px 0}.metric-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin:20px 0 32px}'+
    '.metric{background:white;border:1px solid #e1e8f0;border-radius:17px;padding:18px;box-shadow:0 4px 17px #12304c08}.metric strong{font-size:31px;display:block;line-height:1.2}.metric span{font-size:12px;color:#65768c}.metric.green strong{color:#15966a}.metric.red strong{color:#d74d55}.metric.gold strong{color:#c07b12}'+
    '.group{background:white;border:1px solid #e0e7ee;margin:20px 0;border-radius:21px;overflow:hidden;box-shadow:0 8px 24px #263f5210}.group-head{display:flex;justify-content:space-between;align-items:center;padding:24px 26px 18px}'+
    '.group-kicker{font-size:11px;font-weight:800;letter-spacing:2px;color:#c18329}h2{margin:4px 0;font-size:27px}p{margin:0;color:#788797}.percent{font-size:35px;font-weight:800;color:#188a65}.percent small{font-size:17px}'+
    '.bar{height:7px;background:#eaf0f4;margin:0 26px;border-radius:9px;overflow:hidden}.bar div{height:100%;background:linear-gradient(90deg,#1fbc83,#107b62);border-radius:9px}.group-stats{display:flex;gap:22px;flex-wrap:wrap;padding:17px 26px 23px;color:#56677c;font-size:13px}.group-stats b{font-size:16px;color:#1a2d41}.group-stats .good b{color:#168962}.group-stats .bad b{color:#d45556}.group-stats .warn b{color:#b17a26}'+
    '.table-wrap{overflow-x:auto;border-top:1px solid #e4ebf0}table{border-collapse:collapse;width:100%;min-width:650px;text-align:left}th{font-size:11px;text-transform:uppercase;letter-spacing:.8px;background:#f4f7f9;color:#697b8e;font-weight:750}td,th{padding:12px 18px;border-bottom:1px solid #e8eef3}td{font-size:13px}tr:last-child td{border-bottom:none}.number{color:#9aabc0}.mono{font-variant-numeric:tabular-nums;white-space:nowrap}.status{display:inline-block;border-radius:24px;font-size:11px;font-weight:800;white-space:nowrap;padding:4px 10px;background:#e7f7ef;color:#138558}.status.absent{background:#ffeff0;color:#c9454f}.status.late{background:#fff4da;color:#936b16}.status.pending{background:#f0f2f4;color:#56677c}.auto{display:block;font-size:10px;color:#587b9a}'+
    '.footer{text-align:center;margin-top:36px;color:#7a8a9e;font-size:12px}'+
    '@media(max-width:720px){.wrap{padding:10px 10px 40px}.hero{padding:27px 23px;border-radius:17px}.hero h1{font-size:29px}.metric-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.metric{padding:14px}.metric strong{font-size:25px}.group-head{padding:20px 16px 13px}h2{font-size:23px}.bar{margin:0 16px}.group-stats{padding:15px;gap:13px}.group{border-radius:17px}}'+
    '@media print{body{background:white}.wrap{padding:0}.hero{box-shadow:none;print-color-adjust:exact;-webkit-print-color-adjust:exact}.metric-grid{grid-template-columns:repeat(5,1fr)}.group{box-shadow:none;break-inside:avoid} .table-wrap{overflow:visible}table{min-width:0}tr{break-inside:avoid}}'+
    '</style></head><body><main class="wrap"><header class="hero"><div class="brand">ARK EDUCATION CENTRE</div><div class="hero-line"></div>'+
    '<h1>Daily Attendance</h1><p>'+htmlEscape(displayDate(report.date))+' · Barcha guruhlar · Toshkent vaqti</p></header>'+
    '<section class="metric-grid"><div class="metric"><strong>'+report.groups.length+'</strong><span>Guruhlar</span></div>'+
    '<div class="metric"><strong>'+t.total+'</strong><span>Jami davomat</span></div><div class="metric green"><strong>'+t.present+'</strong><span>Kelganlar</span></div>'+
    '<div class="metric red"><strong>'+t.absent+'</strong><span>Kelmaganlar</span></div><div class="metric gold"><strong>'+report.percent+'%</strong><span>Davomat foizi</span></div></section>'+
    (report.unfinished.length?'<p style="padding:12px;background:#fff0d4;border-radius:12px">⚠️ Yakunlanmagan guruhlar: '+htmlEscape(report.unfinished.join(', '))+'</p>':'')+
    groups+'<footer class="footer">ARK EDUCATION CENTRE • Smart Attendance • '+htmlEscape(displayDate(report.date))+
    '<br>Hisobot faqat vakolatli administratorlar uchun tayyorlangan.</footer></main></body></html>';
}
export function compactSummary(report) {
  const t=report.totals;
  return ['🏛 <b>ARK EDUCATION CENTRE</b>','✨ <b>Kunlik davomat hisoboti</b>',
    '📅 '+displayDate(report.date),'',
    '👥 Guruhlar: <b>'+report.groups.length+'</b>',
    '🟢 Keldi: <b>'+t.present+'</b>  |  🔴 Kelmadi: <b>'+t.absent+'</b>',
    '🟡 Kechikdi: <b>'+t.late+'</b>  |  📊 Davomat: <b>'+report.percent+'%</b>',
    '',...report.groups.map(g=>'▫️ <b>'+htmlEscape(g.name)+'</b> — '+g.present+'/'+g.total+' ('+g.percent+'%)'),
    '','📎 Rangli HTML hisobot quyida.'].join('\n');
}