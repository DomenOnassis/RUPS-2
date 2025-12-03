from fastapi import FastAPI
from routers import auth
from database import create_db_and_tables


app = FastAPI()


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


app.include_router(auth.router)