import asyncio
import json
import unittest
from types import SimpleNamespace
from unittest.mock import patch
from api import ark60
from fastapi import HTTPException, Response

class Request:
    cookies={'ark60_session':'test-session'}
    headers={}
    query_params={}
    async def body(self): return json.dumps(self.payload).encode()

class RewardAPITests(unittest.TestCase):
    def setUp(self):
        self.username='ruhshona'
        self.days=8
        self.writes=[]
        self.saved={'theme':None,'avatar':None,'badge':None}
        self.request=Request()
        self.request.query_params={}
    def database(self,method,endpoint,params=None,payload=None,prefer=None):
        if method in ('PATCH','POST') and not endpoint.startswith('rpc/'):
            self.writes.append((endpoint,payload))
        if endpoint=='ark60_sessions':
            return [{'student_id':'student-test','expires_at':'2027-10-08T00:00:00+00:00','revoked_at':None}]
        if endpoint=='ark60_students':
            return [{'id':'student-test','username':self.username,'status':'active','first_name':'Test','last_name':'Student','target_band':8}]
        if endpoint=='ark60_daily_rewards':
            return [{'id':str(i)} for i in range(self.days)]
        if endpoint=='rpc/ark60_student_leaderboard_period':
            return [{'student_id':'other-student','full_name':'Other Student','username':'other','coins':40,'active_seconds':120}]
        if endpoint=='ark60_presence': return []
        if endpoint=='ark60_cosmetics':
            if params and params.get('select','').startswith('student_id'):
                return [{'student_id':'other-student','theme':'forest','avatar':'girl','badge':None}]
            if method=='POST':self.saved={key:payload[key] for key in ('theme','avatar','badge')};return []
            return [dict(self.saved)]
        if endpoint=='rpc/ark60_reward_center_v2':
            return {'balance':35,'claimed_today':True,'today_amount':7,'claimed_days':8,'streak_day':8,'next_day':9,'history':[]}
        raise AssertionError('Unexpected database operation: '+endpoint)
    def post(self,payload):
        self.request.payload=payload
        with patch.object(ark60,'db',self.database):
            return asyncio.run(ark60.actions(self.request,Response()))
    def test_eighth_historical_claim_unlocks_themes_without_claim_or_coin_write(self):
        with patch.object(ark60,'db',self.database):
            result=ark60.get_data(self.request,Response(),action='reward_center')
        self.assertEqual(result['cosmetics']['unlocked']['themes'],['dawn','ocean','forest'])
        self.assertEqual(result['balance'],35)
        self.assertEqual(result['next_reward']['day'],9)
        self.assertEqual(self.writes,[])
    def test_demo_claim_does_not_write_rewards_or_coins(self):
        self.username='rustam7'
        result=self.post({'action':'claim_daily_reward','demo_day':13})
        self.assertEqual(result['today_reward']['kind'],'avatar')
        self.assertEqual(result['cosmetics']['unlocked']['avatars'],['boy','girl','girl-hijab'])
        self.assertEqual(result['balance'],0)
        self.assertEqual(self.writes,[])
    def test_locked_avatar_cannot_be_applied_by_posting_directly(self):
        with self.assertRaises(HTTPException) as error:
            self.post({'action':'apply_reward_style','theme':'forest','avatar':'girl'})
        self.assertEqual(error.exception.status_code,403)
        self.assertEqual(self.writes,[])
    def test_valid_style_is_saved_to_authenticated_student(self):
        self.days=13
        result=self.post({'action':'apply_reward_style','theme':'forest','avatar':'girl-hijab','badge':'day-10'})
        self.assertEqual(result['cosmetics']['avatar'],'girl-hijab')
        self.assertEqual(self.writes[0][1]['student_id'],'student-test')
    def test_second_rustam_account_can_try_demo_without_real_reward_write(self):
        self.username='rustam_usmonov_4f42fb15'
        self.request.query_params={'demo_day':'13'}
        with patch.object(ark60,'db',self.database):
            result=ark60.get_data(self.request,Response(),action='reward_center')
        self.assertTrue(result['preview'])
        self.assertEqual(result['next_day'],13)
        result=self.post({'action':'claim_daily_reward','demo_day':13})
        self.assertTrue(result['preview'])
        self.assertEqual(self.writes,[])
        result=self.post({'action':'apply_reward_style','theme':'ocean','avatar':'boy'})
        self.assertEqual(result['cosmetics']['avatar'],'boy')
    def test_other_viewer_receives_public_styles_without_cached_response(self):
        response=Response()
        with patch.object(ark60,'db',self.database):
            result=ark60.get_data(self.request,response,action='leaderboard')
        self.assertEqual(result['leaderboard'][0]['cosmetics']['theme'],'forest')
        self.assertEqual(result['leaderboard'][0]['cosmetics']['avatar'],'girl')
        self.assertIn('no-store',response.headers.get('cache-control',''))
    def test_body_cannot_enable_demo_for_real_student(self):
        with patch.object(ark60,'db',self.database):
            self.request.query_params={'demo_day':'60'}
            result=ark60.get_data(self.request,Response(),action='reward_center')
        self.assertFalse(result['preview'])
        self.assertEqual(result['claimed_days'],8)

if __name__=='__main__':unittest.main()
