"""
Unit Tests for DeltaRadar Anomaly Engine.
Verifies:
1. Volume spike threshold (>3x 20-period average)
2. Swing High and Swing Low Breakouts
3. Sentiment shift triggers
"""
import unittest
import time
from deltaradar.models import Candle
from deltaradar.anomaly import AnomalyDetector

class TestAnomalyDetector(unittest.TestCase):
    def setUp(self):
        self.detector = AnomalyDetector(
            volume_multiplier=3.0,
            volume_lookback=20,
            swing_lookback=20,
            min_breakout_penetration_pct=0.2,
            sentiment_threshold=0.35,
        )

    def _make_candles(self, count: int, close_prices, volumes):
        now = time.time()
        candles = []
        for i in range(count):
            c = close_prices[i] if isinstance(close_prices, list) else close_prices
            v = volumes[i] if isinstance(volumes, list) else volumes
            candles.append(Candle(
                symbol="SOL/USDT",
                timestamp=now + (i * 300),
                open=c * 0.999,
                high=c * 1.002,
                low=c * 0.998,
                close=c,
                volume=v,
                period="5m",
            ))
        return candles

    def test_volume_spike_detected(self):
        # 20 candles of 1,000 volume, then 21st candle of 3,500 volume (3.5x)
        volumes = [1000.0] * 20 + [3500.0]
        candles = self._make_candles(21, 100.0, volumes)
        
        is_spike, ratio, avg_vol = self.detector.check_volume_spike(candles)
        self.assertTrue(is_spike)
        self.assertEqual(ratio, 3.5)
        self.assertEqual(avg_vol, 1000.0)

    def test_volume_spike_below_threshold_ignored(self):
        # 20 candles of 1,000 volume, then 21st candle of 2,800 volume (2.8x < 3.0x)
        volumes = [1000.0] * 20 + [2800.0]
        candles = self._make_candles(21, 100.0, volumes)
        
        is_spike, ratio, _ = self.detector.check_volume_spike(candles)
        self.assertFalse(is_spike)
        self.assertEqual(ratio, 2.8)

    def test_bullish_breakout_swing_high(self):
        # 20 candles with highs fluctuating between 100 and 105
        prices = [100.0 + (i % 5) for i in range(20)]
        # 21st candle closes at 107.0 (exceeds swing high 105 by ~1.9%)
        prices.append(107.0)
        candles = self._make_candles(21, prices, 1000.0)
        
        is_bo, direction, level, pct_pen = self.detector.check_breakout(candles)
        self.assertTrue(is_bo)
        self.assertEqual(direction, "high")
        self.assertGreater(pct_pen, 0.2)

    def test_bearish_breakdown_swing_low(self):
        # 20 candles with lows around 95-100
        prices = [100.0 - (i % 4) for i in range(20)]
        # 21st candle closes at 93.0
        prices.append(93.0)
        candles = self._make_candles(21, prices, 1000.0)
        
        is_bo, direction, level, pct_pen = self.detector.check_breakout(candles)
        self.assertTrue(is_bo)
        self.assertEqual(direction, "low")
        self.assertGreater(pct_pen, 0.2)

    def test_sentiment_shift(self):
        # Shift of +0.40 on scale
        is_shift, delta = self.detector.check_sentiment_shift(0.55, 0.15)
        self.assertTrue(is_shift)
        self.assertEqual(delta, 0.40)

        # Shift of +0.20 below threshold (0.35)
        is_shift_small, delta_small = self.detector.check_sentiment_shift(0.35, 0.15)
        self.assertFalse(is_shift_small)

if __name__ == "__main__":
    unittest.main()
