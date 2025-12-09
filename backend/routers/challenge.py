from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session
from database import get_session
from routers.auth import get_current_user
from models.challenge import Challenge
from schemas.challenge import AttemptCreate, AttemptRead, ChallengeCreate, ProgressCreate, ProgressRead, UserStatsRead, LeaderboardEntry
from crud.challenge import (
    create_challenge,
    delete_attempt,
    delete_challenge,
    get_all_challenges,
    get_attempt,
    get_challenge_by_id,
    mark_challenge_complete,
    save_attempt,
    get_user_progress,
    get_user_stats,
    get_leaderboard,
)

router = APIRouter(prefix="/challenges", tags=["challenges"])

@router.post("/", summary="Create new challenge")
def create_challenge_endpoint(
    body: ChallengeCreate,
    session: Session = Depends(get_session),
):
    return create_challenge(session, body)

@router.get("/", summary="List all challenges")
def list_challenges(session: Session = Depends(get_session)):
    return get_all_challenges(session)

@router.get("/by-workspace/{workspace_type}", summary="Get challenges by workspace type")
def get_challenges_by_workspace(
    workspace_type: str,
    session: Session = Depends(get_session)
):
    challenges = session.query(Challenge).filter(
        Challenge.workspace_type == workspace_type
    ).order_by(Challenge.difficulty).all()
    return challenges

@router.get("/progress", response_model=ProgressRead, summary="Get user's progress")
def get_progress_endpoint(
    session: Session = Depends(get_session),
    user = Depends(get_current_user)
):
    completed = get_user_progress(session, user.id)
    return ProgressRead(completed=completed)

@router.get("/stats", summary="Get user's challenge stats")
def get_stats_endpoint(
    session: Session = Depends(get_session),
    user = Depends(get_current_user)
):
    return get_user_stats(session, user.id)

@router.get("/leaderboard/top", summary="Get top 10 leaderboard", response_model=list[LeaderboardEntry])
def get_leaderboard_endpoint(
    session: Session = Depends(get_session),
    limit: int = 10
):
    return get_leaderboard(session, limit)

@router.post("/complete/{challenge_id}", status_code=status.HTTP_200_OK, summary="Mark challenge complete")
def mark_complete_endpoint(
    challenge_id: int,
    session: Session = Depends(get_session),
    user = Depends(get_current_user)
):
    from crud.challenge import get_challenge_by_id

    challenge = get_challenge_by_id(session, challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    result = mark_challenge_complete(session, user.id, challenge_id)
    return result

@router.post("/attempt", response_model=AttemptRead, status_code=status.HTTP_201_CREATED)
def save_attempt_endpoint(
    body: AttemptCreate,
    session: Session = Depends(get_session),
    user = Depends(get_current_user)
):
    attempt = save_attempt(session, user.id, body.challenge_id, body.data)
    return attempt

@router.get("/attempt/{challenge_id}", response_model=AttemptRead)
def get_attempt_endpoint(
    challenge_id: int,
    session: Session = Depends(get_session),
    user = Depends(get_current_user)
):
    attempt = get_attempt(session, user.id, challenge_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return attempt

@router.delete("/attempt/{challenge_id}", status_code=status.HTTP_200_OK)
def delete_attempt_endpoint(
    challenge_id: int,
    session: Session = Depends(get_session),
    user = Depends(get_current_user)
):
    ok = delete_attempt(session, user.id, challenge_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Attempt not found")
    return {"deleted": True}

@router.get("/{challenge_id}", summary="Get challenge by ID")
def get_challenge_endpoint(
    challenge_id: int,
    session: Session = Depends(get_session)
):
    challenge = get_challenge_by_id(session, challenge_id)
    if not challenge:
        raise HTTPException(404, "Challenge not found")
    return challenge

@router.delete("/{challenge_id}", summary="Delete challenge")
def delete_challenge_endpoint(
    challenge_id: int,
    session: Session = Depends(get_session),
):
    deleted = delete_challenge(session, challenge_id)
    if not deleted:
        raise HTTPException(404, "Challenge not found")
    return {"deleted": challenge_id}
