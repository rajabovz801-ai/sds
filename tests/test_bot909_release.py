import unittest
from datetime import date,datetime
from unittest.mock import patch
from lib.bot909.core import TZ,accepts,challenge_start
from lib.bot909.reports import group_report,render_html
from lib.bot909.scheduler import drain
from lib.bot909.store import TelegramError
class Release(unittest.TestCase):
 def test_group_dates_and_opening(self):
  c={'start_date':'2026-10-12'};g={'start_date':'2026-10-13'}
  self.assertEqual(challenge_start(g,c),'2026-10-13')
  for hh,mm,result in [(7,59,False),(8,0,True),(20,59,True),(21,0,False)]:
   self.assertEqual(accepts(date(2026,10,13),datetime(2026,10,13,hh,mm,tzinfo=TZ)),result)
  self.assertFalse(accepts(date(2026,10,13),datetime(2026,10,12,9,tzinfo=TZ)))
 def test_report_coins_ties_and_escape(self):
  class DB:
   def get(self,t,**q):
    return {'cb909_materials':[{'id':'m','day':1}], 'cb909_users':[{'telegram_id':1,'name':'<script>x</script>'},{'telegram_id':2,'name':'Student Two'}], 'cb909_submissions':[{'material_id':'m','student_id':1,'kind':'test','score':30,'total':30}], 'cb909_coins':[{'student_id':1,'material_id':'m','amount':30},{'student_id':1,'material_id':'old','amount':45},{'student_id':2,'material_id':'m','amount':30}]}[t]
  r=group_report(DB(),{'chat_id':1,'title':'909','label':'909','start_date':'2026-10-12'},datetime(2026,10,12,21,tzinfo=TZ))
  self.assertEqual([x['rank'] for x in r['rows']],[1,1]);self.assertEqual(r['rows'][0]['total_coins'],75)
  h=render_html([r]);self.assertIn('&lt;script&gt;x&lt;/script&gt;',h);self.assertNotIn('<script>x</script>',h)
 def test_delivery_states(self):
  for error,status in [(TelegramError(429,'Slow',5),'pending'),(TelegramError(403,'Forbidden'),'failed'),(TelegramError(),'uncertain')]:
   class DB:
    def __init__(self):self.writes=[]
    def get(self,t,**q):return [{'id':'id','dedupe':'key','chat_id':1,'method':'sendMessage','payload':{'text':'hi'}}] if q.get('status')=='eq.pending' else []
    def patch(self,t,v,**q):self.writes.append(v);return [v]
    def call(self,*args):return []
   class TG:
    def call(self,*args,**q):raise error
   db=DB();drain(db,TG());self.assertEqual(db.writes[-1]['status'],status)
   if status=='pending':self.assertIn('next_attempt_at',db.writes[-1])
 def test_retell_not_reused_for_404(self):
  from lib.bot909.materials import bundle
  rows=bundle()['days']
  self.assertEqual(len(rows),7);self.assertTrue(all(r['retell']['group']=='909' for r in rows))
if __name__=='__main__':unittest.main()
