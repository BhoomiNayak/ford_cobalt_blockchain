"""
Simple in-memory rate limiting middleware.
"""
import time
from collections import defaultdict
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.rpm = requests_per_minute
        self.window = 60
        self._counts: dict = defaultdict(list)

    async def dispatch(self, request: Request, call_next) -> Response:
        ip = request.client.host
        now = time.time()
        window_start = now - self.window

        self._counts[ip] = [t for t in self._counts[ip] if t > window_start]

        if len(self._counts[ip]) >= self.rpm:
            return Response(
                content='{"detail":"Rate limit exceeded"}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": "60"},
            )

        self._counts[ip].append(now)
        return await call_next(request)
