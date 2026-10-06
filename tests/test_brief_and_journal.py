import unittest
import time
import os
from deltaradar.brief import DeskBriefGenerator
from deltaradar.db import Database
from deltaradar.models import AssetClass, ConfidenceBreakdown, Candle

class TestBriefAndJournal(unittest.TestCase):
    def setUp(self):
        self.db_path = "test_journal.db"
        if os.path.exists(self.db_path):
            os.remove(self.db_path)
        self.db = Database(self.db_path)
        self.brief_gen = DeskBriefGenerator()

    def tearDown(self):
        if os.path.exists(self.db_path):
            os.remove(self.db_path)

    def test_desk_brief_structure(self):
        breakdown = ConfidenceBreakdown(
            base_score=68.0,
            volume_contribution=26.0,
            breakout_contribution=24.0,
            divergence_contribution=18.0,
            sentiment_contribution=0.0,
            synergy_bonus=15.0,
            liquidity_penalty=0.0,
            spread_penalty=0.0,
            final_score=83,
        )
        candles = [
            Candle(symbol="SOL/USDT", timestamp=time.time() - (i * 300), open=140.0 + i, high=142.0 + i, low=139.0 + i, close=141.0 + i, volume=100.0)
            for i in range(25)
        ]
        brief = self.brief_gen.generate_brief(
            symbol="SOL/USDT",
            asset_class=AssetClass.ALTCOIN,
            current_price=165.50,
            pct_move=7.2,
            volume_vs_avg=3.8,
            triggers=["Volume Spike (3.8x)", "Breakout High"],
            divergence_note="Decoupled from BTC (+8.5% spread)",
            confidence_breakdown=breakdown,
            candles=candles,
            skip_llm=True,
        )
        self.assertIn("Price surged +7.20%", brief.what_happened)
        self.assertIn("breakout", brief.key_levels)
        self.assertIn("support", brief.key_levels)
        self.assertIn("invalidation", brief.invalidation.lower())
        self.assertIsNotNone(brief.likely_cause)

    def test_decision_journal_recording(self):
        alert_id = "test-alert-101"
        res = self.db.record_human_decision(
            alert_id=alert_id,
            symbol="TSLA/USD",
            decision="watch",
            alert_price=226.40,
            notes="Watching for continuation above $228",
        )
        self.assertEqual(res["decision"], "watch")
        
        journal = self.db.get_decision_journal()
        self.assertEqual(len(journal), 1)
        self.assertEqual(journal[0]["symbol"], "TSLA/USD")
        self.assertEqual(journal[0]["decision"], "watch")

        stats = self.db.get_decision_stats()
        self.assertEqual(stats["watch"], 1)
        self.assertEqual(stats["ignore"], 0)
        self.assertEqual(stats["total"], 1)

if __name__ == "__main__":
    unittest.main()
