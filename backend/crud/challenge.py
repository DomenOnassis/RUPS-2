from typing import List, Optional
from sqlmodel import Session, select
from schemas.challenge import ChallengeCreate
from models.challenge import Challenge, ChallengeAttempt, ChallengeProgress


def create_challenge(session: Session, data: ChallengeCreate):
    challenge = Challenge(**data.dict())
    session.add(challenge)
    session.commit()
    session.refresh(challenge)
    return challenge

def get_all_challenges(session: Session):
    return session.exec(select(Challenge)).all()

def get_challenge_by_id(session: Session, challenge_id: int):
    return session.exec(
        select(Challenge).where(Challenge.id == challenge_id)
    ).first()

def delete_challenge(session: Session, challenge_id: int):
    challenge = get_challenge_by_id(session, challenge_id)
    if challenge:
        session.delete(challenge)
        session.commit()
    return challenge

def save_attempt(session: Session, user_id: int, challenge_id: int, data: dict) -> ChallengeAttempt:
    statement = select(ChallengeAttempt).where(
        (ChallengeAttempt.user_id == user_id) & (ChallengeAttempt.challenge_id == challenge_id)
    )
    existing = session.exec(statement).first()
    if existing:
        existing.data = data
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    attempt = ChallengeAttempt(user_id=user_id, challenge_id=challenge_id, data=data)
    session.add(attempt)
    session.commit()
    session.refresh(attempt)
    return attempt


def get_attempt(session: Session, user_id: int, challenge_id: int) -> Optional[ChallengeAttempt]:
    statement = select(ChallengeAttempt).where(
        (ChallengeAttempt.user_id == user_id) & (ChallengeAttempt.challenge_id == challenge_id)
    )
    return session.exec(statement).first()


def delete_attempt(session: Session, user_id: int, challenge_id: int) -> bool:
    attempt = get_attempt(session, user_id, challenge_id)
    if not attempt:
        return False
    session.delete(attempt)
    session.commit()
    return True


def mark_challenge_complete(session: Session, user_id: int, challenge_id: int):
    statement = select(ChallengeProgress).where(
        (ChallengeProgress.user_id == user_id) & (ChallengeProgress.challenge_id == challenge_id)
    )
    existing = session.exec(statement).first()
    if existing:
        existing.completed = True
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing
    p = ChallengeProgress(user_id=user_id, challenge_id=challenge_id, completed=True)
    session.add(p)
    session.commit()
    session.refresh(p)
    return p


def get_user_progress(session: Session, user_id: int) -> List[int]:
    results = session.exec(select(ChallengeProgress).where(ChallengeProgress.user_id == user_id)).all()
    completed = [r.challenge_id for r in results if getattr(r, "completed", False)]
    return completed
