import os
import pytest
from pathlib import Path

# Configure test database file before any app imports
TEST_DB_FILE = Path(__file__).parent / "test_trustvault.db"
if TEST_DB_FILE.exists():
    try:
        TEST_DB_FILE.unlink()
    except Exception:
        pass

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_FILE.resolve()}"
os.environ["SECRET_KEY"] = "test-secret-key-for-unit-tests-32bytes"

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from backend.app.core.config import settings
from backend.app.models.base import Base
from backend.app.models.user import User
from backend.app.core.security import hash_password
from backend.app.db.session import engine, SessionLocal, get_db
from backend.app.main import app

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if TEST_DB_FILE.exists():
        try:
            TEST_DB_FILE.unlink()
        except Exception:
            pass

@pytest.fixture(scope="function")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def create_user(db_session):
    def _create(email: str, password: str, full_name: str, role: str = "viewer"):
        norm_email = email.lower().strip()
        existing = db_session.query(User).filter(User.email == norm_email).first()
        if existing:
            return existing
        u = User(
            email=norm_email,
            hashed_password=hash_password(password),
            full_name=full_name,
            role=role,
            is_active=True
        )
        db_session.add(u)
        db_session.commit()
        db_session.refresh(u)
        return u
    return _create

@pytest.fixture
def auth_headers_and_cookies(client):
    def _login(email: str, password: str):
        res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert res.status_code == 200, f"Login failed for {email}: {res.json()}"
        session_cookie = res.cookies.get(settings.SESSION_COOKIE_NAME)
        csrf_cookie = res.cookies.get(settings.CSRF_COOKIE_NAME)
        return {
            "cookies": {
                settings.SESSION_COOKIE_NAME: session_cookie,
                settings.CSRF_COOKIE_NAME: csrf_cookie,
            },
            "headers": {
                "X-CSRF-Token": csrf_cookie or "",
                "Cookie": f"{settings.SESSION_COOKIE_NAME}={session_cookie}; {settings.CSRF_COOKIE_NAME}={csrf_cookie}"
            }
        }
    return _login
