"""
Unit Tests for DeltaRadar Confidence Scoring Logic.
Verifies:
1. Weight contributions
2. Synergy bonus (+15 for 2 triggers, +25 for 3+ triggers)
3. Liquidity and spread penalties
4. Strict bounds [0, 100]
"""
import unittest
from deltaradar.models import TriggerWeights
from deltaradar.scoring import ConfidenceScorer

class TestConfidenceScorer(unittest.TestCase):
    def setUp(self):
        self.weights = TriggerWeights(
            volume_spike=0.35,
            breakout=0.30,
            divergence=0.25,
            sentiment=0.10,
        )
        self.scorer = ConfidenceScorer(weights=self.weights)

    def test_single_volume_spike_score(self):
        # 1 trigger active (volume spike 4.0x)
        bd = self.scorer.calculate(
            volume_ratio=4.0,
            is_volume_spike=True,
            is_breakout=False,
            breakout_penetration_pct=0.0,
            is_divergence=False,
            divergence_gap_pct=0.0,
            is_sentiment_shift=False,
            sentiment_delta=0.0,
        )
        self.assertGreater(bd.final_score, 0)
        self.assertGreater(bd.volume_contribution, 20.0)
        self.assertEqual(bd.synergy_bonus, 0.0) # Only 1 trigger, no synergy
        self.assertEqual(bd.liquidity_penalty, 0.0)

    def test_synergy_bonus_applied_for_two_triggers(self):
        # 2 triggers active: Volume spike + Breakout
        bd = self.scorer.calculate(
            volume_ratio=4.5,
            is_volume_spike=True,
            is_breakout=True,
            breakout_penetration_pct=1.0,
            is_divergence=False,
            divergence_gap_pct=0.0,
            is_sentiment_shift=False,
            sentiment_delta=0.0,
        )
        self.assertEqual(bd.synergy_bonus, 15.0)
        self.assertGreater(bd.final_score, 65)

    def test_synergy_bonus_applied_for_three_triggers(self):
        # 3 triggers active: Volume spike + Breakout + Divergence
        bd = self.scorer.calculate(
            volume_ratio=5.0,
            is_volume_spike=True,
            is_breakout=True,
            breakout_penetration_pct=1.2,
            is_divergence=True,
            divergence_gap_pct=2.5,
            is_sentiment_shift=False,
            sentiment_delta=0.0,
        )
        self.assertEqual(bd.synergy_bonus, 25.0)
        self.assertGreaterEqual(bd.final_score, 85)

    def test_liquidity_and_spread_penalties(self):
        # High score but thin liquidity and 25 bps spread (> 18 bps threshold)
        bd_clean = self.scorer.calculate(
            volume_ratio=4.0,
            is_volume_spike=True,
            is_breakout=True,
            breakout_penetration_pct=0.8,
            is_divergence=False,
            divergence_gap_pct=0.0,
            is_sentiment_shift=False,
            sentiment_delta=0.0,
            is_thin_liquidity=False,
            spread_bps=5.0,
        )

        bd_penalized = self.scorer.calculate(
            volume_ratio=4.0,
            is_volume_spike=True,
            is_breakout=True,
            breakout_penetration_pct=0.8,
            is_divergence=False,
            divergence_gap_pct=0.0,
            is_sentiment_shift=False,
            sentiment_delta=0.0,
            is_thin_liquidity=True,
            spread_bps=25.0,
        )

        self.assertEqual(bd_penalized.liquidity_penalty, 15.0)
        self.assertEqual(bd_penalized.spread_penalty, 12.0)
        self.assertEqual(bd_clean.final_score - bd_penalized.final_score, 27)

    def test_score_clamped_at_100(self):
        # All 4 triggers maxed out
        bd = self.scorer.calculate(
            volume_ratio=10.0,
            is_volume_spike=True,
            is_breakout=True,
            breakout_penetration_pct=3.0,
            is_divergence=True,
            divergence_gap_pct=5.0,
            is_sentiment_shift=True,
            sentiment_delta=1.0,
        )
        self.assertLessEqual(bd.final_score, 100)

if __name__ == "__main__":
    unittest.main()
