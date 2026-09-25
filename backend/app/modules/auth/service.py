import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, delete, update
from app.modules.auth.models import UserSession, RevokedToken

IDLE_TIMEOUT_SECONDS = 30 * 60        # 30 minutes
ABSOLUTE_TIMEOUT_SECONDS = 8 * 3600    # 8 hours

class PostgresSessionManager:
    @staticmethod
    async def create_session(
        session: AsyncSession,
        user_id: UUID,
        role: str,
        email: str,
        user_agent: str = "",
        ip: str = ""
    ) -> Dict[str, str]:
        session_id = uuid.uuid4()
        refresh_jti = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        absolute_expiry = now + timedelta(seconds=ABSOLUTE_TIMEOUT_SECONDS)

        new_session = UserSession(
            session_id=session_id,
            user_id=user_id,
            role=role,
            email=email,
            current_jti=refresh_jti,
            created_at=now,
            last_active_at=now,
            absolute_expiry=absolute_expiry,
            user_agent=user_agent[:500] if user_agent else "",
            ip=ip[:45] if ip else ""
        )
        session.add(new_session)
        await session.commit()

        return {
            "session_id": str(session_id),
            "refresh_jti": refresh_jti
        }

    @staticmethod
    async def rotate_refresh_token(
        session: AsyncSession,
        session_id_str: str,
        refresh_jti: str,
        ip: str = ""
    ) -> Optional[Dict[str, Any]]:
        try:
            session_uuid = UUID(session_id_str)
        except ValueError:
            return None

        # Look up active session
        query = text("""
            SELECT session_id, user_id, role, email, current_jti, created_at, last_active_at, absolute_expiry
            FROM auth.user_sessions
            WHERE session_id = :session_id
        """)
        res = await session.execute(query, {"session_id": session_uuid})
        user_sess = res.first()
        if not user_sess:
            return None

        sid, uid, role, email, cur_jti, created_at, last_active, abs_exp = user_sess

        now = datetime.now(timezone.utc)
        if abs_exp.tzinfo is None:
            abs_exp = abs_exp.replace(tzinfo=timezone.utc)

        # Reuse detection with 15-second grace window for concurrent requests / StrictMode
        if cur_jti != refresh_jti:
            check_revoked = await session.execute(
                text("SELECT revoked_at FROM auth.revoked_tokens WHERE token_jti = :jti AND user_id = :uid"),
                {"jti": refresh_jti, "uid": uid}
            )
            rev_row = check_revoked.first()
            if rev_row and rev_row[0]:
                rev_at = rev_row[0]
                if rev_at.tzinfo is None:
                    rev_at = rev_at.replace(tzinfo=timezone.utc)
                if (now - rev_at).total_seconds() <= 15:
                    # Within 15-second concurrency grace window: return current session state
                    return {
                        "session_id": session_id_str,
                        "new_jti": cur_jti,
                        "user_id": str(uid),
                        "role": role,
                        "email": email
                    }
            # Outside grace window -> true replay attack! Terminate immediately.
            await PostgresSessionManager.terminate_session(session, session_id_str)
            return None

        # Enforce 8-hour absolute maximum lifetime
        if now >= abs_exp:
            await PostgresSessionManager.terminate_session(session, session_id_str)
            return None

        # Enforce 30-minute idle sliding window
        if last_active.tzinfo is None:
            last_active = last_active.replace(tzinfo=timezone.utc)
        if (now - last_active).total_seconds() > IDLE_TIMEOUT_SECONDS:
            await PostgresSessionManager.terminate_session(session, session_id_str)
            return None

        # Add old JTI to revoked_tokens
        revoked = RevokedToken(
            token_jti=refresh_jti,
            user_id=uid,
            expires_at=abs_exp
        )
        session.add(revoked)

        # Issue new JTI
        new_jti = str(uuid.uuid4())
        update_query = text("""
            UPDATE auth.user_sessions
            SET current_jti = :new_jti, last_active_at = :now, ip = :ip
            WHERE session_id = :session_id
        """)
        await session.execute(
            update_query,
            {
                "new_jti": new_jti,
                "now": now,
                "ip": ip[:45] if ip else "",
                "session_id": session_uuid
            }
        )
        await session.commit()

        return {
            "session_id": session_id_str,
            "new_jti": new_jti,
            "user_id": str(uid),
            "role": role,
            "email": email
        }

    @staticmethod
    async def terminate_session(session: AsyncSession, session_id_str: str):
        try:
            session_uuid = UUID(session_id_str)
            del_stmt = text("DELETE FROM auth.user_sessions WHERE session_id = :session_id")
            await session.execute(del_stmt, {"session_id": session_uuid})
            await session.commit()
        except Exception:
            pass

    @staticmethod
    async def revoke_all_user_sessions(session: AsyncSession, user_id: UUID):
        try:
            del_stmt = text("DELETE FROM auth.user_sessions WHERE user_id = :user_id")
            await session.execute(del_stmt, {"user_id": user_id})
            await session.commit()
        except Exception:
            pass
