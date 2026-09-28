// No SVG <text> elements: all letters are converted to Noto Sans vector paths.
import sharp from 'sharp';
import * as fontkit from 'fontkit';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let fonts;
function getFonts(){
  if(!fonts)fonts={
    regular:fontkit.openSync(require.resolve('@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff2')),
    bold:fontkit.openSync(require.resolve('@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff2'))
  };
  return fonts;
}
const escapeXML=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
  .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const cy={
  А:'A',а:'a',Б:'B',б:'b',В:'V',в:'v',Г:'G',г:'g',Д:'D',д:'d',
  Е:'E',е:'e',Ё:'Yo',ё:'yo',Ж:'J',ж:'j',З:'Z',з:'z',И:'I',и:'i',
  Й:'Y',й:'y',К:'K',к:'k',Л:'L',л:'l',М:'M',м:'m',Н:'N',н:'n',
  О:'O',о:'o',П:'P',п:'p',Р:'R',р:'r',С:'S',с:'s',Т:'T',т:'t',
  У:'U',у:'u',Ф:'F',ф:'f',Х:'X',х:'x',Ц:'Ts',ц:'ts',Ч:'Ch',ч:'ch',
  Ш:'Sh',ш:'sh',Щ:'Sh',щ:'sh',Э:'E',э:'e',Ю:'Yu',ю:'yu',Я:'Ya',я:'ya',
  Ъ:'',ъ:'',Ь:'',ь:'',Ў:"O'",ў:"o'",Ғ:"G'",ғ:"g'",Қ:'Q',қ:'q',Ҳ:'H',ҳ:'h'
};
export function safeCardLabel(value,max=60){
  return [...String(value??'')].map(x=>cy[x]??x).join('')
    .replace(/[‘’ʻʼ\x60]/g,"'").normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^\x20-\x7E]/g,'').trim().slice(0,max);
}
function vectorText(label,x,baseline,size,color,{bold=false,maxWidth=0,align='left',tracking=0}={}){
  const font=bold?getFonts().bold:getFonts().regular,run=font.layout(safeCardLabel(label,90));
  let scale=size/font.unitsPerEm;
  const width=run.positions.reduce((n,p)=>n+p.xAdvance*scale+tracking,0)-tracking;
  if(maxWidth>0&&width>maxWidth)scale*=maxWidth/width;
  const finalWidth=run.positions.reduce((n,p)=>n+p.xAdvance*scale+tracking,0)-tracking;
  let left=x-(align==='center'?finalWidth/2:align==='right'?finalWidth:0);
  const paths=[];
  for(let i=0;i<run.glyphs.length;i++){
    const glyph=run.glyphs[i],pos=run.positions[i],d=glyph.path?.toSVG();
    if(d)paths.push('<path d="'+escapeXML(d)+'" transform="translate('+
      (left+pos.xOffset*scale).toFixed(3)+' '+(baseline-pos.yOffset*scale).toFixed(3)+
      ') scale('+scale.toFixed(6)+' '+(-scale).toFixed(6)+')"/>');
    left+=pos.xAdvance*scale+tracking;
  }
  return '<g fill="'+color+'">'+paths.join('')+'</g>';
}
function statTile(x,number,label,color,bg){
  return '<rect x="'+x+'" y="327" width="358" height="161" rx="25" fill="'+bg+'"/>'+
    '<circle cx="'+(x+43)+'" cy="370" r="13" fill="'+color+'" opacity=".16"/>'+
    '<circle cx="'+(x+43)+'" cy="370" r="5.5" fill="'+color+'"/>'+
    vectorText(label,x+66,378,22,color,{bold:true,maxWidth:255,tracking:.5})+
    vectorText(number,x+32,456,68,color,{bold:true,maxWidth:295});
}
function groupTile(group,x,y){
  const ratio=group.total?group.present/group.total:0,width=548;
  return '<rect x="'+x+'" y="'+y+'" width="'+width+'" height="70" rx="16" fill="#fff" stroke="#dfe7ed" stroke-width="1.2"/>'+
    vectorText(group.name,x+19,y+29,24,'#162e46',{bold:true,maxWidth:340})+
    vectorText(group.present+'/'+group.total,x+width-20,y+28,23,'#0b7959',
      {bold:true,align:'right',maxWidth:110})+
    '<rect x="'+(x+19)+'" y="'+(y+48)+'" width="'+(width-38)+'" height="7" rx="3.5" fill="#e7eef3"/>'+
    '<rect x="'+(x+19)+'" y="'+(y+48)+'" width="'+Math.max(0,(width-38)*ratio)+'" height="7" rx="3.5" fill="#209f77"/>';
}
export function buildAttendancePreviewSVG(report){
  const t=report.totals,svg=[],height=report.groups.length<=2?740:820;
  svg.push('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="'+height+'" viewBox="0 0 1200 '+height+'">');
  svg.push('<defs><linearGradient id="navy" x1="0" x2="1" y1="0" y2="1">'+
    '<stop stop-color="#10263f"/><stop offset=".66" stop-color="#1b415d"/>'+
    '<stop offset="1" stop-color="#276475"/></linearGradient></defs>');
  svg.push('<rect width="1200" height="'+height+'" rx="36" fill="#f3f6f9"/>');
  svg.push('<rect x="22" y="22" width="1156" height="285" rx="29" fill="url(#navy)"/>');
  svg.push('<rect x="58" y="55" width="5" height="32" rx="2.5" fill="#ecc788"/>');
  svg.push('<circle cx="1101" cy="143" r="170" fill="none" stroke="#ffffff" stroke-opacity=".09" stroke-width="2"/>');
  svg.push('<circle cx="1101" cy="143" r="126" fill="none" stroke="#ffffff" stroke-opacity=".08" stroke-width="2"/>');
  svg.push(vectorText('ARK EDUCATION CENTRE',80,81,25,'#f0ce95',{bold:true,tracking:2,maxWidth:850}));
  svg.push(vectorText('DAILY ATTENDANCE',59,191,62,'#ffffff',{bold:true,maxWidth:1010}));
  svg.push(vectorText(report.date+'   /   '+report.groups.length+' GURUH',62,253,23,'#bad0dd',{maxWidth:950}));
  svg.push(statTile(37,String(t.present),'KELDI','#0b7654','#e4f6ef'));
  svg.push(statTile(421,String(t.absent),'KELMADI','#b04b55','#ffedf0'));
  svg.push(statTile(805,report.percent+'%','DAVOMAT','#a36c18','#fff4df'));
  svg.push(vectorText('GURUHLAR KESIMIDA',45,533,22,'#24435a',{bold:true,tracking:1.4,maxWidth:600}));
  for(const [i,g] of report.groups.slice(0,4).entries())
    svg.push(groupTile(g,37+(i%2)*585,555+Math.floor(i/2)*83));
  if(report.groups.length>4)svg.push(vectorText('+'+(report.groups.length-4)+' GURUH HTML HISOBOTDA',
    45,749,17,'#627a8b',{bold:true,maxWidth:800}));
  svg.push('<path d="M45 '+(height-42)+'H1155" stroke="#d9e3eb" stroke-width="2"/>');
  svg.push(vectorText('ARK / ROYAL ATTENDANCE',45,height-16,16,'#60788b',
    {bold:true,tracking:.8,maxWidth:740}));
  svg.push(vectorText('TOSHKENT  |  '+report.date,1153,height-16,16,'#60788b',
    {bold:true,align:'right',maxWidth:360}));
  svg.push('</svg>');
  return svg.join('');
}
export async function makeAttendancePreview(report){
  return sharp(Buffer.from(buildAttendancePreviewSVG(report))).png({compressionLevel:8}).toBuffer();
}
