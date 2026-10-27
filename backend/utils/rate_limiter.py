"""
PULSO Rate Limiting Middleware & Utilities
==========================================
Provides thread-safe in-memory sliding window rate limiting for public endpoints.
Guards against automated spam, credential brute-forcing, and resource exhaustion.
"""

import time
import math
import threading
from collections import defaultdict, deque
from typing import Dict, Deque, Optional
from fastapi import Request, HTTPException, status


class SlidingWindowRateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter.
    Maintains precise timestamps of requests per client IP.
    """
    def __init__(self, max_requests: int, window_seconds: int, error_detail: str):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.error_detail = error_detail
        self.requests: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _get_client_ip(self, request: Request) -> str:
        """Extracts the client's public IP address from headers or connection."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            ip = forwarded.split(",")[0].strip()
            if ip:
                return ip
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        if request.client and request.client.host:
            return request.client.host.strip()
        return "127.0.0.1"

    def check(self, request: Request, identifier: Optional[str] = None):
        """
        Evaluates the rate limit for the incoming request IP.
        Raises HTTP 429 Too Many Requests if the limit is exceeded.
        """
        # Only callers that have authenticated the request may supply an account key.
        # Never derive quota identity from an unverified bearer-token payload.
        client_ip = f"account:{identifier}" if identifier else self._get_client_ip(request)
        now = time.time()

        with self._lock:
            timestamps = self.requests[client_ip]

            # 1. Purge expired timestamps outside the sliding window
            while timestamps and timestamps[0] <= now - self.window_seconds:
                timestamps.popleft()

            # 2. Check threshold
            if len(timestamps) >= self.max_requests:
                oldest_ts = timestamps[0]
                retry_after = math.ceil(oldest_ts + self.window_seconds - now)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=self.error_detail,
                    headers={"Retry-After": str(max(1, retry_after))}
                )

            # 3. Record new timestamp
            timestamps.append(now)

    def cleanup_inactive(self, max_idle_seconds: int = 3600):
        """Purges stale IP entries to prevent unbounded memory growth."""
        now = time.time()
        with self._lock:
            stale_keys = [
                ip for ip, ts_deque in self.requests.items()
                if not ts_deque or ts_deque[-1] < now - max_idle_seconds
            ]
            for ip in stale_keys:
                del self.requests[ip]

    def reset(self):
        """Clears all recorded timestamps (primarily for test harnesses)."""
        with self._lock:
            self.requests.clear()


# Singleton instances for route dependencies
report_submission_limiter = SlidingWindowRateLimiter(
    max_requests=5,
    window_seconds=600,  # 10 minutes
    error_detail="Too many submissions. Please wait 10 minutes before submitting another report."
)

tracking_query_limiter = SlidingWindowRateLimiter(
    max_requests=20,
    window_seconds=60,   # 1 minute
    error_detail="Too many tracking attempts. Please try again in 5 minutes."
)

claim_limiter = SlidingWindowRateLimiter(
    max_requests=10,
    window_seconds=900,  # 15 minutes
    error_detail="Too many claim attempts. Please try again in 15 minutes."
)

auth_limiter = SlidingWindowRateLimiter(
    max_requests=30,
    window_seconds=60,   # 1 minute
    error_detail="Too many authentication attempts. Please try again in 1 minute."
)

availability_check_limiter = SlidingWindowRateLimiter(
    max_requests=120,
    window_seconds=60,
    error_detail="Too many check attempts. Please slow down."
)
