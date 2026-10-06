import unittest
import time
from deltaradar.ingest.bitget_adapter import BitgetAdapter
from deltaradar.chart_generator import render_candlestick_chart_svg, get_chart_data_uri
from deltaradar.models import Candle, Alert, AssetClass, ConfidenceBreakdown, HumanDecision

class TestBitgetAndChart(unittest.TestCase):
    def setUp(self):
        self.adapter = BitgetAdapter(fallback_polling_interval=5.0)

    def test_bitget_granularity_mapping(self):
        # Bitget API requires exact verified granularity strings
        self.assertEqual(self.adapter.GRANULARITY_MAP["1m"], "1min")
        self.assertEqual(self.adapter.GRANULARITY_MAP["5m"], "5min")
        self.assertEqual(self.adapter.GRANULARITY_MAP["15m"], "15min")
        self.assertEqual(self.adapter.GRANULARITY_MAP["1h"], "1h")
        self.assertEqual(self.adapter.GRANULARITY_MAP["4h"], "4h")
        self.assertEqual(self.adapter.GRANULARITY_MAP["1d"], "1day")

    def test_bitget_pair_listing_and_sources(self):
        # Altcoins listed on Bitget
        self.assertTrue(self.adapter.is_pair_listed("SOL/USDT"))
        self.assertTrue(self.adapter.is_pair_listed("ETH/USDT"))
        self.assertTrue(self.adapter.is_pair_listed("SUI/USDT"))
        self.assertEqual(self.adapter.get_source_label("SOL/USDT"), "Bitget (Direct WS/REST)")

        # Forex/Gold fallback adapter
        self.assertFalse(self.adapter.is_pair_listed("XAUUSD"))
        self.assertIn("FX / Commodities", self.adapter.get_source_label("XAUUSD"))

        # Tokenized equities fallback adapter
        self.assertFalse(self.adapter.is_pair_listed("TSLA/USD"))
        self.assertIn("NASDAQ", self.adapter.get_source_label("TSLA/USD"))

    def test_bitget_market_url(self):
        url = self.adapter.get_market_url("SOL/USDT")
        self.assertEqual(url, "https://www.bitget.com/spot/SOLUSDT")

    def test_ws_subscription_payload(self):
        payload = self.adapter.build_ws_subscription_payload(["SOL/USDT", "ETH/USDT"])
        self.assertEqual(payload["op"], "subscribe")
        self.assertGreater(len(payload["args"]), 0)
        channels = [a["channel"] for a in payload["args"]]
        self.assertIn("ticker", channels)
        self.assertIn("candle5m", channels)
        self.assertIn("trade", channels)
        self.assertEqual(payload["args"][0]["instType"], "SPOT")

    def test_candlestick_chart_svg_rendering(self):
        candles = [
            Candle(
                symbol="SOL/USDT",
                timestamp=time.time() - (i * 300),
                open=145.0 + (i * 0.4),
                high=147.0 + (i * 0.4),
                low=144.5 + (i * 0.4),
                close=146.5 + (i * 0.4),
                volume=1200.0 + (i * 100),
                period="5m",
            )
            for i in range(25)
        ]
        svg = render_candlestick_chart_svg(
            candles=candles,
            symbol="SOL/USDT",
            period="5m",
            trigger_index=24,
            breakout_level=152.0,
            support_level=144.0,
            resistance_level=158.0,
            source_label="Bitget (Direct WS/REST)",
        )
        self.assertTrue(svg.strip().startswith("<svg"))
        self.assertTrue(svg.strip().endswith("</svg>"))
        self.assertIn("TRIGGER CANDLE", svg)
        self.assertIn("Breakout Pivot", svg)
        self.assertIn("Support", svg)
        self.assertIn("Resistance", svg)
        self.assertIn("VOL BARS", svg)
        self.assertIn("Bitget (Direct WS/REST)", svg)
        self.assertIn("bitget.com/spot/SOLUSDT", svg)

        # Test Data URI conversion
        data_uri = get_chart_data_uri(svg)
        self.assertTrue(data_uri.startswith("data:image/svg+xml;base64,"))
