import unittest,copy
from datetime import datetime,timedelta
from unittest.mock import patch
from lib.bot909.core import CHALLENGE_GROUP as G,OWNER,TZ,valid_name
from lib.bot909.engine import Bot
from lib.bot909.scheduler import schedule,drain
from lib.bot909.store import TelegramError
class DB:
 def __init__(self):
  self.rows={'cb909_settings':[{'id':True,'active':True,'channel_id':'@channel','channel_url':'https://t.me/channel'}],'cb909_groups':[{'chat_id':G,'active':True,'label':'909','title':'909','start_date':'2026-10-12','is_test':False},{'chat_id':-404,'active':True,'label':'404','title':'404','start_date':'2026-10-12','is_test':False}], 'cb909_users':[{'telegram_id':123,'name':'Ali Valiyev','group_id':None,'step':'home','state':{}}], 'cb909_materials':[{'id':'m','group_id':G,'cycle_start':'2026-10-12','day':1,'code':'1111','title':'Articles','pdf_id':'pdf','published':True,'answer_key':list('ABC'),'retell_photo_id':'photo','retell_audio_id':'audio','retell_audio_kind':'audio'}], 'cb909_outbox':[], 'cb909_submissions':[], 'cb909_coins':[]};self.submits=[]
 def match(self,r,q):
  for k,v in q.items():
   if k in ('order','limit','offset','or'):continue
   op,val=str(v).split('.',1);actual=r.get(k)
   if op=='eq':
    if val=='true':val=True
    elif val=='false':val=False
    else:actual=str(actual)
    if actual!=val:return False
   elif op=='lt' and not (actual is not None and str(actual)<val):return False
   elif op=='gt' and not (actual is not None and str(actual)>val):return False
   elif op=='lte' and not (actual is not None and str(actual)<=val):return False
   elif op=='in' and str(actual) not in val.strip('()').split(','):return False
  return True
 def get(self,t,**q):return [copy.deepcopy(r) for r in self.rows.get(t,[]) if self.match(r,q)][:q.get('limit',500)]
 get_all=get
 def one(self,t,**q):
  rows=self.get(t,**q);return rows[0] if rows else None
 def upsert(self,t,v,*a):
  for i,r in enumerate(self.rows[t]):
   if r.get('telegram_id')==v.get('telegram_id'):self.rows[t][i]=copy.deepcopy(v);return
  self.rows[t].append(copy.deepcopy(v))
 def patch(self,t,v,**q):
  out=[]
  for r in self.rows[t]:
   if self.match(r,q):r.update(v);out.append(copy.deepcopy(r))
  return out
 def call(self,method,t,q=None,v=None,*a,**kw):
  v=v or kw.get('value')
  if any(r['dedupe']==v['dedupe'] for r in self.rows[t]):return []
  v={**v,'id':str(len(self.rows[t])+1),'status':'pending','attempts':0,'next_attempt_at':'2026-10-11T00:00:00+05:00'};self.rows[t].append(v);return [v]
 def rpc(self,n,p):self.submits.append((n,p));self.patch('cb909_users',{'step':'home','state':{}},telegram_id='eq.'+str(p.get('p_student',0)));return {'id':'s','payload':p.get('p_payload',{})}
class TG:
 def __init__(self,status='member',error=None):self.calls=[];self.status=status;self.error=error
 def call(self,m,**p):
  self.calls.append((m,p))
  if m=='getChatMember':
   if self.error:raise self.error
   return {'status':self.status}
  return {'message_id':len(self.calls)}
