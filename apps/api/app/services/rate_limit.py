import time
from collections import deque
from threading import Lock


class SlidingWindowLimiter:
    """In-process sliding-window limiter for login attempts.

    Scope note: correct for a single API instance. With several replicas the counters must
    live in a shared store (Redis) or at the gateway; that swap is behind this interface.
    """

    def __init__(self, max_events: int, window_seconds: float) -> None:
        self._max = max_events
        self._window = window_seconds
        self._events: dict[str, deque[float]] = {}
        self._lock = Lock()

    def hit(self, key: str) -> float | None:
        """Record an attempt. Returns None if allowed, else seconds until retry is allowed."""
        now = time.monotonic()
        with self._lock:
            events = self._events.setdefault(key, deque())
            while events and now - events[0] > self._window:
                events.popleft()
            if len(events) >= self._max:
                return round(self._window - (now - events[0]), 1)
            events.append(now)
            if len(self._events) > 10_000:  # bound memory under a key-spraying attack
                self._events = {k: v for k, v in self._events.items() if v}
            return None

    def reset(self, key: str) -> None:
        with self._lock:
            self._events.pop(key, None)


# Two independent budgets for sign-in attempts:
# * per client IP + e-mail: stops one client hammering one account;
# * per e-mail alone: the client IP comes from proxy headers and can be spoofed, so this
#   budget is the one an attacker cannot reset by rotating addresses. Its cost is that a
#   flood against one account can lock that account's sign-in for up to a minute.
login_limiter = SlidingWindowLimiter(max_events=5, window_seconds=60)
account_limiter = SlidingWindowLimiter(max_events=10, window_seconds=60)
