import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {paginateAttendanceReport,renderAttendanceHTML} from '../lib/attendance-landscape.mjs';
import {makeAttendancePreview,buildAttendancePreviewSVG,safeCardLabel} from '../ark-writing-bot/lib/attendance-sticker.js';
import {renderAttendancePDF} from '../ark-writing-bot/lib/attendance-landscape-pdf.js';

function reportWith(counts){
  const groups=counts.map((count,g)=>({
    id:'g'+g,name:g===0?'909':'IELTS '+g,teacher:'Rustam Usmonov',
    rows:Array.from({length:count},(_,i)=>({
      name:'Oquvchi '+g+'-'+String(i+1).padStart(2,'0'),
      in:'2026-09-26T08:00:00.000Z',out:'2026-09-26T09:30:00.000Z',
      status:'Ketdi',present:true,absent:false,late:false,pending:false,auto:i===0
    })),
    total:count,present:count,absent:0,late:0,pending:0,auto:1,percent:100
  }));
  const total=counts.reduce((a,b)=>a+b,0);
  return {date:'2026-09-26',groups,totals:{
    total,present:total,absent:0,late:0,pending:0,auto:groups.length
  },percent:100,unfinished:[]};
}
test('27 students in one A4 landscape sheet, everyone displayed',()=>{
  const report=reportWith([27]),pages=paginateAttendanceReport(report);
  assert.equal(pages.length,1);assert.equal(pages[0].rows.length,27);
  const html=renderAttendanceHTML(report);
  assert.match(html,/@page\{size:A4 landscape;margin:0\}/);
  assert.match(html,/width:297mm;height:210mm/);
  assert.equal((html.match(/class="sheet-frame"/g)||[]).length,1);
  assert.equal((html.match(/class="student-name"/g)||[]).length,27);
  assert.match(html,/Oquvchi 0-27/);
});
test('58 + 27 students are split without loss and each group has numbered pages',()=>{
  const report=reportWith([58,27]),pages=paginateAttendanceReport(report);
  assert.deepEqual(pages.map(p=>p.rows.length),[27,29,2,27]);
  assert.equal(pages[0].pageCount,4);
  assert.equal(pages[3].group.name,'IELTS 1');
  assert.equal(pages.flatMap(p=>p.rows).length,85);
  const html=renderAttendanceHTML(report);
  assert.equal((html.match(/class="student-name"/g)||[]).length,85);
  assert.equal((html.match(/class="sheet-frame"/g)||[]).length,4);
  assert.match(html,/DAVOMI 3 \/ 3/);
});
test('HTML uses escaped Uzbek names and no linked external resources',()=>{
  const r=reportWith([1]);
  r.groups[0].name='<script>alert(1)</script>';
  r.groups[0].rows[0].name='O‘quvchi & <img>';
  const h=renderAttendanceHTML(r);
  assert.ok(!h.includes('<script>alert(1)</script>'));
  assert.match(h,/&lt;script&gt;/);
  assert.match(h,/O‘quvchi &amp; &lt;img&gt;/);
  assert.ok(!/<link[^>]+href=/.test(h));
});
test('Telegram vector text contains actual paths (never missing font squares)',async()=>{
  const r=reportWith([27,5]);
  const svg=buildAttendancePreviewSVG(r);
  assert.ok(svg.match(/<path d="M/));
  assert.ok(!svg.includes('<text'));
  assert.equal(safeCardLabel('O‘quvchi Шаҳзода'),'O\'quvchi Shahzoda');
  const png=await makeAttendancePreview(r);
  const meta=await sharp(png).metadata();
  assert.equal(meta.width,1200);
  assert.equal(meta.height,740);
  assert.equal(meta.format,'png');
});
test('Teddy PDF is a complete A4 landscape PDF for a 27-row group',async()=>{
  const pdf=await renderAttendancePDF(reportWith([27]));
  assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
  assert.ok(pdf.length>2000);
  // A4 landscape has a wider MediaBox than its height.
  const body=pdf.toString('latin1');
  assert.match(body,/\/MediaBox\s*\[0 0 841(?:\.89)? 595(?:\.28)?\]/);
});
