import unittest
from datetime import date
from lib.ark60_weekly import weekly_progress, rank_coins

class WeeklyTests(unittest.TestCase):
    def test_reading_uses_question_weighted_accuracy_and_missing_days_stay_empty(self):
        rows=[{'score':8,'total':10,'submitted_at':'2026-10-19T20:00:00Z'}, {'score':6,'total':20,'submitted_at':'2026-10-20T01:00:00Z'}]
        data=weekly_progress(rows,[],date(2026,10,20))
        self.assertEqual(len(data['days']),7)
        self.assertIsNone(data['days'][0]['reading'])
        self.assertEqual(data['days'][-1]['reading'],46.7)
        self.assertIsNone(data['change']['reading'])
    def test_listening_uses_first_attempt_and_real_submission_date(self):
        rows=[{'day_number':19,'score':20,'submitted_at':'2026-10-19T08:00:00Z'}, {'day_number':19,'score':40,'submitted_at':'2026-10-20T08:00:00Z'}, {'day_number':20,'score':28,'submitted_at':'2026-10-20T09:00:00Z'}]
        data=weekly_progress([],rows,date(2026,10,20))
        self.assertEqual(data['days'][-2]['listening'],50)
        self.assertEqual(data['days'][-1]['listening'],70)
        self.assertEqual(data['change']['listening'],20)
    def test_old_future_and_invalid_data_not_plotted(self):
        rows=[{'score':50,'total':10,'submitted_at':'2026-10-20T01:00:00Z'}, {'score':8,'total':10,'submitted_at':'2026-10-01T01:00:00Z'}]
        self.assertTrue(all(x['reading'] is None for x in weekly_progress(rows,[],date(2026,10,20))['days']))
    def test_equal_coins_have_equal_dense_place(self):
        rows=[{'coins':10},{'coins':8},{'coins':8},{'coins':5}]
        self.assertEqual([r['rank'] for r in rank_coins(rows)],[1,2,2,3])

class WeeklyEndpointTests(unittest.TestCase):
    def endpoint(self, pro):
        import ast
        from types import SimpleNamespace
        from datetime import datetime, timedelta
        from lib.ark60_pro import owner_profile, active_pro
        tree=ast.parse(__import__('pathlib').Path('api/ark60.py').read_text())
        funcs=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in ('profile_pro','get_data')]
        for fn in funcs:
            fn.decorator_list=[]
            fn.returns=None
            for arg in fn.args.args:arg.annotation=None
        class Denied(Exception):
            def __init__(self,status_code,detail):self.status_code=status_code
        calls=[]
        def db(method,table,params=None,payload=None):
            calls.append((table,params))
            if table=='ark60_billing_access':return [{'expires_at':'2099-01-01T00:00:00Z'}] if pro else []
            return []
        env={'owner_profile':owner_profile,'active_pro':active_pro,'db':db,'now':lambda:datetime.now().astimezone(),'today':lambda:date(2026,10,20),'require_student':lambda r:{'id':'own-student','username':'student'},'datetime':datetime,'timedelta':timedelta,'TZ':__import__('zoneinfo').ZoneInfo('Asia/Tashkent'),'HTTPException':Denied,'weekly_progress':weekly_progress}
        exec(compile(ast.Module(body=funcs,type_ignores=[]),'api/ark60.py','exec'),env)
        return lambda:env['get_data'](SimpleNamespace(),SimpleNamespace(headers={}),action='weekly_progress'),calls,Denied
    def test_free_account_cannot_read_weekly_results(self):
        run,calls,Denied=self.endpoint(False)
        with self.assertRaises(Denied) as error:run()
        self.assertEqual(error.exception.status_code,403)
        self.assertEqual(len(calls),1)
    def test_paid_account_queries_only_own_results(self):
        run,calls,_=self.endpoint(True)
        self.assertEqual(len(run()['days']),7)
        for table,params in calls:
            self.assertEqual(params['student_id'],'eq.own-student')

if __name__=='__main__':unittest.main()
