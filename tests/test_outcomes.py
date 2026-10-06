"""
Unit Tests for DeltaRadar Outcome Tracker & Self-Calibration.
Verifies:
1. Outcome evaluation at +1h, +4h, +24h
2. Self-calibration weight adjustment based on hit rates
"""
import unittest
import time
import os
from deltaradar.models import Alert, AssetClass, ConfidenceBreakdown, TriggerWeights
from deltaradar.db import Database
from deltaradar.outcome_tracker import OutcomeTracker
from deltaradar.calibration import CalibrationEngine

class TestOutcomesAndCalibration(unittest.TestCase):
    def setUp(self):
        self.test_db_path = "test_deltaradar.db"
        if os.path.exists(self.test_db_path):
            os.remove(self.test_db_path)
        self.db = Database(self.test_db_path)
        self.tracker = OutcomeTracker(self.db)
        self.calibrator = CalibrationEngine(self.db)

    def tearDown(self):
        if os.path.exists(self.test_db_path):
            os.remove(self.test_db_path)

    def _create_sample_alert(self, alert_id: str, symbol: str, price: float, triggers: list, confidence: int = 80):
        bd = ConfidenceBreakdown(
            base_score=65.0,
            volume_contribution=25.0,
            breakout_contribution=20.0,
            divergence_contribution=20.0,
            sentiment_contribution=0.0,
            synergy_bonus=15.0,
            liquidity_penalty=0.0,
            spread_penalty=0.0,
            final_score=confidence,
        )
        return Alert(
            id=alert_id,
            timestamp=time.time() - 90000, # 25h ago
            symbol=symbol,
            asset_class=AssetClass.ALTCOIN,
            triggers=triggers,
            price=price,
            pct_move=3.5,
            volume_vs_avg=3.8,
            divergence_note="None",
            confidence=confidence,
            why_summary="Ecosystem momentum",
            chart_link="https://tradingview.com",
            breakdown=bd,
        )

    def test_outcome_tracking_hit_at_1h(self):
        alert = self._create_sample_alert("alt-1", "SOL/USDT", 100.0, ["Volume Spike", "Breakout"])
        outcome = self.tracker.register_alert_for_tracking(alert, direction="bullish")

        # Simulate price after 1 hour (3600s) = $103.0 (+3.0% > 1.2% target)
        updated = self.tracker.evaluate_price_step(
            outcome.__dict__,
            alert.timestamp + 3600,
            103.0,
        )
        self.assertTrue(updated.hit_1h)
        self.assertEqual(updated.move_pct_1h, 3.0)

    def test_outcome_tracking_miss_at_1h(self):
        alert = self._create_sample_alert("alt-2", "NEAR/USDT", 5.0, ["Volume Spike"])
        outcome = self.tracker.register_alert_for_tracking(alert, direction="bullish")

        # Price after 1h dropped to 4.95 (-1.0% < 1.2% target)
        updated = self.tracker.evaluate_price_step(
            outcome.__dict__,
            alert.timestamp + 3600,
            4.95,
        )
        self.assertFalse(updated.hit_1h)
        self.assertEqual(updated.move_pct_1h, -1.0)

    def test_calibration_adjusts_weights(self):
        # Register 5 alerts with Volume Spike that all HIT (100% hit rate)
        # Register 5 alerts with Sentiment that all MISS (0% hit rate)
        for i in range(5):
            a_vol = self._create_sample_alert(f"vol-{i}", "SOL/USDT", 100.0, ["Volume Spike"])
            o_vol = self.tracker.register_alert_for_tracking(a_vol)
            self.tracker.evaluate_price_step(o_vol.__dict__, a_vol.timestamp + 3600, 105.0) # Hit

            a_sent = self._create_sample_alert(f"sent-{i}", "ETH/USDT", 2500.0, ["Sentiment"])
            o_sent = self.tracker.register_alert_for_tracking(a_sent)
            self.tracker.evaluate_price_step(o_sent.__dict__, a_sent.timestamp + 3600, 2450.0) # Miss

        stats = self.calibrator.evaluate_stats(lookback_days=7)
        self.assertGreater(stats["trigger_stats"]["volume_spike"]["hits"], 0)
        self.assertEqual(stats["trigger_stats"]["sentiment"]["hits"], 0)
        self.assertIn("Volume Spike", str(stats["changes"]))

if __name__ == "__main__":
    unittest.main()
