from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.models import User, UserRole
from app.auth.auth_utils import decode_access_token, oauth2_scheme


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Reads the JWT token, finds the user in the database, and returns them."""
    payload = decode_access_token(token)
    email: str = payload.get("sub")
    
    if email is None:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user


def require_role(*allowed_roles: UserRole):
    """
    Role-based access control.
    Usage: Depends(require_role(UserRole.ADMIN, UserRole.FLEET_MANAGER))
    Only users with those roles can access the endpoint.
    """
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {[r.value for r in allowed_roles]}",
            )
        return current_user
    return role_checker

