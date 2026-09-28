// Teddy's isolated, private Telegram attendance administration flow.
// Existing student and business chats are untouched.
import {renderAttendancePDF} from './attendance-landscape-pdf.js';
import { telegram } from './telegram.js';
import { getServiceSupabase } from '../../lib/supabase/server';
import {
  ADMIN_IDS, OWNER_ID, isAttendanceAdmin, isAdminCommand, todayInTashkent, validDay, validMonth,
  moveMonth, displayDate, htmlEscape, localClock, duration, summarizeAttendance,
  monthKeyboard, compactSummary
} from '../../lib/attendance-report-core.mjs';
import {renderAttendanceHTML} from '../../lib/attendance-landscape.mjs';

const api = () => 'https://api.telegram.org/bot' + process.env.TELEGRAM_BOT_TOKEN;
const menuButtons = () => ({inline_keyboard:[
  [{text:'📊 Bugungi natijalar',callback_data:'att:today'}],
  [{text:'🗓 Oldingi sanalar',callback_data:'att:month:'+todayInTashkent().slice(0,7)}]
]});
const reportButtons = day => ({inline_keyboard:[
  [{text:'🎨 Rangli HTML',callback_data:'att:html:'+day},
   {text:'🖨 PDF hisobot',callback_data:'att:pdf:'+day}],
  [{text:'🗓 Boshqa sana',callback_data:'att:month:'+day.slice(0,7)}],
  [{text:'🏠 Admin menyusi',callback_data:'att:home'}]
]});

