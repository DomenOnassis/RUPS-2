from sqlmodel import JSON, Column, SQLModel, Field, Relationship
from typing import Optional, List

class Challenge(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    description: str
    workspace_type: str
    difficulty: int 
    requirements: dict = Field(sa_column=Column(JSON))


class ChallengeProgress(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    challenge_id: int
    completed: bool = False
    completion_count: int = Field(default=0)
    points_earned: int = Field(default=0)


class ChallengeAttempt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    challenge_id: int
    data: dict = Field(sa_column=Column(JSON))
