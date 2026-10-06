import logging
import sys
from typing import Any

import structlog


def use_json_logs(environment: str) -> bool:
    """Human-friendly console output only for local runs in a real terminal; JSON everywhere
    else (containers, CI, production) so log collectors get one parseable object per line."""
    return environment != "local" or not sys.stdout.isatty()


def configure_logging(level: str = "INFO", *, json: bool = True) -> None:
    """Structured logs to stdout. Request-scoped fields (request_id) come from contextvars."""
    shared: list[Any] = [
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso", utc=True),
    ]
    renderer: Any = structlog.processors.JSONRenderer() if json else structlog.dev.ConsoleRenderer()
    structlog.configure(
        processors=[*shared, structlog.processors.format_exc_info, renderer],
        wrapper_class=structlog.make_filtering_bound_logger(logging.getLevelName(level)),
        logger_factory=structlog.PrintLoggerFactory(sys.stdout),
        cache_logger_on_first_use=True,
    )
    # uvicorn's own access log duplicates our request log; keep its error log.
    logging.getLogger("uvicorn.access").disabled = True


def get_logger(name: str) -> structlog.stdlib.BoundLogger:
    logger: structlog.stdlib.BoundLogger = structlog.get_logger(name)
    return logger
