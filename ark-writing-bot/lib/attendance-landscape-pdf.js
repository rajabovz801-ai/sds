// Portable, printable black/white A4 *landscape* report for Telegram admins.
// Fixed-size pages: no missing rows, no clipped students, headers on every page.
import PDFDocument from 'pdfkit';
import {displayDate,localClock,duration} from '../../lib/attendance-report-core.mjs';
import {paginateAttendanceReport} from '../../lib/attendance-landscape.mjs';

const cy={А:'A',а:'a',Б:'B',б:'b',В:'V',в:'v',Г:'G',г:'g',Д:'D',д:'d',
Е:'E',е:'e',Ё:'Yo',ё:'yo',Ж:'J',ж:'j',З:'Z',з:'z',И:'I',и:'i',Й:'Y',й:'y',
К:'K',к:'k',Л:'L',л:'l',М:'M',м:'m',Н:'N',н:'n',О:'O',о:'o',П:'P',п:'p',
Р:'R',р:'r',С:'S',с:'s',Т:'T',т:'t',У:'U',у:'u',Ф:'F',ф:'f',Х:'X',х:'x',
Ц:'Ts',ц:'ts',Ч:'Ch',ч:'ch',Ш:'Sh',ш:'sh',Щ:'Sh',щ:'sh',Э:'E',э:'e',
Ю:'Yu',ю:'yu',Я:'Ya',я:'ya',Ў:"O'",ў:"o'",Ғ:"G'",ғ:"g'",Қ:'Q',қ:'q',Ҳ:'H',ҳ:'h'};
const ascii=value=>[...String(value??'')].map(ch=>cy[ch]??ch).join('')
  .replace(/[‘’ʻʼ]/g,"'").replace(/[–—]/g,'-').normalize('NFKD')
  .replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7E]/g,'');
const W=841.89,LEFT=32,RIGHT=W-32,CONTENT=RIGHT-LEFT;
function centerText(doc,value,x,y,w,{size=9,bold=false,align='left',color='#111111'}={}){
  doc.font(bold?'Helvetica-Bold':'Helvetica').fontSize(size).fillColor(color)
    .text(ascii(value),x,y,{width:w,align,ellipsis:true,lineBreak:false,height:size+4});
}
function drawHeader(doc,page,report){
  const g=page.group;
  doc.rect(LEFT,24,CONTENT,68).fill('#171717');
  doc.rect(LEFT,24,7,68).fill('#777777');
  centerText(doc,'ARK EDUCATION CENTRE',LEFT+18,33,CONTENT-36,{size:10,bold:true,color:'#FFFFFF'});
  centerText(doc,g.name+(page.part>1?'  /  DAVOMI '+page.part:''),
    LEFT+18,48,CONTENT-210,{size:20,bold:true,color:'#FFFFFF'});
  centerText(doc,'SANA  '+displayDate(report.date),RIGHT-185,57,169,
    {size:11,bold:true,color:'#FFFFFF',align:'right'});
  const t=[['JAMI',g.total],['KELDI',g.present],['KELMADI',g.absent],
    ['KECHIKDI',g.late],['DAVOMAT',g.percent+'%']];
  const gap=7,tileWidth=(CONTENT-gap*4)/5;
  t.forEach(([label,num],i)=>{
    const x=LEFT+i*(tileWidth+gap);
    doc.roundedRect(x,100,tileWidth,43,4).fill('#F4F4F4');
    doc.roundedRect(x,100,tileWidth,43,4).lineWidth(.5).stroke('#C6C6C6');
    centerText(doc,label,x+10,106,tileWidth-20,{size:8,bold:true,color:'#505050'});
    centerText(doc,num,x+10,119,tileWidth-20,{size:17,bold:true});
  });
  centerText(doc,'GURUH '+String(page.groupIndex).padStart(2,'0')+'  |  '+g.teacher+
    '  |  O‘QUVCHILAR '+String(page.rows.length? page.rowOffset+1:0)+' - '+
    String(page.rowOffset+page.rows.length)+' / '+g.rows.length,LEFT,148,CONTENT,
    {size:9,color:'#444444'});
  const headerY=167;
  doc.rect(LEFT,headerY,CONTENT,23).fill('#EAEAEA');
  const columns=[['#',LEFT+8,27],['O‘QUVCHI',LEFT+43,324],['KELDI',LEFT+376,67],
    ['KETDI',LEFT+449,67],['DAVOMIYLIK',LEFT+531,106],['HOLAT',LEFT+660,116]];
  columns.forEach(([label,x,w])=>centerText(doc,label,x,headerY+7,w,{size:8.5,bold:true,color:'#333333'}));
  return columns;
}
function drawRow(doc,row,index,y,columns){
  if(index%2===0)doc.rect(LEFT,y,CONTENT,13.9).fill('#F8F8F8');
  const status=row.absent?'KELMADI':row.pending?'KUTILMOQDA':
    row.late?'KECHIKDI':row.out?'KETDI':'KELDI';
  const items=[String(index).padStart(2,'0'),row.name,localClock(row.in),
    localClock(row.out),duration(row.in,row.out),status+(row.auto?' (AUTO)':'')];
  columns.forEach(([_,x,w],i)=>centerText(doc,items[i],x,y+2.7,w,
    {size:i===1?8.7:8.4,bold:i===1||i===5,color:i===0?'#777777':'#111111'}));
  doc.moveTo(LEFT,y+13.9).lineTo(RIGHT,y+13.9).lineWidth(.25).stroke('#D7D7D7');
}
export async function renderAttendancePDF(report){
  const doc=new PDFDocument({size:'A4',layout:'landscape',bufferPages:true,
    margins:{top:0,bottom:0,left:0,right:0},
    info:{Title:'ARK Attendance · '+report.date,Author:'ARK Education Centre'}});
  const chunks=[],done=new Promise((resolve,reject)=>{
    doc.on('data',c=>chunks.push(Buffer.from(c)));
    doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
  });
  const pages=paginateAttendanceReport(report,{firstPageRows:27,continuationRows:27});
  for(const [pIndex,page] of pages.entries()){
    if(pIndex)doc.addPage();
    const columns=drawHeader(doc,page,report);
    for(const [index,row] of page.rows.entries())drawRow(doc,row,page.rowOffset+index+1,190+index*13.9,columns);
  }
  const range=doc.bufferedPageRange();
  for(let i=range.start;i<range.start+range.count;i++){
    doc.switchToPage(i);
    doc.moveTo(LEFT,571).lineTo(RIGHT,571).lineWidth(.5).stroke('#444444');
    centerText(doc,'ARK EDUCATION CENTRE   /   SMART ATTENDANCE',LEFT,578,650,
      {size:8,bold:true,color:'#666666'});
    centerText(doc,'SAHIFA '+(i+1)+' / '+range.count,RIGHT-125,578,125,
      {size:8,bold:true,color:'#333333',align:'right'});
  }
  doc.end();return done;
}
