// ARK Royal Attendance standalone HTML; no external fonts, scripts, network or file assets.
import {htmlEscape,displayDate,localClock,duration} from './attendance-report-core.mjs';
import {LANDSCAPE_CSS} from './attendance-landscape-css.mjs';

/** Make page breaks deterministic before HTML rendering; never crop off a student's row. */
export function paginateAttendanceReport(report,{firstPageRows=27,continuationRows=29}={}){
  if(!Number.isInteger(firstPageRows)||firstPageRows<1||!Number.isInteger(continuationRows)||continuationRows<1)
    throw new Error('Invalid page capacity');
  const pages=[];
  for(const [groupIndex,group] of report.groups.entries()){
    const groupPages=[],rows=group.rows;
    let offset=0;
    do {
      const capacity=groupPages.length===0?firstPageRows:continuationRows;
      const selected=rows.slice(offset,offset+capacity);
      groupPages.push({group,groupIndex:groupIndex+1,part:groupPages.length+1,
        rows:selected,rowOffset:offset});
      offset+=selected.length;
    }while(offset<rows.length);
    for(const page of groupPages)pages.push({...page,groupPages:groupPages.length});
  }
  return pages.map((p,index)=>({...p,pageNo:index+1,pageCount:pages.length}));
}
function rowMarkup(row,index){
  const state=row.absent?'absent':row.pending?'pending':row.late?'late':'present';
  return '<tr><td class="row-num">'+String(index).padStart(2,'0')+'</td>'+
    '<td class="student"><span class="student-name" title="'+htmlEscape(row.name)+'">'+htmlEscape(row.name)+'</span>'+
    (row.auto?'<span class="auto-dot" title="Dars yakunida avtomatik ketdi">AUTO</span>':'')+'</td>'+
    '<td class="time">'+localClock(row.in)+'</td><td class="time">'+localClock(row.out)+'</td>'+
    '<td class="time">'+duration(row.in,row.out)+'</td>'+
    '<td><span class="state state-'+state+'"><span class="state-dot"></span>'+htmlEscape(row.status)+'</span></td></tr>';
}
function badge(cls,glyph,value,label){
  return '<div class="kpi '+cls+'"><i aria-hidden="true">'+glyph+'</i><div><b>'+value+'</b><span>'+label+'</span></div></div>';
}
export function renderAttendanceHTML(report){
  const pages=paginateAttendanceReport(report),totals=report.totals;
  const mark='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3.1 6.6 7.3 1-5.3 5.1 1.3 7.2L12 18.5 5.6 22l1.3-7.3L1.6 9.6l7.3-1z"/></svg>';
  const sheets=pages.map(p=>{
    const g=p.group,title=g.name+(p.part>1?' · davomi':'');
    const indexText=String(p.groupIndex).padStart(2,'0');
    return '<div class="sheet-frame" id="sheet-'+p.pageNo+'"><section class="sheet'+(p.part>1?' continuation':'')+'" aria-label="'+htmlEscape(title)+' — '+p.pageNo+'/'+p.pageCount+'">'+
      '<div class="accent-line"></div><header class="masthead"><div class="identity"><span class="mark">'+mark+'</span>'+
      '<strong>ARK EDUCATION CENTRE</strong></div>'+
      '<span class="document-id">ATTENDANCE / '+htmlEscape(displayDate(report.date))+' &nbsp; • &nbsp; '+
      String(p.pageNo).padStart(2,'0')+'/'+String(p.pageCount).padStart(2,'0')+'</span></header>'+
      '<div class="feature"><div class="feature-content"><div class="overline">GURUH '+indexText+
      (p.part>1?' &nbsp; / &nbsp; DAVOMI '+p.part+' / '+p.groupPages:' &nbsp; / &nbsp; KUNLIK DAVOMAT')+'</div>'+
      '<h1 class="group-name" title="'+htmlEscape(g.name)+'">'+htmlEscape(g.name)+'</h1>'+
      '<div class="teacher">'+htmlEscape(g.teacher||'ARK Education Centre')+' &nbsp; · &nbsp; '+
      htmlEscape(displayDate(report.date))+'</div></div>'+
      '<div class="attendance-indicator"><div class="ring" style="--pct:'+g.percent+
      '%"><div class="ring-inner"><b>'+g.percent+'%</b><small>DAVOMAT</small></div></div></div></div>'+
      '<div class="kpi-strip">'+badge('','≡',g.total,'Jami')+badge('green','✓',g.present,'Keldi')+
      badge('red','×',g.absent,'Kelmadi')+badge('amber','◷',g.late,'Kechikdi')+
      badge('','↗',g.auto,'Avto ketdi')+'</div>'+
      '<div class="table-headline"><strong>O‘QUVCHILAR DAVOMATI</strong><span>'+
      String(p.rows.length?p.rowOffset+1:0).padStart(2,'0')+'–'+String(p.rowOffset+p.rows.length).padStart(2,'0')+
      ' / '+String(g.rows.length).padStart(2,'0')+' &nbsp; · &nbsp; TOSHKENT VAQTI</span></div>'+
      '<div class="table-wrap">'+(p.rows.length?
        '<table aria-label="'+htmlEscape(g.name)+' davomat jadvali"><colgroup><col class="num">'+
        '<col class="student-col"><col class="time-col"><col class="time-col">'+
        '<col class="duration-col"><col class="status-col"></colgroup>'+
        '<thead><tr><th>№</th><th>O‘quvchi</th><th>Kelish</th><th>Ketish</th>'+
        '<th>Davomiylik</th><th>Holat</th></tr></thead><tbody>'+
        p.rows.map((r,i)=>rowMarkup(r,p.rowOffset+i+1)).join('')+'</tbody></table>':
        '<div class="empty">Ushbu guruh uchun davomat yozuvlari mavjud emas.</div>')+'</div>'+
      '<footer class="sheet-footer"><span><b>ARK / ROYAL ATTENDANCE</b> &nbsp; • &nbsp; '+
      htmlEscape(displayDate(report.date))+' &nbsp; • &nbsp; '+report.groups.length+
      ' guruh · '+totals.present+'/'+totals.total+' keldi</span>'+
      '<span>MAXFIY · ADMIN HISOBOTI</span><span class="page-no">'+
      String(p.pageNo).padStart(2,'0')+' / '+String(p.pageCount).padStart(2,'0')+
      '</span></footer></section></div>';
  }).join('');
  const pager=pages.slice(0,30).map(p=>'<a href="#sheet-'+p.pageNo+
    '" aria-label="'+p.pageNo+'-sahifa">'+p.pageNo+'</a>').join('');
  const empty=!pages.length?'<div class="empty">Bu sanada darslar mavjud emas.</div>':'';
  const warning=report.unfinished.length?
    '<div class="note">Yakunlanmagan guruhlar: '+htmlEscape(report.unfinished.join(', '))+'</div>':'';
  return '<!doctype html><html lang="uz"><head><meta charset="utf-8">'+
    '<meta name="viewport" content="width=device-width,initial-scale=1">'+
    '<meta name="color-scheme" content="light"><title>ARK Royal Attendance · '+
    htmlEscape(displayDate(report.date))+'</title><style>'+LANDSCAPE_CSS+
    '</style></head><body><nav class="toolbar" aria-label="Hisobot amallari">'+
    '<div class="toolbar-brand">ARK / ROYAL ATTENDANCE<span>'+
    htmlEscape(displayDate(report.date))+' · '+report.groups.length+' guruh · '+
    totals.total+' davomat</span></div><div class="toolbar-actions">'+
    '<div class="pager" aria-label="Sahifalar">'+pager+'</div>'+
    '<button class="btn btn-outline" onclick="window.print()" type="button">'+
    'A4 LANDSCAPE · PDF / PRINT</button></div></nav><main class="workspace">'+
    warning+'<p class="note">Har bir sahifa — A4 landscape. Telefonda ko‘rish uchun yon tomonga suring.</p>'+
    sheets+empty+'</main></body></html>';
}
