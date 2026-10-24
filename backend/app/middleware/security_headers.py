import uuid

class SecurityHeadersMiddleware:
    """
    Pure ASGI middleware for maximum performance, streaming compatibility,
    and rock-solid async execution without BaseHTTPMiddleware thread deadlocks.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = str(uuid.uuid4())
        for k, v in scope.get("headers", []):
            if k.lower() == b"x-request-id":
                try:
                    request_id = v.decode("latin1")
                except Exception:
                    pass
                break

        if "state" not in scope:
            scope["state"] = {}
        scope["state"]["request_id"] = request_id

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode("latin1")))
                headers.append((b"x-content-type-options", b"nosniff"))
                headers.append((b"x-frame-options", b"DENY"))
                headers.append((b"x-xss-protection", b"1; mode=block"))
                headers.append((b"referrer-policy", b"strict-origin-when-cross-origin"))
                headers.append((b"permissions-policy", b"camera=(), microphone=(), geolocation=()"))
                path = scope.get("path", "")
                if "/api/v1/documents" in path or "/api/v1/admin" in path:
                    headers.append((b"cache-control", b"no-store, no-cache, must-revalidate, private"))
                    headers.append((b"pragma", b"no-cache"))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)
