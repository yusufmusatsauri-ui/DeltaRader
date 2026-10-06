"""
Base Abstract Feed Adapter for DeltaRadar.
Provides unified interface for websocket feeds, fallback polling,
rate-limit protection, and auto-reconnect backoff.
"""
from abc import ABC, abstractmethod
from typing import List, Callable, Optional, Dict, Any
import asyncio
import logging
from deltaradar.models import Candle, Trade

logger = logging.getLogger("DeltaRadar.Ingest")

class BaseFeedAdapter(ABC):
    def __init__(self, name: str, fallback_polling_interval: float = 10.0):
        self.name = name
        self.fallback_polling_interval = fallback_polling_interval
        self.is_running = False
        self.candle_callbacks: List[Callable[[Candle], None]] = []
        self.trade_callbacks: List[Callable[[Trade], None]] = []

    def on_candle(self, callback: Callable[[Candle], None]):
        self.candle_callbacks.append(callback)

    def on_trade(self, callback: Callable[[Trade], None]):
        self.trade_callbacks.append(callback)

    def emit_candle(self, candle: Candle):
        for cb in self.candle_callbacks:
            try:
                cb(candle)
            except Exception as e:
                logger.error(f"Error in candle callback ({self.name}): {e}")

    def emit_trade(self, trade: Trade):
        for cb in self.trade_callbacks:
            try:
                cb(trade)
            except Exception as e:
                logger.error(f"Error in trade callback ({self.name}): {e}")

    @abstractmethod
    async def fetch_historical_candles(self, symbol: str, limit: int = 50, period: str = "5m") -> List[Candle]:
        """Fetch historical candles via REST API."""
        pass

    @abstractmethod
    async def start(self, symbols: List[str]):
        """Start streaming or polling for symbols."""
        pass

    @abstractmethod
    async def stop(self):
        """Stop adapter gracefully."""
        pass
