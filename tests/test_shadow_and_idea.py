"""
Unit tests for Shadow Portfolio & Trade Idea Engine
"""
import unittest
import time
from deltaradar.models import Alert, AssetClass, ConfidenceBreakdown, DeskBrief, TradeIdea, ShadowPosition
from deltaradar.shadow_portfolio import generate_trade_idea, ShadowPortfolio

class TestShadowAndIdea(unittest.TestCase):
    def setUp(self):
        self.portfolio = ShadowPortfolio()
        self.sample_alert = Alert(
            id="test-alert-1",
            timestamp=time.time(),
            symbol="SOL/USDT",
            asset_class=AssetClass.ALTCOIN,
            triggers=["Breakout High", "Volume Spike"],
            price=115.0,
            pct_move=3.5,
            volume_vs_avg=3.8,
            divergence_note="Leading BTC",
            confidence=85,
            why_summary="Volume surge on ecosystem milestone",
            chart_link="https://tradingview.com",
            breakdown=ConfidenceBreakdown(
                base_score=60,
                volume_contribution=15,
                breakout_contribution=10,
                divergence_contribution=0,
                sentiment_contribution=0,
                synergy_bonus=5,
                liquidity_penalty=0,
                spread_penalty=0,
                final_score=85
            ),
            brief=DeskBrief(
                what_happened="Price gained +3.5% with 3.8x volume",
                likely_cause="Ecosystem transaction milestone",
                divergence_status="Leading BTC",
                key_levels={"support": 111.0, "breakout": 115.0, "resistance": 122.0},
                invalidation="5m close below $111.0 on selling volume",
                compact_summary="Bullish expansion"
            )
        )

    def test_generate_trade_idea_long(self):
        idea = generate_trade_idea(
            symbol="SOL/USDT",
            price=115.0,
            pct_move=3.5,
            triggers=["Breakout High"],
            key_levels={"support": 111.0, "breakout": 115.0, "resistance": 122.0}
        )
        self.assertEqual(idea.direction, "long")
        self.assertIn("$", idea.entry_zone)
        self.assertLess(idea.invalidation_level, 115.0)
        self.assertGreater(idea.target_1, 115.0)
        self.assertGreaterEqual(idea.reward_risk_ratio, 1.0)
        self.assertEqual(idea.disclaimer, "Idea for human review. Not an order, not advice.")
        self.assertTrue(len(idea.change_mind_condition) > 0)

    def test_generate_trade_idea_short(self):
        idea = generate_trade_idea(
            symbol="ETH/USDT",
            price=2400.0,
            pct_move=-2.8,
            triggers=["Breakout Low"],
            key_levels={"support": 2320.0, "breakout": 2400.0, "resistance": 2450.0}
        )
        self.assertEqual(idea.direction, "short")
        self.assertGreater(idea.invalidation_level, 2400.0)
        self.assertLess(idea.target_1, 2400.0)
        self.assertEqual(idea.disclaimer, "Idea for human review. Not an order, not advice.")

    def test_open_shadow_position(self):
        pos = self.portfolio.open_position_from_alert(self.sample_alert, is_counterfactual=False)
        self.assertEqual(pos.symbol, "SOL/USDT")
        self.assertEqual(pos.direction, "long")
        self.assertEqual(pos.entry_price, 115.0)
        self.assertEqual(pos.status, "open")
        self.assertEqual(pos.label, "Hypothetical. No real trades were placed.")
        self.assertFalse(pos.is_counterfactual)

    def test_target_and_invalidation_hits(self):
        pos = self.portfolio.open_position_from_alert(self.sample_alert, is_counterfactual=False)
        
        # Test target 1 hit
        target_price = pos.target_1 + 1.0
        updated = self.portfolio.update_symbol_price("SOL/USDT", target_price)
        matching = [p for p in updated if p.id == pos.id]
        self.assertEqual(matching[0].status, "hit_target_1")
        self.assertGreater(matching[0].r_multiple, 0)
        self.assertGreater(matching[0].pnl_pct, 0)

    def test_stopped_out(self):
        pos = self.portfolio.open_position_from_alert(self.sample_alert, is_counterfactual=False)
        # Drop price below invalidation
        stop_price = pos.invalidation_level - 1.0
        updated = self.portfolio.update_symbol_price("SOL/USDT", stop_price)
        matching = [p for p in updated if p.id == pos.id]
        self.assertEqual(matching[0].status, "stopped_out")
        self.assertEqual(matching[0].r_multiple, -1.0)
        self.assertLess(matching[0].pnl_pct, 0)

    def test_metrics_and_report(self):
        metrics = self.portfolio.get_metrics(counterfactual_only=False)
        self.assertIn("win_rate", metrics)
        self.assertIn("average_r", metrics)
        self.assertIn("max_drawdown_r", metrics)
        self.assertIn("by_trigger", metrics)
        self.assertIn("by_asset_class", metrics)

        status_text = self.portfolio.format_telegram_shadow_status()
        self.assertIn("Hypothetical. No real trades were placed.", status_text)
        self.assertIn("SHADOW PORTFOLIO", status_text)

        report_text = self.portfolio.format_telegram_shadow_report()
        self.assertIn("Hypothetical. No real trades were placed.", report_text)
        self.assertIn("Watched Alerts", report_text)
        self.assertIn("Ignored Alerts", report_text)

if __name__ == "__main__":
    unittest.main()
