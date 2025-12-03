from sqlmodel import SQLModel

class UserCreate(SQLModel):
    email: str
    password: str
    name: str | None = None

class UserRead(SQLModel):
    id: int
    email: str
    name: str | None = None
    is_active: bool

class Token(SQLModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(SQLModel):
    email: str | None = None