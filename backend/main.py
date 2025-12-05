from fastapi import FastAPI
from routers import challenge
from routers import auth, circuit
from database import create_db_and_tables


app = FastAPI()


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


app.include_router(auth.router)
app.include_router(circuit.router)
app.include_router(challenge.router)