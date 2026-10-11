import unittest
import io,os
from unittest.mock import patch
from lib.bot909.store import Store
from datetime import date,datetime
from lib.bot909.core import parse_answers,accepts,TZ,OWNER
from lib.bot909.engine import Bot
class DB:
    def __init__(self):self.users={};self.writes=[]
    def one(self,table,**q):
        if table=='cb909_settings':return {'channel_id':'@testchannel','channel_url':'https://t.me/testchannel'}
        if table=='cb909_users':return self.users.get(int(q['telegram_id'][3:]))
        if table=='cb909_groups':return {'chat_id':-1001,'active':True,'label':'909'}
        if table=='cb909_materials':return {'id':'material'}
    def get(self,table,**q):return [{'chat_id':-1001,'active':True,'label':'909'}] if table=='cb909_groups' else []
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
        self.assertIn('7 kunlik challenge botiga xush kelibsiz',sent[0]['text'])
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
        Bot(db,tg).handle({'callback_query':{'id':'1','from':{'id':123},'message':{'chat':{'id':123,'type':'private'}},'data':'g:-1001'}})
        self.assertEqual(db.users[123]['group_id'],-1001)
    def test_retell_admin_state(self):
        db=DB();tg=TG();u={'telegram_id':OWNER,'step':'admin:existing','state':{'material':'material'}}
        Bot(db,tg).admin(u,'a:retell')
        self.assertEqual(u['step'],'admin:retell');self.assertEqual(u['state']['material'],'material')
if __name__=='__main__':unittest.main()
