import unittest
from datetime import datetime, timezone
from lib.ark60_pro import active_pro, visible_style, owner_profile

class ProProfileTests(unittest.TestCase):
    def test_owner_accounts_only(self):
        self.assertTrue(owner_profile("rustam7"))
        self.assertTrue(owner_profile("rustam_usmonov_4f42fb15"))
        self.assertFalse(owner_profile("rustam"))
        self.assertFalse(owner_profile("student"))

    def test_existing_paid_challenge_is_pro(self):
        self.assertTrue(active_pro({'challenge_until':'2026-10-27T00:00:00Z'}, datetime(2026,10,20,tzinfo=timezone.utc)))
    def test_mock_trial_and_expired_are_not_pro(self):
        at=datetime(2026,10,20,tzinfo=timezone.utc)
        for m in ({'mock_dates':['2026-10-25']},{'trial_eligible':True},{'challenge_until':'2026-10-19T00:00:00Z'},{'challenge_until':'bad'}):
            self.assertFalse(active_pro(m,at))
    def test_expired_photo_hidden_without_destroying_reward_avatar(self):
        source={'avatar':'boy','photo_url':'https://example.com/a.webp','photo_enabled':True}
        hidden=visible_style(source,False)
        self.assertIsNone(hidden['photo_url'])
        self.assertEqual(hidden['avatar'],'boy')
        self.assertEqual(source['photo_url'],'https://example.com/a.webp')
        self.assertEqual(visible_style(source,True)['photo_url'],source['photo_url'])
    def test_reward_avatar_selection_hides_saved_photo(self):
        self.assertIsNone(visible_style({'photo_url':'saved','photo_enabled':False},True)['photo_url'])
if __name__=='__main__': unittest.main()
