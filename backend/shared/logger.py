import os
import sys
import logging
from logging.handlers import RotatingFileHandler

def get_logger(service_name: str) -> logging.Logger:
    """
    Returns a configured, structured logger instance for a given microservice.
    Logs to stdout and to a persistent log file in backend/logs/<service_name>.log.
    """
    logger = logging.getLogger(service_name)
    logger.setLevel(logging.INFO)

    if logger.handlers:
        return logger

    formatter = logging.Formatter(
        '[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

    # 1. Console Stream Handler (sys.stdout)
    stream_handler = logging.StreamHandler(sys.stdout)
    stream_handler.setFormatter(formatter)
    stream_handler.setLevel(logging.INFO)
    logger.addHandler(stream_handler)

    # 2. Rotating File Handler (logs/<service_name>.log) - Fail-safe
    try:
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'logs'))
        os.makedirs(base_dir, exist_ok=True)
        log_file_path = os.path.join(base_dir, f"{service_name}.log")

        file_handler = RotatingFileHandler(
            log_file_path,
            maxBytes=10 * 1024 * 1024, # 10MB per file
            backupCount=5,
            encoding='utf-8'
        )
        file_handler.setFormatter(formatter)
        file_handler.setLevel(logging.INFO)
        logger.addHandler(file_handler)
    except Exception:
        pass

    logger.propagate = False
    return logger
