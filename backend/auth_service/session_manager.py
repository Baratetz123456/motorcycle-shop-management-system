import json
import uuid
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import redis.asyncio as redis

REDIS_URL = os.getenv("REDIS_URL", "redis://redis:6379")
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# Session configurations:
# - IDLE_TIMEOUT_SECONDS: Inactivity timeout (30 minutes)
# - ABSOLUTE_TIMEOUT_SECONDS: Maximum total session duration (8 hours)
IDLE_TIMEOUT_SECONDS = 30 * 60
ABSOLUTE_TIMEOUT_SECONDS = 8 * 3600

class SessionManager:
    @staticmethod
    async def create_session(user_id: str, role: str, email: str, user_agent: str = "", ip: str = "") -> Dict[str, str]:
        """
        Creates a new server-side session in Redis with dual timeouts:
        1. Idle sliding expiration (30 minutes)
        2. Absolute ceiling (8 hours from creation)
        """
        session_id = str(uuid.uuid4())
        refresh_jti = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        absolute_expiry = now + timedelta(seconds=ABSOLUTE_TIMEOUT_SECONDS)

        session_data = {
            "session_id": session_id,
            "user_id": user_id,
            "role": role,
            "email": email,
            "current_jti": refresh_jti,
            "created_at": now.isoformat(),
            "last_active_at": now.isoformat(),
            "absolute_expiry": absolute_expiry.isoformat(),
            "user_agent": user_agent,
            "ip": ip
        }

        # Session key with idle TTL
        await redis_client.set(f"session:{session_id}", json.dumps(session_data), ex=IDLE_TIMEOUT_SECONDS)
        # JTI mapping for O(1) validation and reuse detection
        await redis_client.set(f"refresh_jti:{refresh_jti}", session_id, ex=IDLE_TIMEOUT_SECONDS)

        return {
            "session_id": session_id,
            "refresh_jti": refresh_jti
        }

    @staticmethod
    async def rotate_refresh_token(session_id: str, refresh_jti: str, ip: str = "") -> Optional[Dict[str, Any]]:
        """
        Validates the refresh token JTI, enforces idle and absolute timeouts,
        rotates the JTI (invalidating the used one), and resets the idle sliding window.
        """
        mapped_session_id = await redis_client.get(f"refresh_jti:{refresh_jti}")
        if not mapped_session_id or mapped_session_id != session_id:
            # Token reuse detected or token already invalidated! Invalidate whole session.
            await SessionManager.terminate_session(session_id)
            return None

        raw_session = await redis_client.get(f"session:{session_id}")
        if not raw_session:
            return None

        session = json.loads(raw_session)
        now = datetime.now(timezone.utc)
        abs_exp = datetime.fromisoformat(session["absolute_expiry"])

        # Enforce absolute 8-hour maximum lifetime
        if now >= abs_exp:
            await SessionManager.terminate_session(session_id)
            return None

        # Revoke the used refresh JTI immediately
        await redis_client.delete(f"refresh_jti:{refresh_jti}")

        # Issue new JTI for token rotation
        new_jti = str(uuid.uuid4())
        session["current_jti"] = new_jti
        session["last_active_at"] = now.isoformat()
        if ip:
            session["ip"] = ip

        # Ensure new idle TTL does not exceed the remaining absolute ceiling
        remaining_abs_seconds = int((abs_exp - now).total_seconds())
        new_idle_ttl = min(IDLE_TIMEOUT_SECONDS, remaining_abs_seconds)
        if new_idle_ttl <= 0:
            await SessionManager.terminate_session(session_id)
            return None

        await redis_client.set(f"session:{session_id}", json.dumps(session), ex=new_idle_ttl)
        await redis_client.set(f"refresh_jti:{new_jti}", session_id, ex=new_idle_ttl)

        return {
            "session_id": session_id,
            "new_jti": new_jti,
            "user_id": session["user_id"],
            "role": session["role"],
            "email": session["email"]
        }

    @staticmethod
    async def terminate_session(session_id: str):
        """
        Terminates the session and revokes its active refresh JTI.
        """
        raw_session = await redis_client.get(f"session:{session_id}")
        if raw_session:
            try:
                session = json.loads(raw_session)
                current_jti = session.get("current_jti")
                if current_jti:
                    await redis_client.delete(f"refresh_jti:{current_jti}")
            except Exception:
                pass
        await redis_client.delete(f"session:{session_id}")
