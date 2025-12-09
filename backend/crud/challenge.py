from typing import List, Optional, Dict
from sqlmodel import Session, select
from schemas.challenge import ChallengeCreate
from models.challenge import Challenge, ChallengeAttempt, ChallengeProgress
from models.user import User


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
    # Get challenge difficulty for points calculation
    challenge = get_challenge_by_id(session, challenge_id)
    if not challenge:
        return None
    
    statement = select(ChallengeProgress).where(
        (ChallengeProgress.user_id == user_id) & (ChallengeProgress.challenge_id == challenge_id)
    )
    existing = session.exec(statement).first()
    if existing:
        existing.completed = True
        # Increment completion count first
        existing.completion_count = (existing.completion_count or 0) + 1
        # Calculate diminishing points: (difficulty * 50) / completion_count
        points_to_add = int((challenge.difficulty * 50) / existing.completion_count)
        existing.points_earned = (existing.points_earned or 0) + points_to_add
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return {"progress": existing, "points_awarded": points_to_add}
    
    # First completion gets full points
    points_to_add = challenge.difficulty * 50
    p = ChallengeProgress(
        user_id=user_id, 
        challenge_id=challenge_id, 
        completed=True,
        completion_count=1,
        points_earned=points_to_add
    )
    session.add(p)
    session.commit()
    session.refresh(p)
    return {"progress": p, "points_awarded": points_to_add}


def get_user_progress(session: Session, user_id: int) -> List[int]:
    results = session.exec(select(ChallengeProgress).where(ChallengeProgress.user_id == user_id)).all()
    completed = [r.challenge_id for r in results if getattr(r, "completed", False)]
    return completed


def get_user_stats(session: Session, user_id: int) -> Dict:
    results = session.exec(select(ChallengeProgress).where(ChallengeProgress.user_id == user_id)).all()
    
    total_points = 0
    challenges_completed = 0
    challenge_stats = {}
    
    for r in results:
        if r.completed:
            challenges_completed += 1
        total_points += r.points_earned or 0
        challenge_stats[r.challenge_id] = {
            "challenge_id": r.challenge_id,
            "completion_count": r.completion_count or 0,
            "points_earned": r.points_earned or 0
        }
    
    return {
        "total_points": total_points,
        "challenges_completed": challenges_completed,
        "challenge_stats": challenge_stats
    }


def get_leaderboard(session: Session, limit: int = 10) -> List[Dict]:
    # Get all users
    users = session.exec(select(User)).all()
    
    leaderboard = []
    for user in users:
        progress_list = session.exec(
            select(ChallengeProgress).where(ChallengeProgress.user_id == user.id)
        ).all()
        
        total_points = sum(p.points_earned or 0 for p in progress_list)
        challenges_completed = len([p for p in progress_list if p.completed])
        
        leaderboard.append({
            "username": user.username,
            "total_points": total_points,
            "challenges_completed": challenges_completed
        })
    
    # Sort by total points descending
    leaderboard.sort(key=lambda x: x["total_points"], reverse=True)
    
    return leaderboard[:limit]
