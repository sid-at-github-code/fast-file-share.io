from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import create_database_url, Column, String, DateTime, Integer, Boolean, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy import create_engine
import os
import secrets
import string
from datetime import datetime, timedelta
from typing import Optional
import io
import hashlib
from pydantic import BaseModel
import boto3
from botocore.exceptions import ClientError

# Database setup
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost/fileShare")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Models
class FileShare(Base):
    __tablename__ = "file_shares"
    
    id = Column(String, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    content_type = Column(String, nullable=False)
    access_key = Column(String, unique=True, index=True, nullable=False)
    download_count = Column(Integer, default=0)
    max_downloads = Column(Integer, default=10)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    file_hash = Column(String, nullable=False)
    storage_path = Column(String, nullable=False)

Base.metadata.create_all(bind=engine)

# Pydantic models
class FileUploadResponse(BaseModel):
    id: str
    access_key: str
    filename: str
    file_size: int
    expires_at: Optional[datetime]
    download_url: str

class FileInfoResponse(BaseModel):
    filename: str
    file_size: int
    content_type: str
    download_count: int
    max_downloads: int
    expires_at: Optional[datetime]
    created_at: datetime

class ShareSettings(BaseModel):
    max_downloads: Optional[int] = 10
    expires_in_hours: Optional[int] = 24

# FastAPI app
app = FastAPI(title="FileShare API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Utility functions
def generate_access_key(length: int = 12) -> str:
    """Generate a random access key"""
    characters = string.ascii_letters + string.digits
    return ''.join(secrets.choice(characters) for _ in range(length))

def generate_file_id() -> str:
    """Generate a unique file ID"""
    return secrets.token_urlsafe(16)

def calculate_file_hash(file_content: bytes) -> str:
    """Calculate SHA256 hash of file content"""
    return hashlib.sha256(file_content).hexdigest()

def save_file_to_storage(file_content: bytes, file_id: str, filename: str) -> str:
    """Save file to storage and return storage path"""
    # In production, use cloud storage like AWS S3, Google Cloud Storage, etc.
    # For now, we'll simulate with a local path
    storage_path = f"uploads/{file_id}_{filename}"
    
    # Create uploads directory if it doesn't exist
    os.makedirs("uploads", exist_ok=True)
    
    # Save file
    with open(storage_path, "wb") as f:
        f.write(file_content)
    
    return storage_path

def get_file_from_storage(storage_path: str) -> bytes:
    """Retrieve file from storage"""
    try:
        with open(storage_path, "rb") as f:
            return f.read()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found in storage")

# API Endpoints
@app.post("/api/upload", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    settings: ShareSettings = Depends(),
    db: Session = Depends(get_db)
):
    """Upload a file and create a shareable link"""
    
    # Validate file size (10MB limit)
    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="File size exceeds 10MB limit"
        )
    
    # Read file content
    file_content = await file.read()
    
    # Validate actual file size
    if len(file_content) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="File size exceeds 10MB limit"
        )
    
    # Generate unique identifiers
    file_id = generate_file_id()
    access_key = generate_access_key()
    file_hash = calculate_file_hash(file_content)
    
    # Save file to storage
    storage_path = save_file_to_storage(file_content, file_id, file.filename)
    
    # Calculate expiration
    expires_at = None
    if settings.expires_in_hours:
        expires_at = datetime.utcnow() + timedelta(hours=settings.expires_in_hours)
    
    # Create database record
    db_file = FileShare(
        id=file_id,
        filename=file.filename,
        original_filename=file.filename,
        file_size=len(file_content),
        content_type=file.content_type or "application/octet-stream",
        access_key=access_key,
        max_downloads=settings.max_downloads or 10,
        expires_at=expires_at,
        file_hash=file_hash,
        storage_path=storage_path
    )
    
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    
    return FileUploadResponse(
        id=file_id,
        access_key=access_key,
        filename=file.filename,
        file_size=len(file_content),
        expires_at=expires_at,
        download_url=f"/api/download/{access_key}"
    )

@app.get("/api/info/{access_key}", response_model=FileInfoResponse)
async def get_file_info(access_key: str, db: Session = Depends(get_db)):
    """Get file information by access key"""
    
    file_share = db.query(FileShare).filter(
        FileShare.access_key == access_key,
        FileShare.is_active == True
    ).first()
    
    if not file_share:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check if file has expired
    if file_share.expires_at and datetime.utcnow() > file_share.expires_at:
        raise HTTPException(status_code=410, detail="File has expired")
    
    # Check if download limit reached
    if file_share.download_count >= file_share.max_downloads:
        raise HTTPException(status_code=410, detail="Download limit reached")
    
    return FileInfoResponse(
        filename=file_share.original_filename,
        file_size=file_share.file_size,
        content_type=file_share.content_type,
        download_count=file_share.download_count,
        max_downloads=file_share.max_downloads,
        expires_at=file_share.expires_at,
        created_at=file_share.created_at
    )

@app.get("/api/download/{access_key}")
async def download_file(access_key: str, db: Session = Depends(get_db)):
    """Download file by access key"""
    
    file_share = db.query(FileShare).filter(
        FileShare.access_key == access_key,
        FileShare.is_active == True
    ).first()
    
    if not file_share:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Check if file has expired
    if file_share.expires_at and datetime.utcnow() > file_share.expires_at:
        raise HTTPException(status_code=410, detail="File has expired")
    
    # Check if download limit reached
    if file_share.download_count >= file_share.max_downloads:
        raise HTTPException(status_code=410, detail="Download limit reached")
    
    # Get file content from storage
    try:
        file_content = get_file_from_storage(file_share.storage_path)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Error retrieving file")
    
    # Increment download count
    file_share.download_count += 1
    db.commit()
    
    # Return file as streaming response
    return StreamingResponse(
        io.BytesIO(file_content),
        media_type=file_share.content_type,
        headers={
            "Content-Disposition": f"attachment; filename={file_share.original_filename}",
            "Content-Length": str(file_share.file_size)
        }
    )

@app.delete("/api/files/{access_key}")
async def delete_file(access_key: str, db: Session = Depends(get_db)):
    """Delete a file by access key"""
    
    file_share = db.query(FileShare).filter(
        FileShare.access_key == access_key
    ).first()
    
    if not file_share:
        raise HTTPException(status_code=404, detail="File not found")
    
    # Mark as inactive instead of deleting
    file_share.is_active = False
    db.commit()
    
    # Optionally delete from storage
    try:
        os.remove(file_share.storage_path)
    except FileNotFoundError:
        pass  # File already deleted from storage
    
    return {"message": "File deleted successfully"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "timestamp": datetime.utcnow()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
