import unittest
import io,os
from unittest.mock import patch
from lib.bot909.store import Store
from datetime import date,datetime
from lib.bot909.core import parse_answers,accepts,TZ,OWNER,group_label,test_caption
from lib.bot909.scheduler import schedule,drain
from lib.bot909.engine import Bot
class DB:
    def __init__(self):self.users={};self.writes=[]
    def one(self,table,**q):
        if table=='cb909_settings':return {'channel_id':'@testchannel','channel_url':'https://t.me/testchannel'}
        if table=='cb909_users':return self.users.get(int(q['telegram_id'][3:]))
        if table=='cb909_groups':return {'chat_id':-1002319452850,'active':True,'label':'909'}
        if table=='cb909_materials':return {'id':'material'}
    def get(self,table,**q):return [{'chat_id':-1002319452850,'active':True,'label':'909'}] if table=='cb909_groups' else []
    def upsert(self,table,value,*args):self.users[value['telegram_id']]=value.copy()
    def patch(self,*args,**kwargs):self.writes.append((args,kwargs))
class TG:
    def __init__(self):self.calls=[]
    def call(self,method,**p):
        self.calls.append((method,p))
        return {'status':'member'} if method=='getChatMember' else {'message_id':1}
class Rules(unittest.TestCase):
    def test_empty_public_url_uses_database_host(self):
        with patch.dict(os.environ,{'NEXT_PUBLIC_SUPABASE_URL':'','SUPABASE_SECRET_KEY':'fake'}):
            with patch('lib.bot909.store.urlopen',return_value=io.BytesIO(b'[{"id":true}]')) as request:
                self.assertEqual(Store().one('cb909_settings',id='eq.true'),{'id':True})
                self.assertTrue(request.call_args.args[0].full_url.startswith('https://svdigxqdivcmljirjwhk.supabase.co/rest/v1/'))
    def test_start_welcomes_and_preserves_previous_messages(self):
        db=DB();tg=TG();db.users[123]={'telegram_id':123,'step':'name','state':{},'menu_id':9}
        Bot(db,tg).handle({'message':{'from':{'id':123},'chat':{'id':123,'type':'private'},'text':'/start'}})
        sent=[p for method,p in tg.calls if method=='sendMessage']
        self.assertIn('7 kunlik challenge’ga xush kelibsiz',sent[0]['text'])
        self.assertNotIn('O‘zbekiston vaqti',sent[0]['text'])
        self.assertEqual(sent[0]['reply_markup']['inline_keyboard'][0][0]['callback_data'],'begin')
        self.assertFalse(any(method in ('deleteMessage','editMessageText') for method,p in tg.calls))
    def test_formats(self):
        for s in ('1a2b3c','1A 2B 3C','!1a,2b;3c','ABC','3c\n1a\n2b'):self.assertEqual(parse_answers(s,3),list('ABC'))
    def test_invalid(self):
        for s in ('1a1b3c','1a3c','0a2b3c','1a2b4c','1a2z3c','AB'):
            with self.assertRaises(ValueError):parse_answers(s,3)
    def test_deadline(self):
        start=date(2026,10,11)
        self.assertTrue(accepts(start,datetime(2026,10,11,20,59,59,tzinfo=TZ)))
        self.assertFalse(accepts(start,datetime(2026,10,11,21,0,tzinfo=TZ)))
        self.assertFalse(accepts(start,datetime(2026,10,18,8,tzinfo=TZ)))
    def test_forged_admin(self):
        db=DB();tg=TG();bot=Bot(db,tg)
        bot.handle({'callback_query':{'id':'1','from':{'id':123},'message':{'chat':{'id':123,'type':'private'}},'data':'a:activate'}})
        self.assertFalse(db.writes)
    def test_group_selection(self):
        db=DB();tg=TG();db.users[123]={'telegram_id':123,'name':'Test Student','step':'group','state':{}}
        Bot(db,tg).handle({'callback_query':{'id':'1','from':{'id':123},'message':{'chat':{'id':123,'type':'private'}},'data':'g:-1002319452850'}})
        self.assertEqual(db.users[123]['group_id'],-1002319452850)
    def test_begin_asks_name_separately(self):
        db=DB();tg=TG();db.users[123]={'telegram_id':123,'step':'welcome','state':{},'menu_id':9}
        Bot(db,tg).handle({'callback_query':{'id':'1','from':{'id':123},'message':{'message_id':9,'chat':{'id':123,'type':'private'}},'data':'begin'}})
        self.assertEqual(db.users[123]['step'],'name')
        self.assertIn('Ism va familiyangizni',tg.calls[-1][1]['text'])
    def test_stale_confirm_does_not_submit(self):
        db=DB();tg=TG();db.users[123]={'telegram_id':123,'name':'Test Student','step':'confirm','state':{},'menu_id':9}
        Bot(db,tg).handle({'callback_query':{'id':'1','from':{'id':123},'message':{'message_id':8,'chat':{'id':123,'type':'private'}},'data':'confirm'}})
        self.assertEqual(db.users[123]['step'],'confirm')
        self.assertIn('eski menyu',tg.calls[-1][1]['text'])
        self.assertFalse(db.writes)
    def test_invalid_names(self):
        for text in ('1111 2222','/admin test','Rustam 123'):
            db=DB();tg=TG();db.users[123]={'telegram_id':123,'step':'name','state':{}}
            Bot(db,tg).handle({'message':{'from':{'id':123},'chat':{'id':123,'type':'private'},'text':text}})
            self.assertNotIn('name',db.users[123])
    def test_group_details_do_not_toggle(self):
        db=DB();tg=TG();u={'telegram_id':OWNER,'step':'admin:home','state':{}}
        db.one=lambda table,**q:{'chat_id':-1002319452850,'title':'909','active':True,'label':'909'}
        Bot(db,tg).admin(u,'a:group:-1002319452850')
        self.assertFalse(db.writes)
        self.assertTrue(any('To‘xtatish' in b['text'] for row in tg.calls[-1][1]['reply_markup']['inline_keyboard'] for b in row))
    def test_group_names_and_help(self):
        self.assertEqual(group_label("404 - ARK O'QUV MARKAZ"),'404')
        self.assertEqual(group_label('909-ARK'),'909')
        self.assertEqual(group_label('test'),'test')
        with self.assertRaises(ValueError) as caught:parse_answers('1a3c',3)
        self.assertIn('2',str(caught.exception));self.assertIn('1-A, 2-B, 3-C',str(caught.exception))
        self.assertIn('@rustam_usmon0v',test_caption(1,'Articles','1111'))
    def test_scheduler_start_deadline_and_audio_dependency(self):
        class Scheduled(DB):
            def one(self,table,**q):
                if table=='cb909_settings':return {'active':True,'start_date':'2026-10-12'}
                if table=='cb909_materials':return {'id':'m','day':1,'title':'Articles','code':'1111','pdf_id':'pdf','retell_photo_id':'photo','retell_audio_id':'audio','retell_audio_kind':'audio'}
            def get(self,table,**q):
                if table=='cb909_groups':
                    assert q.get('is_test')=='eq.false'
                    return [{'chat_id':-1002319452850,'label':'909'}]
                return []
            def call(self,*a):self.writes.append(a)
        db=Scheduled();schedule(db,datetime(2026,10,12,7,59,tzinfo=TZ));self.assertFalse(db.writes)
        schedule(db,datetime(2026,10,12,8,0,tzinfo=TZ));self.assertEqual(len(db.writes),1)
        self.assertIn('Articles',db.writes[0][3]['payload']['caption'])
        db.writes=[];schedule(db,datetime(2026,10,12,16,0,tzinfo=TZ))
        self.assertEqual([x[3]['method'] for x in db.writes],['sendDocument','sendPhoto','sendAudio'])
        self.assertEqual(db.writes[-1][3]['payload']['_after'],db.writes[-2][3]['dedupe'])
    def test_audio_waits_for_photo_and_replies_to_it(self):
        class Outbox(DB):
            def get(self,table,**q):return [{'id':'audio','dedupe':'audio','method':'sendAudio','chat_id':-1002319452850,'payload':{'audio':'file','_after':'photo'}}] if q.get('status')=='eq.pending' else []
            def one(self,table,**q):
                if table=='cb909_groups':return {'active':True,'start_date':'2026-10-12'}
                if table=='cb909_settings':return {'active':True}
                return {'status':self.status,'message_id':42}
            def patch(self,*a,**k):return [{'id':'audio'}]
        db=Outbox();tg=TG();db.status='pending';drain(db,tg);self.assertFalse(tg.calls)
        db.status='sent';drain(db,tg)
        self.assertEqual(tg.calls[0][1]['reply_parameters'],{'message_id':42})
        self.assertNotIn('_after',tg.calls[0][1])
    def test_packaged_keys_and_owner_only_import(self):
        from lib.bot909.materials import bundle,import_day
        data=bundle();self.assertEqual(len(data['days']),7)
        self.assertEqual(sum(len(r['answer_key']) for r in data['days']),210)
        self.assertEqual(data['days'][1]['answer_key'][26],'A')
        from lib.bot909.core import grade
        answers=data['days'][1]['answer_key'].copy();answers[26]='B'
        self.assertEqual(grade(answers,data['days'][1]['answer_key'],data['days'][1]['accepted_alternatives'])['score'],30)
        class MaterialDB(DB):
            def one(self,table,**q):
                return {'chat_id':-1002319452850,'active':True,'start_date':'2026-10-12'} if table=='cb909_groups' else None
            def upsert(self,*a):self.writes.append(a)
        class UploadTG(TG):
            def upload(self,*a,**k):
                self.calls.append((a,k));assert k['chat_id']==OWNER
                assert a[3].startswith(b'%PDF')
                return {'document':{'file_id':'reviewed-pdf'}}
        db=MaterialDB();tg=UploadTG();result=import_day(db,tg,1,[-1002319452850])
        self.assertEqual(result['created'],1);self.assertEqual(db.writes[0][1]['code'],'1111')
        self.assertEqual(len(db.writes[0][1]['answer_key']),30)
    def test_answers_saved_only_after_confirmation(self):
        class ConfirmDB(DB):
            def __init__(self):super().__init__();self.submits=0
            def rpc(self,name,p):
                self.submits+=1
                self.users[p['p_student']].update(step='home',state={})
                return {'id':'submission','payload':p['p_payload']}
            def call(self,*a):return []
        db=ConfirmDB();tg=TG();db.users[123]={'telegram_id':123,'name':'Test Student','group_id':-1002319452850,'step':'answers','state':{'material':'m'}}
        bot=Bot(db,tg);bot.material=lambda u:{'id':'m','answer_key':list('ABC'),'code':'1111'}
        bot.handle({'message':{'from':{'id':123},'chat':{'id':123,'type':'private'},'text':'1-A, 2-B, 3-C'}})
        self.assertEqual(db.submits,0);self.assertEqual(db.users[123]['step'],'confirm')
        bot.handle({'callback_query':{'id':'confirm','from':{'id':123},'message':{'message_id':1,'chat':{'id':123,'type':'private'}},'data':'confirm'}})
        self.assertEqual(db.submits,1);self.assertEqual(db.users[123]['step'],'home')
        self.assertFalse(any('Xato savollar' in p.get('text','') for method,p in tg.calls))
    def test_retell_admin_state(self):
        db=DB();tg=TG();u={'telegram_id':OWNER,'step':'admin:existing','state':{'material':'material'}}
        Bot(db,tg).admin(u,'a:retell')
        self.assertEqual(u['step'],'admin:retell');self.assertEqual(u['state']['material'],'material')
if __name__=='__main__':unittest.main()
