import os
import sys
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
from dotenv import load_dotenv

# 1. Add the backend directory to Python's path so it can find our 'app' folder
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 2. Import our Database Base and our Models
from app.db.database import Base
from app.models import models

# 3. Load environment variables
load_dotenv()

config = context.config

# 4. Point Alembic dynamically to our SQLite file in the .env
config.set_main_option("sqlalchemy.url", os.getenv("DATABASE_URL").replace("%", "%%"))

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 5. Tell Alembic to read our Models
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
