import time
import uuid
import logging
from fastapi import Request, Response, HTTPException
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
try:
    from shared.logger import get_logger
except ImportError:
    from .logger import get_logger

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, service_name: str):
        super().__init__(app)
        self.logger = get_logger(service_name)
        self.service_name = service_name

    async def dispatch(self, request: Request, call_next) -> Response:
        correlation_id = request.headers.get("X-Correlation-ID") or f"corr-{uuid.uuid4().hex[:8]}"
        request.state.correlation_id = correlation_id
        
        start_time = time.time()
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path
        method = request.method

        self.logger.info(f"[{correlation_id}] INCOMING {method} {path} | Client IP: {client_ip}")

        try:
            response = await call_next(request)
            process_time = (time.time() - start_time) * 1000
            status_code = response.status_code

            response.headers["X-Correlation-ID"] = correlation_id
            response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"

            log_msg = f"[{correlation_id}] COMPLETED {method} {path} | Status: {status_code} | Latency: {process_time:.2f}ms"
            if status_code >= 400:
                self.logger.warning(log_msg)
            else:
                self.logger.info(log_msg)

            return response
        except (HTTPException, StarletteHTTPException) as http_exc:
            process_time = (time.time() - start_time) * 1000
            self.logger.warning(f"[{correlation_id}] HTTP {http_exc.status_code} {method} {path} | Detail: {http_exc.detail} | Latency: {process_time:.2f}ms")
            raise http_exc
        except Exception as exc:
            process_time = (time.time() - start_time) * 1000
            self.logger.error(f"[{correlation_id}] FAILED {method} {path} | Error: {str(exc)} | Latency: {process_time:.2f}ms", exc_info=True)
            raise exc
