import unittest
from lib import ark60_rewards as rewards

class RewardTests(unittest.TestCase):
    def test_day_eight_is_a_theme_not_more_coins(self):
        self.assertEqual(rewards.reward_for_day(8), {'day':8,'kind':'theme','amount':0,'label':'Theme & avatar collection'})
        self.assertEqual(rewards.reward_for_day(9)['amount'],3)

    def test_existing_eighth_claim_unlocks_themes_even_with_old_streak_seven(self):
        self.assertEqual(rewards.unlocks(8)['themes'],['dawn','ocean','forest'])
        self.assertEqual(rewards.unlocks(7)['themes'],[])
        self.assertEqual(rewards.unlocks(8)['avatars'],['boy','girl','girl-hijab'])
        self.assertNotIn('night-sky',rewards.unlocks(8)['themes'])
        self.assertIn('night-sky',rewards.unlocks(13)['themes'])
        self.assertEqual(rewards.reward_for_day(13)['label'],'Night Sky theme')

    def test_avatar_choice_is_not_derived_from_gender(self):
        self.assertTrue(rewards.style_allowed(13,'forest','girl-hijab'))
        self.assertTrue(rewards.style_allowed(13,'ocean','boy'))
        self.assertTrue(rewards.style_allowed(8,'dawn','boy'))
        self.assertFalse(rewards.style_allowed(7,'dawn','boy'))
        self.assertFalse(rewards.style_allowed(12,'night-sky','boy'))
        self.assertTrue(rewards.style_allowed(13,'night-sky','boy'))
        self.assertFalse(rewards.style_allowed(13,'unknown','boy'))

    def test_later_milestones_remain_rewards(self):
        self.assertEqual(rewards.reward_for_day(14)['kind'],'badge')
        self.assertEqual(rewards.reward_for_day(21)['kind'],'badge')
        self.assertEqual(rewards.reward_for_day(60)['kind'],'badge')
        self.assertEqual(rewards.unlocks(60)['badges'][-1],'day-60')

if __name__ == '__main__': unittest.main()
