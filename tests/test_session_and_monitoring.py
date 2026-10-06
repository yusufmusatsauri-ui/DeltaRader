import unittest
from datetime import datetime, timezone
import time
from deltaradar.session import (
    MarketSessionTracker,
    OffHoursDriftDetector,
    QuietHoursManager,
    HealthWatchdog,
    generate_morning_digest,
)

class TestSessionAndMonitoring(unittest.TestCase):
    def test_crypto_is_always_open(self):
        tracker = MarketSessionTracker()
        session = tracker.get_market_session("altcoin", "SOL/USDT")
        self.assertTrue(session["is_open"])
        self.assertEqual(session["status_label"], "24/7 Crypto Open")
        self.assertFalse(session["off_hours"])

    def test_us_stock_rth_vs_closed(self):
        tracker = MarketSessionTracker()
        # Tuesday 14:00 UTC = 10:00 EDT (Regular Trading Hours)
        dt_rth = datetime(2026, 9, 22, 14, 0, tzinfo=timezone.utc)
        s_rth = tracker.get_market_session("tokenized_stock", "TSLA/USD", dt_rth)
        self.assertTrue(s_rth["is_open"])
        self.assertEqual(s_rth["status_label"], "US Market Open")
        self.assertFalse(s_rth["off_hours"])

        # Tuesday 02:00 UTC = 22:00 EDT prior evening (Overnight Closed)
        dt_closed = datetime(2026, 9, 22, 2, 0, tzinfo=timezone.utc)
        s_closed = tracker.get_market_session("tokenized_stock", "TSLA/USD", dt_closed)
        self.assertFalse(s_closed["is_open"])
        self.assertEqual(s_closed["status_label"], "US Market Closed")
        self.assertTrue(s_closed["off_hours"])

    def test_off_hours_drift_detection(self):
        detector = OffHoursDriftDetector(min_drift_pct=1.5)
        
        # When market is closed, TSLA at $226.40 vs last close $220.12 is +2.85% drift
        closed_session = {"off_hours": True, "status_label": "US Market Closed"}
        drift = detector.check_drift("TSLA/USD", 226.40, closed_session)
        self.assertTrue(drift["is_drift"])
        self.assertGreater(abs(drift["drift_pct"]), 1.5)
        self.assertIn("Off-Hours Drift", drift["note"])

        # Normal small move (0.4%) should not trigger unusual drift
        small_drift = detector.check_drift("TSLA/USD", 221.00, closed_session)
        self.assertFalse(small_drift["is_drift"])

        # When market is open (regular session), off-hours drift is not applicable
        open_session = {"off_hours": False, "status_label": "US Market Open"}
        rth_drift = detector.check_drift("TSLA/USD", 226.40, open_session)
        self.assertFalse(rth_drift["is_drift"])

    def test_quiet_hours_filter_and_queueing(self):
        mgr = QuietHoursManager(
            enabled=True,
            start_utc="23:00",
            end_utc="07:00",
            min_confidence=75,
        )

        # 02:00 UTC is inside quiet hours
        dt_night = datetime(2026, 9, 24, 2, 0, tzinfo=timezone.utc)
        self.assertTrue(mgr.is_in_quiet_hours(dt_night))

        # High confidence alert (score 82 >= 75) should be dispatched immediately
        high_alert = {"symbol": "SOL/USDT", "confidence": 82, "triggers": ["Volume Spike"]}
        should_send, reason = mgr.evaluate_alert(high_alert, dt_night)
        self.assertTrue(should_send)
        self.assertIn("quiet_hours_high_conviction", reason)
        self.assertEqual(len(mgr.get_queued()), 0)

        # Low confidence alert (score 64 < 75) should be queued
        low_alert = {"symbol": "DOGE/USDT", "confidence": 64, "triggers": ["Breakout High"]}
        should_send_low, reason_low = mgr.evaluate_alert(low_alert, dt_night)
        self.assertFalse(should_send_low)
        self.assertIn("queued_for_morning_digest", reason_low)
        self.assertEqual(len(mgr.get_queued()), 1)

        # Releasing queue clears it and returns items
        released = mgr.release_queue()
        self.assertEqual(len(released), 1)
        self.assertEqual(released[0]["symbol"], "DOGE/USDT")
        self.assertEqual(len(mgr.get_queued()), 0)

    def test_health_watchdog_and_feed_silence(self):
        watchdog = HealthWatchdog(silence_threshold_sec=300)
        watchdog.record_tick("bitget_ws")
        status = watchdog.get_status()

        self.assertIn("uptime_str", status)
        self.assertEqual(status["service_status"], "healthy")
        self.assertFalse(status["silence_alarms"])

        # Simulate silent feed (> 300s)
        watchdog.feed_heartbeats["forex_gold"] = time.time() - 360 # 6 mins ago
        alarms = watchdog.check_silence()
        self.assertEqual(len(alarms), 1)
        self.assertEqual(alarms[0]["feed"], "forex_gold")
        self.assertIn("FEED SILENCE", alarms[0]["message"])

    def test_morning_digest_formatting(self):
        queued = [{"symbol": "NEAR/USDT", "price": 5.12, "pct_move": 2.9, "confidence": 68, "triggers": ["Volume Spike"]}]
        movers = [{"symbol": "SUI/USDT", "price": 2.18, "change_24h": 11.8}]
        positions = [{"symbol": "SOL/USDT", "entry_price": 116.5, "current_price": 114.83, "pnl_pct": 1.43, "r_multiple": 0.73, "status": "open"}]

        digest = generate_morning_digest(queued, movers, positions)
        self.assertIn("DELTARADAR MORNING DESK DIGEST", digest)
        self.assertIn("NEAR/USDT", digest)
        self.assertIn("SUI/USDT", digest)
        self.assertIn("SOL/USDT", digest)
        self.assertIn("US Equities", digest)

if __name__ == "__main__":
    unittest.main()
