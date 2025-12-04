from sqlmodel import SQLModel, Field, Column, JSON
from typing import Optional

class Circuit(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int
    name: str
    data: dict = Field(sa_column=Column(JSON))
