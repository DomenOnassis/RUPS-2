from sqlmodel import Session, select
from models.user import User
from database import engine
from core.security import get_password_hash, verify_password

def create_user(user_in):
    with Session(engine) as session:
        user = User(username=user_in.username, email=user_in.email, hashed_password=get_password_hash(user_in.password))
        session.add(user)
        session.commit()
        session.refresh(user)
        return user

def get_user_by_username(username: str):
    with Session(engine) as session:
        statement = select(User).where(User.username == username)
        result = session.exec(statement).first()
        return result

def get_user_by_email(email: str):
    with Session(engine) as session:
        statement = select(User).where(User.email == email)
        result = session.exec(statement).first()
        return result

def authenticate_user(username: str, password: str):
    user = get_user_by_username(username)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user