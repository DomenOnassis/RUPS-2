from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import challenge
from routers import auth, circuit
from database import create_db_and_tables
import uvicorn


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_db_and_tables()


app.include_router(auth.router)
app.include_router(circuit.router)
app.include_router(challenge.router)


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)