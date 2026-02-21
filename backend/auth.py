from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
import bcrypt
import secrets
import os

security = HTTPBasic()

ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
_admin_password = os.getenv("ADMIN_PASSWORD", "avhub2024").encode("utf-8")
ADMIN_PASSWORD_HASH = bcrypt.hashpw(_admin_password, bcrypt.gensalt())


def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    correct_password = bcrypt.checkpw(
        credentials.password.encode("utf-8"), ADMIN_PASSWORD_HASH
    )
    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username
