import os
from urllib.parse import unquote
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv()

# The DATABASE_URL in .env may contain URL-encoded characters like %26 (&), %23 (#), %3F (?)
# psycopg2 does NOT auto-decode these, so we decode manually here.
raw_url = os.getenv("DATABASE_URL", "")
SQLALCHEMY_DATABASE_URL = unquote(raw_url)

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    pool_pre_ping=True,        # Auto-reconnect if connection drops
    pool_size=5,
    max_overflow=10,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()
