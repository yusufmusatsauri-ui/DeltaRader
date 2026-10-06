"""
Unit Tests for DeltaRadar Divergence Engine (Signature Feature).
Verifies:
1. Tokenized stock/gold lag & lead vs underlying
2. Altcoin decoupling from BTC during BTC moves
"""
import unittest
import time
from deltaradar.models import Candle, DivergenceType
from deltaradar.divergence import DivergenceEngine

class TestDivergenceEngine(unittest.TestCase):
    def setUp(self):
        self.engine = DivergenceEngine(
            tokenized_max_lag_lead_pct=1.2,
            min_btc_move_pct=1.5,
            min_alt_divergence_pct=2.5,
        )

    def _make_candles(self, symbol: str, prices):
        now = time.time()
        return [
            Candle(
                symbol=symbol,
                timestamp=now + (i * 300),
                open=p,
                high=p * 1.001,
                low=p * 0.999,
                close=p,
                volume=1000.0,
                period="5m",
            )
            for i, p in enumerate(prices)
        ]

    def test_tokenized_stock_lead_detected(self):
        # TSLA token at $225.00 vs underlying TSLA stock at $220.00
        # Spread = (225 - 220) / 220 = +2.27% (> 1.2% threshold)
        res = self.engine.check_tokenized_divergence("TSLA/USD", 225.0, "TSLA", 220.0)
        self.assertTrue(res.is_divergent)
        self.assertEqual(res.divergence_type, DivergenceType.TOKENIZED_LEAD)
        self.assertAlmostEqual(res.spread_or_gap_pct, 2.27, places=1)

    def test_tokenized_stock_lag_discount_detected(self):
        # TSLA token at $215.00 vs underlying TSLA stock at $220.00
        # Spread = -2.27%
        res = self.engine.check_tokenized_divergence("TSLA/USD", 215.0, "TSLA", 220.0)
        self.assertTrue(res.is_divergent)
        self.assertEqual(res.divergence_type, DivergenceType.TOKENIZED_LAG)
        self.assertAlmostEqual(res.spread_or_gap_pct, -2.27, places=1)

    def test_tokenized_in_sync_ignored(self):
        # TSLA token at $220.50 vs underlying at $220.00 (Spread = +0.23% < 1.2%)
        res = self.engine.check_tokenized_divergence("TSLA/USD", 220.5, "TSLA", 220.0)
        self.assertFalse(res.is_divergent)

    def test_altcoin_btc_inverse_decoupling(self):
        # BTC drops by -2.0% (from 60,000 to 58,800)
        btc_candles = self._make_candles("BTC/USDT", [60000.0, 59500.0, 59100.0, 58900.0, 58800.0])
        # SOL pumps by +3.5% (from 140.0 to 144.9)
        sol_candles = self._make_candles("SOL/USDT", [140.0, 141.0, 142.5, 143.8, 144.9])

        res = self.engine.check_altcoin_btc_decoupling("SOL/USDT", sol_candles, btc_candles, lookback_periods=4)
        self.assertTrue(res.is_divergent)
        self.assertEqual(res.divergence_type, DivergenceType.ALTCOIN_DECOUPLING)
        self.assertIn("Inverse Decoupling", res.details)

    def test_altcoin_correlated_ignored(self):
        # Both drop in sync: BTC drops -2.0%, SOL drops -2.2%
        btc_candles = self._make_candles("BTC/USDT", [60000.0, 59500.0, 59100.0, 58900.0, 58800.0])
        sol_candles = self._make_candles("SOL/USDT", [140.0, 139.0, 138.0, 137.5, 136.9])

        res = self.engine.check_altcoin_btc_decoupling("SOL/USDT", sol_candles, btc_candles, lookback_periods=4)
        self.assertFalse(res.is_divergent)

if __name__ == "__main__":
    unittest.main()
