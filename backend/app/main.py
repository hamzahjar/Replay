from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.base import Base
from app.database.session import engine
from app.models import Conversation, ImportJob, Message, User
from app.routers.auth import router as auth_router
from app.routers.conversations import router as conversations_router
from app.routers.imports import router as imports_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    yield


app = FastAPI(
    title="Replay API",
    description="Backend API for Replay.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"^chrome-extension://.*$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(imports_router)
app.include_router(conversations_router)


@app.get("/")
def root() -> dict[str, str]:
    return {"message": "Replay API is running."}