async function paged(queryFactory) {
  const all = [];
  const PAGE = 500;
  for(let i=0;i<20;i++) {
    const {data,error}=await queryFactory().range(i*PAGE,(i+1)*PAGE-1);
    if(error)throw new Error('Davomat bazasi: '+error.message);
    all.push(...(data||[]));
    if(!data||data.length<PAGE)return all;
  }
  throw new Error('Hisobot uchun yozuvlar juda ko‘p. Sahifalash limitini tekshiring.');
}
const groupsOf = (values,size=70) => Array.from({length:Math.ceil(values.length/size)},(_,i)=>values.slice(i*size,(i+1)*size));
async function fetchAttendance(day) {
  if(!validDay(day)||day>todayInTashkent())throw new Error('Sana noto‘g‘ri');
  const db=getServiceSupabase();
  const sessions=await paged(()=>db.from('sa_sessions').select('id,group_id,lesson_date,planned_start,planned_end,status,closed_at')
    .eq('lesson_date',day).order('planned_start',{ascending:true}));
  if(!sessions.length)return {date:day,...summarizeAttendance([],[],[],[])};
  const ids=sessions.map(s=>s.id);
  const groupIds=[...new Set(sessions.map(s=>s.group_id))];
  const groupPages=await Promise.all(groupsOf(groupIds).map(g=>paged(()=>db.from('sa_groups')
    .select('id,name,teacher,late_grace_min').in('id',g))));
  const attendancePages=await Promise.all(groupsOf(ids).map(g=>paged(()=>db.from('sa_attendance')
    .select('session_id,student_id,checked_in,checked_out,late_min,status').in('session_id',g))));
  const eventsPages=await Promise.all(groupsOf(ids).map(g=>paged(()=>db.from('sa_events')
    .select('session_id,student_id').in('session_id',g).eq('action','automatic_checkout'))));
  const attendance=attendancePages.flat();
  const studentIds=[...new Set(attendance.map(a=>a.student_id))];
  const studentPages=await Promise.all(groupsOf(studentIds).map(g=>paged(()=>db.from('sa_students').select('id,name').in('id',g))));
  return {date:day,...summarizeAttendance(sessions,groupPages.flat(),studentPages.flat(),attendance,eventsPages.flat())};
}
async function message(chatId,text,markup) {
  return telegram('sendMessage',{chat_id:chatId,text,parse_mode:'HTML',
    ...(markup?{reply_markup:markup}:{})});
}
function ascii(value) {
  const mapping={'‘':"'",'’':"'",'ʻ':"'",'ʼ':"'",'–':'-','—':'-','…':'...',
    'Ў':"O'",'ў':"o'",'Ғ':"G'",'ғ':"g'",'Қ':'Q','қ':'q','Ҳ':'H','ҳ':'h',
    'А':'A','а':'a','Б':'B','б':'b','В':'V','в':'v','Г':'G','г':'g','Д':'D','д':'d',
    'Е':'E','е':'e','Ё':'Yo','ё':'yo','Ж':'J','ж':'j','З':'Z','з':'z','И':'I','и':'i',
    'Й':'Y','й':'y','К':'K','к':'k','Л':'L','л':'l','М':'M','м':'m','Н':'N','н':'n',
    'О':'O','о':'o','П':'P','п':'p','Р':'R','р':'r','С':'S','с':'s','Т':'T','т':'t',
    'У':'U','у':'u','Ф':'F','ф':'f','Х':'X','х':'x','Ц':'Ts','ц':'ts','Ч':'Ch','ч':'ch',
    'Ш':'Sh','ш':'sh','Щ':'Sh','щ':'sh','Э':'E','э':'e','Ю':'Yu','ю':'yu','Я':'Ya','я':'ya',
    'Ь':'','ь':'','Ъ':'','ъ':''};
  return String(value??'').replace(/./gu,c=>mapping[c]??c).normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'').replace(/[^\x20-\x7e]/g,'?');
}
const attendancePDF=renderAttendancePDF;
async function sendFile(chatId,buffer,filename,type,caption,reply_markup) {
  const form=new FormData();
  form.set('chat_id',String(chatId));
  form.set('caption',caption);
  form.set('parse_mode','HTML');
  form.set('document',new Blob([buffer],{type}),filename);
  if(reply_markup)form.set('reply_markup',JSON.stringify(reply_markup));
  const response=await fetch(api()+'/sendDocument',{method:'POST',body:form});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.ok)throw new Error('Telegram fayl jo‘natmadi: '+(result.description||response.status));
  return result.result;
}
async function sendAttendancePreview(chatId,report) {
  const {makeAttendancePreview}=await import('./attendance-sticker.js');
  const png=await makeAttendancePreview(report);
  const form=new FormData();
  form.set('chat_id',String(chatId));
  form.set('photo',new Blob([png],{type:'image/png'}),'ARK_Davomat_'+report.date+'.png');
  form.set('caption','🏛 ARK EDUCATION CENTRE • '+displayDate(report.date));
  form.set('reply_markup',JSON.stringify(reportButtons(report.date)));
  const response=await fetch(api()+'/sendPhoto',{method:'POST',body:form});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.ok)throw new Error('Telegram preview: '+(result.description||response.status));
  return result.result;
}
async function sendMenu(chatId,role='admin') {
  const privileged=role==='super_admin'?'👑 SUPER ADMIN':'🛡 ADMIN';
  return message(chatId,['🏛 <b>ARK EDUCATION CENTRE</b>','',privileged,
    '✨ <b>Davomat boshqaruviga xush kelibsiz!</b>','',
    '📊 Bugungi yoki arxivdagi barcha guruhlarning natijalarini tanlang.',
    '🕕 Yakuniy kunlik hisobot Toshkent vaqti bilan 18:00 da.'].join('\n'),menuButtons());
}
async function sendCalendar(chatId,month) {
  const today=todayInTashkent();
  if(!validMonth(month)||month>today.slice(0,7))month=today.slice(0,7);
  return message(chatId,'🗓 <b>Hisobot sanasini tanlang</b>\n\n📚 Har bir kunda barcha guruhlarning natijalari olinadi.',
    monthKeyboard(month,today));
}
async function sendAttendance(chatId,day,{only='all'}={}) {
  const report=await fetchAttendance(day);
  if(!report.groups.length){
    await message(chatId,'📂 <b>'+displayDate(day)+'</b> sanasida darslar topilmadi.',{
      inline_keyboard:[[{text:'🗓 Boshqa sana',callback_data:'att:month:'+day.slice(0,7)}]]
    });return;
  }
  if(report.unfinished.length) {
    await message(chatId,'⏳ <b>Hisobot hali yakunlanmagan</b>\n\n'+displayDate(day)+
      '\n\nQuyidagi guruhlar hali yopilmagan:\n'+report.unfinished.map(x=>'• '+htmlEscape(x)).join('\n')+
      '\n\nTrackerda darslarni yakunlang, so‘ng natijalarni qayta oling.',{
        inline_keyboard:[[{text:'🔄 Qayta tekshirish',callback_data:'att:day:'+day}],
                         [{text:'🗓 Boshqa sana',callback_data:'att:month:'+day.slice(0,7)}]]
      });return;
  }
  if(only==='pdf'){
    await sendFile(chatId,await attendancePDF(report),'ARK_Davomat_'+day+'.pdf','application/pdf',
      '🖨 <b>ARK Davomat</b> · '+displayDate(day),reportButtons(day));return;
  }
  if(only==='all'){
    try{await sendAttendancePreview(chatId,report);}catch(e){
      console.warn('Preview image unavailable',e?.message||e);
      await message(chatId,compactSummary(report).slice(0,3800),reportButtons(day));
    }
  }
  const html=renderAttendanceHTML(report);
  await sendFile(chatId,Buffer.from(html,'utf8'),'ARK_Davomat_'+day+'.html','text/html',
    '🎨 <b>Rangli HTML hisobot</b> · '+displayDate(day)+'\n📚 '+report.groups.length+
    ' guruh · 🟢 '+report.totals.present+' keldi · 🔴 '+report.totals.absent+' kelmadi',reportButtons(day));
}
async function ack(id,text='') {
  return telegram('answerCallbackQuery',{callback_query_id:id,...(text?{text}:{}),show_alert:false});
}
export async function handleAttendanceAdminUpdate(update) {
  const cb=update?.callback_query;
  if(cb && String(cb.data||'').startsWith('att:')){
    const id=cb.from?.id, chat=cb.message?.chat;
    if(!chat||chat.type!=='private'||!isAttendanceAdmin(id)||String(chat.id)!==String(id)){
      await ack(cb.id,'Bu bo‘lim faqat administratorlar uchun.');return true;
    }
    const value=String(cb.data||'');
    await ack(cb.id);
    try {
      if(value==='att:noop')return true;
      if(value==='att:home')await sendMenu(chat.id,String(id)===OWNER_ID?'super_admin':'admin');
      else if(value==='att:today')await sendAttendance(chat.id,todayInTashkent());
      else if(/^att:month:\d{4}-\d{2}$/.test(value))await sendCalendar(chat.id,value.slice(10));
      else if(/^att:day:\d{4}-\d{2}-\d{2}$/.test(value))await sendAttendance(chat.id,value.slice(8));
      else if(/^att:html:\d{4}-\d{2}-\d{2}$/.test(value))await sendAttendance(chat.id,value.slice(9),{only:'html'});
      else if(/^att:pdf:\d{4}-\d{2}-\d{2}$/.test(value))await sendAttendance(chat.id,value.slice(8),{only:'pdf'});
      else await sendMenu(chat.id);
    }catch(error){
      console.error('Teddy attendance action failed',error);
      await message(chat.id,'⚠️ Hisobotni olishda xatolik yuz berdi. Qayta urinib ko‘ring.');
    }
    return true;
  }
  const m=update?.message;
  if(!m?.text||!isAdminCommand(m.text))return false;
  if(m.chat?.type!=='private'||!isAttendanceAdmin(m.from?.id)||String(m.chat.id)!==String(m.from?.id)){
    await message(m.chat.id,'🔒 Ushbu bo‘lim faqat vakolatli administratorlar uchun.');
    return true;
  }
  await sendMenu(m.chat.id,String(m.from.id)===OWNER_ID?'super_admin':'admin');
  return true;
}
export async function deliverAttendanceAtSixPM() {
  const now=new Date(),today=todayInTashkent(now);
  const hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Tashkent',hour:'2-digit',hour12:false}).format(now));
  if(hour!==18)return {skipped:'outside_18_00',day:today};
  const report=await fetchAttendance(today);
  if(!report.groups.length)return {skipped:'no_lessons',day:today};
  if(report.unfinished.length)return {skipped:'unfinished',groups:report.unfinished,day:today};
  const db=getServiceSupabase(),sent=[],failed=[];
  for(const id of ADMIN_IDS){
    const {data:existing,error}=await db.from('sa_report_deliveries').select('report_date')
      .eq('report_date',today).eq('admin_telegram_id',id).maybeSingle();
    if(error)throw error;
    if(existing){sent.push({id,already_sent:true});continue;}
    try{
      await message(id,'🕕 <b>18:00 — kunlik davomat tayyor</b>\n\n'+compactSummary(report).slice(0,3400),reportButtons(today));
      await sendAttendancePreview(id,report).catch(e=>console.warn('Scheduled attendance preview unavailable',e?.message||e));
      await sendFile(id,Buffer.from(renderAttendanceHTML(report),'utf8'),
        'ARK_Davomat_'+today+'.html','text/html','🎨 <b>18:00 • Yakuniy HTML hisobot</b>',reportButtons(today));
      const {error:saveError}=await db.from('sa_report_deliveries').upsert(
        {report_date:today,admin_telegram_id:id},{onConflict:'report_date,admin_telegram_id',ignoreDuplicates:true});
      if(saveError)throw saveError;
      sent.push({id,already_sent:false});
    }catch(e){
      failed.push({id,error:e instanceof Error?e.message:'unknown'});
      console.error('Daily attendance delivery failed for admin',id,e);
    }
  }
  return {day:today,sent,failed};
}