class Final(unittest.TestCase):
 def setUp(self):self.db=DB();self.tg=TG();self.bot=Bot(self.db,self.tg);self.clock=patch('lib.bot909.engine.local_now',return_value=datetime(2026,10,12,17,tzinfo=TZ));self.clock.start();self.addCleanup(self.clock.stop)
 def message(self,text=None,**media):
  m={'from':{'id':123},'chat':{'id':123,'type':'private'},**media}
  if text is not None:m['text']=text
  self.bot.handle({'message':m})
 def click(self,a):
  u=self.db.one('cb909_users',telegram_id='eq.123')
  self.bot.handle({'callback_query':{'id':'q','from':{'id':123},'message':{'message_id':u.get('menu_id'),'chat':{'id':123,'type':'private'}},'data':a}})
 def test_auto909_without_group_membership(self):
  self.click('home');self.assertEqual(self.db.rows['cb909_users'][0]['group_id'],G)
  checks=[p['chat_id'] for m,p in self.tg.calls if m=='getChatMember'];self.assertEqual(checks,['@channel'])
  self.assertFalse(any(b['callback_data'].startswith('g:') for row in self.tg.calls[-1][1]['reply_markup']['inline_keyboard'] for b in row))
 def test_old404_button_cannot_assign404(self):
  self.click('g:-404');self.assertEqual(self.db.rows['cb909_users'][0]['group_id'],G)
 def test_subscription_only_two_buttons(self):
  self.tg.status='left';self.click('home');rows=self.tg.calls[-1][1]['reply_markup']['inline_keyboard'];self.assertEqual(len(rows),2);self.assertNotIn('rename',str(rows))
 def test_subscription_failure_has_retry(self):
  self.tg.error=TelegramError();self.click('home');p=self.tg.calls[-1][1];self.assertIn('tekshirib bo‘lmadi',p['text']);self.assertIn('check',str(p['reply_markup']))
 def test_name_validation(self):
  for name in ("' -",'Ali -','123 456','Ali'):self.assertFalse(valid_name(name))
  for name in ("Ali Valiyev","O‘tkir G‘aniyev",'Али Валиев'):self.assertTrue(valid_name(name))
 def test_confirmation_text_preserves_answers(self):
  self.db.rows['cb909_users'][0].update(step='confirm',state={'material':'m','answers':list('ABC')})
  self.message('Tasdiqlayman');u=self.db.rows['cb909_users'][0];self.assertEqual(u['step'],'confirm');self.assertEqual(u['state']['answers'],list('ABC'));self.assertFalse(self.db.submits)
 def test_back_preserves_confirmation_draft(self):
  self.db.rows['cb909_users'][0].update(step='confirm',state={'material':'m','answers':list('ABC')})
  self.click('home');self.assertIn('draft',self.db.rows['cb909_users'][0]['state']);self.click('resume');self.assertEqual(self.db.rows['cb909_users'][0]['step'],'confirm')
 def test_submit_calls_atomic_rpc_and_never_discloses_answers(self):
  self.db.rows['cb909_users'][0].update(step='confirm',state={'material':'m','answers':list('ABC')})
  self.click('confirm');self.assertEqual(self.db.submits[0][0],'cb909_submit');self.assertEqual(self.db.rows['cb909_users'][0]['step'],'home');self.assertFalse(any('Xato savollar' in p.get('text','') for m,p in self.tg.calls))
 def test_receipt_updates_latest_menu_and_strips_metadata(self):
  self.db.rows['cb909_outbox']=[{'id':'r','dedupe':'receipt:s','chat_id':123,'method':'sendMessage','payload':{'text':'✅ Natijangiz saqlandi!\n📝 24/30','_menu':True},'status':'pending','next_attempt_at':'2026-10-11T00:00:00+05:00'}]
  drain(self.db,self.tg);self.assertNotIn('_menu',self.tg.calls[0][1]);self.assertEqual(self.db.rows['cb909_users'][0]['menu_id'],1)
 def test_text_only_retell_is_previewed(self):
  self.db.rows['cb909_materials'][0].update(retell_photo_id=None,retell_text='Read this text')
  self.bot.preview({'telegram_id':OWNER},'m');rows=self.db.rows['cb909_outbox'];self.assertIn('Read this text',rows[1]['payload']['text']);self.assertEqual(rows[2]['payload']['_after'],rows[1]['dedupe'])
 def test_paused_queue_resumes_before_deadline(self):
  self.scheduled(datetime(2026,10,12,8,tzinfo=TZ));self.db.rows['cb909_settings'][0]['active']=False
  with patch('lib.bot909.scheduler.local_now',return_value=datetime(2026,10,12,9,tzinfo=TZ)):drain(self.db,self.tg)
  self.assertEqual(self.db.rows['cb909_outbox'][0]['status'],'pending')
  self.db.rows['cb909_settings'][0]['active']=True
  with patch('lib.bot909.scheduler.local_now',return_value=datetime(2026,10,12,9,tzinfo=TZ)):drain(self.db,self.tg)
  self.assertEqual(self.db.rows['cb909_outbox'][0]['status'],'sent')
 def test_legacy_task_after_deadline_is_cancelled(self):
  self.db.rows['cb909_outbox']=[{'id':'r','dedupe':'2026-10-12:'+str(G)+':1:pdf','chat_id':G,'method':'sendDocument','payload':{'document':'p'},'status':'pending','next_attempt_at':'2026-10-11T00:00:00+05:00'}]
  with patch('lib.bot909.scheduler.local_now',return_value=datetime(2026,10,12,22,tzinfo=TZ)):drain(self.db,self.tg)
  self.assertFalse(self.tg.calls)
 def test_all_seven_days_have_exact_schedule_guards(self):
  for day in range(1,8):
   db=DB();db.rows['cb909_materials'][0]['day']=day
   now=datetime(2026,10,11+day,8,tzinfo=TZ);schedule(db,now)
   self.assertEqual(db.rows['cb909_outbox'][0]['payload']['_expires'],now.replace(hour=21).isoformat())
 def test_404_admin_is_rejected(self):
  with self.assertRaises(ValueError):self.bot.admin({'telegram_id':OWNER},'a:group:-404')
 def test_profile_has_rename(self):
  self.click('profile');self.assertIn('rename',str(self.tg.calls[-1][1]['reply_markup']))
 def test_home_shows_completion(self):
  self.db.rows['cb909_submissions']=[{'material_id':'m','student_id':123,'kind':'test'}]
  self.click('home');self.assertIn('Test ✅',self.tg.calls[-1][1]['text']);self.assertIn('Retelling ⏳',self.tg.calls[-1][1]['text'])
 def test_wrong_media_does_not_clear_answers(self):
  self.db.rows['cb909_users'][0].update(step='answers',state={'material':'m'})
  with self.assertRaises(ValueError):self.message(photo=[{'file_id':'p'}])
  self.assertEqual(self.db.rows['cb909_users'][0]['step'],'answers')
 def scheduled(self,now):
  schedule(self.db,now);return self.db.rows['cb909_outbox']
 def test_0800_only_pdf_909_and_deduplicates(self):
  now=datetime(2026,10,12,8,tzinfo=TZ);self.scheduled(now);self.scheduled(now);rows=self.db.rows['cb909_outbox'];self.assertEqual(len(rows),1);self.assertEqual(rows[0]['chat_id'],G);self.assertEqual(rows[0]['method'],'sendDocument')
 def test_1600_links_photo_audio(self):
  rows=self.scheduled(datetime(2026,10,12,16,tzinfo=TZ));self.assertEqual([r['method'] for r in rows],['sendDocument','sendPhoto','sendAudio']);self.assertEqual(rows[2]['payload']['_after'],rows[1]['dedupe'])
 def test_2100_reports_without_tasks(self):
  rows=self.scheduled(datetime(2026,10,12,21,tzinfo=TZ));self.assertTrue(any('_html' in r['payload'] for r in rows));self.assertFalse(any('document' in r['payload'] for r in rows))
 def test_expired_pdf_cannot_send(self):
  self.scheduled(datetime(2026,10,12,8,tzinfo=TZ))
  with patch('lib.bot909.scheduler.local_now',return_value=datetime(2026,10,12,21,tzinfo=TZ)):drain(self.db,self.tg)
  self.assertFalse(self.tg.calls);self.assertEqual(self.db.rows['cb909_outbox'][0]['error_code'],410)
 def test_paused_queue_cannot_send(self):
  self.scheduled(datetime(2026,10,12,8,tzinfo=TZ));self.db.rows['cb909_settings'][0]['active']=False
  with patch('lib.bot909.scheduler.local_now',return_value=datetime(2026,10,12,9,tzinfo=TZ)):drain(self.db,self.tg)
  self.assertFalse(self.tg.calls)
 def test_inactive_group_queue_cannot_send(self):
  self.scheduled(datetime(2026,10,12,8,tzinfo=TZ));self.db.rows['cb909_groups'][0]['active']=False
  with patch('lib.bot909.scheduler.local_now',return_value=datetime(2026,10,12,9,tzinfo=TZ)):drain(self.db,self.tg)
  self.assertFalse(self.tg.calls)
 def test_foreign_group_queue_cannot_send(self):
  self.db.rows['cb909_outbox']=[{'id':'r','dedupe':'2026-10-12:-404:1:pdf','chat_id':-404,'method':'sendDocument','payload':{'document':'p'},'status':'pending','next_attempt_at':'2026-10-11T00:00:00+05:00'}]
  drain(self.db,self.tg);self.assertFalse(self.tg.calls)
 def test_cancelled_message_cannot_be_manually_retried(self):
  self.db.rows['cb909_outbox']=[{'id':'r','dedupe':'old','chat_id':G,'status':'failed','error_code':410}]
  with self.assertRaises(ValueError):self.bot.admin({'telegram_id':OWNER},'a:retry:r')
 def test_material_edit_uses_locked_rpc(self):
  self.bot.admin_input({'telegram_id':OWNER,'step':'admin:title','state':{'material':'m'}},{'text':'New title'})
  self.assertEqual(self.db.submits[-1],('cb909_edit_material',{'p_material':'m','p_values':{'title':'New title'}}))
 def test_receipt_never_replaces_a_newer_input_menu(self):
  self.db.rows['cb909_users'][0].update(step='code',menu_id=77)
  self.db.rows['cb909_outbox']=[{'id':'r','dedupe':'receipt:s','chat_id':123,'method':'sendMessage','payload':{'text':'24/30','_menu':True},'status':'pending','next_attempt_at':'2026-10-11T00:00:00+05:00'}]
  drain(self.db,self.tg);self.assertEqual(self.db.rows['cb909_users'][0]['menu_id'],77)
if __name__=='__main__':unittest.main()
