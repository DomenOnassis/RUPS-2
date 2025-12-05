from pydantic import BaseModel
from typing import Any, Dict, List

class ChallengeCreate(BaseModel):
    title: str
    description: str

class ChallengeRead(BaseModel):
    id: int
    title: str
    description: str

class AttemptCreate(BaseModel):
    challenge_id: int
    data: Dict[str, Any]  # arbitrary JSON structure (components etc.)


class AttemptRead(BaseModel):
    id: int
    user_id: int
    challenge_id: int
    data: Dict[str, Any]

class ProgressCreate(BaseModel):
    challenge_ids: List[int]

class ProgressRead(BaseModel):
    completed: List[int]   # list of completed challenge IDs

