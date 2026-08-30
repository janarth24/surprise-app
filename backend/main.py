import os
import shutil
import random
import string
from fastapi import FastAPI, HTTPException, Depends, Form, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base, get_db
import models
import bcrypt
import uuid

# ============================================================
# ENV CONFIG — Reads from .env file if present
# Change FRONTEND_BASE_URL in .env to switch environments
# ============================================================
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv optional; use OS env vars directly

FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")


# ============================================================
# FastAPI App Initialization (MUST BE FIRST)
# ============================================================

app = FastAPI(
    title="Collaborative Surprise Platform API"
)

# 🔴 SEPARATE DIRECTORY FOR PROFILES
PROFILE_DIR = "uploads/profiles"
os.makedirs(PROFILE_DIR, exist_ok=True) # Directory automatic-a create aagidum
# Uploads folder setup
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ============================================================
# MySQL Tables Auto-Create
# ============================================================

models.Base.metadata.create_all(bind=engine)

# ============================================================
# CORS Configuration
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def hash_password(password: str) -> str:
    # Encode to UTF-8, truncate to 72 bytes (bcrypt limit), then hash
    pwd_bytes = password.encode("utf-8")[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    pwd_bytes = plain_password.encode("utf-8")[:72]
    return bcrypt.checkpw(pwd_bytes, hashed_password.encode("utf-8"))

# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return {
        "message": "Surprise App Backend Server is Running Super Fast! 🚀"
    }


# ============================================================
# REGISTER LOGIC
# ============================================================

@app.post("/api/auth/register")
def register_user(
    user_data: dict,
    db: Session = Depends(get_db)
):
    # 1. Check Email Already Exists
    existing_user = db.query(models.User).filter(
        models.User.email == user_data["email"]
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered!"
        )

    # 2. Hash raw password before saving
    hashed_pwd = hash_password(user_data["password"])

    # 3. Create New User with Hashed Password
    new_user = models.User(
        name=user_data["name"],
        email=user_data["email"],
        password_hash=hashed_pwd
    )

    # 4. Save User to Database
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "status": "success",
        "message": "User registered successfully!",
        "user_id": new_user.id
    }


# ============================================================
# LOGIN LOGIC
# ============================================================

@app.post("/api/auth/login")
def login_user(
    credentials: dict,
    db: Session = Depends(get_db)
):
    # 1. Check Email
    user = db.query(models.User).filter(
        models.User.email == credentials["email"]
    ).first()

    # 2. Verify hashed password securely using verify_password()
    if not user or not verify_password(credentials["password"], user.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Invalid Email or Password!"
        )

    # 3. Return User Details
    return {
        "status": "success",
        "message": "Login successful!",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }


@app.get("/api/users/{user_id}")
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "status": "success",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "profile_photo": getattr(user, "profile_photo", None)
        }
    }   


# ============================================================
# 1. CHANGE PROFILE PHOTO
# ============================================================
@app.post("/api/users/upload-profile-photo")
async def upload_profile_photo(
    user_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Old photo delete
    if hasattr(user, 'profile_photo') and user.profile_photo:
        old_path = user.profile_photo.lstrip("/")
        if os.path.exists(old_path):
            try:
                os.remove(old_path)
            except Exception as e:
                print("Error removing file:", e)

    # Save new photo
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    file_path = os.path.join(PROFILE_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    user.profile_photo = f"/uploads/profiles/{unique_filename}"
    db.commit()
    db.refresh(user)

    return {
        "status": "success",
        "message": "Photo updated!",
        "profile_photo": user.profile_photo,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "profile_photo": user.profile_photo
        }
    }


# ============================================================
# 2. CHANGE PASSWORD (SIMPLE JSON DATA)
# ============================================================
@app.post("/api/users/change-password")
def change_password(data: dict, db: Session = Depends(get_db)):
    user_id = data.get("user_id")
    current_password = data.get("current_password")
    new_password = data.get("new_password")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Current password check
    if not verify_password(current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password incorrect!")

    # Update new password hash
    user.password_hash = hash_password(new_password)
    db.commit()

    return {"status": "success", "message": "Password changed successfully!"}


async def upload_profile_photo(
    user_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Delete old profile photo if exists
    if user.profile_photo:
        old_path = user.profile_photo.lstrip("/")
        if os.path.exists(old_path):
            os.remove(old_path)

    # Save to uploads/profiles directory with Unique UUID
    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(PROFILE_DIR, unique_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    user.profile_photo = f"/uploads/profiles/{unique_filename}"
    db.commit()
    db.refresh(user)

    return {
        "status": "success",
        "message": "Profile photo updated!",
        "profile_photo": user.profile_photo,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "profile_photo": user.profile_photo
        }
    }   


# ============================================================
# ROOM LOGIC
# ============================================================

# Helper function to generate unique 6-character room code
# Example: SURP99

def generate_room_code():
    return ''.join(
        random.choices(
            string.ascii_uppercase + string.digits,
            k=6
        )
    )


# ============================================================
# CREATE ROOM
# ============================================================

@app.post("/api/rooms/create")
def create_room(room_data: dict, db: Session = Depends(get_db)):
    try:
        room_code = generate_room_code()

        # 1. Create Room Entry
        new_room = models.Room(
            title=room_data["title"],
            target_name=room_data["target_name"],
            event_date=room_data["event_date"],
            theme=room_data.get("theme", "default"),
            creator_id=room_data["creator_id"],
            room_code=room_code
        )

        db.add(new_room)
        db.commit()
        db.refresh(new_room)

        # 2. AUTO-JOIN CREATOR TO THE ROOM
        # If room_members table separate-a irundha, replace with RoomMember logic:
        # new_member = models.RoomMember(room_id=new_room.id, user_id=room_data["creator_id"], role="creator")
        # db.add(new_member)

        # Creator-oda initial welcome contribution mapping (type nullable)
        creator_initial_entry = models.Contribution(
            room_id=new_room.id,
            user_id=room_data["creator_id"],
            type=None, # Explicitly null passing or type setup
        )
        db.add(creator_initial_entry)
        
        db.commit() # Save both Room & Auto-Join status

        return {
            "status": "success",
            "message": "Room created & creator joined successfully!",
            "room": {
                "id": new_room.id,
                "title": new_room.title,
                "target_name": new_room.target_name,
                "event_date": str(new_room.event_date),
                "room_code": new_room.room_code,
                "theme": new_room.theme
            }
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# GET USER ROOMS
# ============================================================

@app.get("/api/rooms/my-joined-rooms/{user_id}")
def get_user_joined_rooms(user_id: int, db: Session = Depends(get_db)):
    try:
        # User creator OR joined through Contribution table
        joined_rooms = db.query(models.Room).filter(
            (models.Room.creator_id == user_id) |
            (models.Room.id.in_(
                db.query(models.Contribution.room_id).filter(
                    models.Contribution.user_id == user_id
                )
            ))
        ).distinct().all()

        rooms_list = []

        for r in joined_rooms:
            rooms_list.append({
                "id": r.id,
                "title": r.title,
                "target_name": r.target_name,
                "event_date": str(r.event_date),
                "room_code": r.room_code,
                "theme": r.theme,
                "creator_id": r.creator_id,
                "is_organizer": r.creator_id == user_id
            })

        return {
            "status": "success",
            "rooms": rooms_list
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ============================================================
# JOIN ROOM
# ============================================================

@app.post("/api/rooms/join")
def join_room(join_data: dict, db: Session = Depends(get_db)):
    try:
        room_code = join_data.get("room_code", "").strip().upper()
        user_id = join_data.get("user_id")

        if not room_code or not user_id:
            raise HTTPException(
                status_code=400,
                detail="Room code and User ID are required!"
            )

        # 1. Check whether room code is valid
        room = db.query(models.Room).filter(
            models.Room.room_code == room_code
        ).first()

        if not room:
            raise HTTPException(
                status_code=404,
                detail="Invalid Room Code! Please check and try again."
            )

        # 2. Check whether user is already in the room
        if room.creator_id == user_id:
            return {
                "status": "success",
                "message": "You are the organizer of this room!",
                "room": room
            }

        existing_contribution = db.query(models.Contribution).filter(
            models.Contribution.room_id == room.id,
            models.Contribution.user_id == user_id
        ).first()

        if existing_contribution:
            return {
                "status": "success",
                "message": "Already joined in this room!",
                "room": room
            }

        # 3. Add new member
        new_member_entry = models.Contribution(
            room_id=room.id,
            user_id=user_id,
            type=None,
            content="User Joined Room"
        )

        db.add(new_member_entry)
        db.commit()
        db.refresh(new_member_entry)

        return {
            "status": "success",
            "message": f"Successfully joined '{room.title}'!",
            "room": {
                "id": room.id,
                "title": room.title,
                "target_name": room.target_name,
                "event_date": str(room.event_date),
                "room_code": room.room_code,
                "theme": room.theme,
                "creator_id": room.creator_id
            }
        }

    except HTTPException as he:
        raise he

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# ==========================================
# CONTRIBUTIONS API ROUTES
# ==========================================

# 1. ADD CONTRIBUTION (Text / Image / Video / Audio)
@app.post("/api/contributions/add")
async def add_contribution(
    room_id: int = Form(...),
    user_id: int = Form(...),
    type: str = Form(...),
    content: str = Form(None),
    caption: str = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    saved_url = None
    
    if file:
        # 1. Unique ID generate panni filename-ku munnadi add panrom
        unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
        
        # 2. Uploads folder path
        file_path = f"uploads/{unique_filename}"
        
        # 3. Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        saved_url = f"/uploads/{unique_filename}"

    new_item = models.Contribution(
        room_id=room_id,
        user_id=user_id,
        type=type,
        content=content,
        caption=caption,
        media_url=saved_url
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    
    return {"status": "success", "message": "Uploaded successfully!", "data": new_item}


# GET CONTRIBUTIONS (Only logged-in user's content)
@app.get("/api/contributions/{room_id}/{user_id}/{type}")
def get_user_contributions(room_id: int, user_id: int, type: str, db: Session = Depends(get_db)):
    items = db.query(models.Contribution).filter(
        models.Contribution.room_id == room_id,
        models.Contribution.user_id == user_id,  # <-- Indha user-oda content mattum fetch aagum
        models.Contribution.type == type
    ).all()
    return {"status": "success", "data": items}    

# 3. DELETE CONTRIBUTION (Path Variable-a user_id pass panroam)
@app.delete("/api/contributions/delete/{item_id}/{user_id}")
def delete_contribution(
    item_id: int, 
    user_id: int, 
    db: Session = Depends(get_db)
):
    item = db.query(models.Contribution).filter(models.Contribution.id == item_id).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # SECURITY CHECK
    if item.user_id != user_id:
        raise HTTPException(status_code=403, detail="Permission denied! You can only delete your own items.")
    
    # File Cleanup
    if item.media_url:
        actual_path = item.media_url.lstrip("/")
        if os.path.exists(actual_path):
            os.remove(actual_path)

    db.delete(item)
    db.commit()
    return {"status": "success", "message": "Deleted successfully"}
# 4. EDIT / UPDATE CONTRIBUTION (Auth User Only)
@app.put("/api/contributions/update/{item_id}")
async def update_contribution(
    item_id: int,
    user_id: int = Form(...),  # Form Data-la logged-in user_id anuppuvom
    content: str = Form(None),
    caption: str = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db)
):
    item = db.query(models.Contribution).filter(models.Contribution.id == item_id).first()
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # SECURITY CHECK: Owner dhana nu verify panrom
    if item.user_id != user_id:
        raise HTTPException(status_code=403, detail="Permission denied! You can only edit your own items.")

    # Text / Caption Updates
    if content is not None:
        item.content = content
    if caption is not None:
        item.caption = caption

    # New file update logic
    if file:
        if item.media_url:
            old_path = item.media_url.lstrip("/")
            if os.path.exists(old_path):
                os.remove(old_path)

        unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
        file_path = f"uploads/{unique_filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        item.media_url = f"/uploads/{unique_filename}"

    db.commit()
    db.refresh(item)
    return {"status": "success", "message": "Updated successfully", "data": item}

# ============================================================
# TOGGLE CONTRIBUTION STATUS (Approved / Pending)
# ============================================================
@app.patch("/api/contributions/{contribution_id}/status")
def update_contribution_status(contribution_id: int, db: Session = Depends(get_db)):
    contrib = db.query(models.Contribution).filter(models.Contribution.id == contribution_id).first()
    if not contrib:
        raise HTTPException(status_code=404, detail="Contribution not found")

    # Toggle status between approved and pending
    new_status = "approved" if contrib.status == "pending" else "pending"
    contrib.status = new_status
    
    db.commit()
    db.refresh(contrib)

    return {
        "status": "success",
        "message": f"Status changed to {new_status}",
        "new_status": new_status,
        "contribution_id": contrib.id
    }    

# ============================================================
# GET ROOM DETAILS BY CODE (for public_slug & gift_password fetch)
# ============================================================
@app.get("/api/rooms/code/{room_code}")
def get_room_by_code(room_code: str, db: Session = Depends(get_db)):
    room = db.query(models.Room).filter(models.Room.room_code == room_code).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    return {
        "status": "success",
        "data": {
            "id": room.id,
            "title": room.title,
            "target_name": room.target_name,
            "event_date": str(room.event_date),
            "room_code": room.room_code,
            "theme": room.theme,
            "creator_id": room.creator_id,
            "public_slug": room.public_slug,
            "gift_password": room.gift_password,
            "is_published": room.is_published
        }
    }


# ============================================================
# GET PARTICIPANTS WITH DETAILED DIGITAL CONTRIBUTIONS
# ============================================================
@app.get("/api/rooms/code/{room_code}/participants")
def get_participants_by_code(room_code: str, db: Session = Depends(get_db)):
    room = db.query(models.Room).filter(models.Room.room_code == room_code).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    contributions = db.query(models.Contribution).filter(models.Contribution.room_id == room.id).all()

    user_data_map = {}
    for contrib in contributions:
        uid = contrib.user_id
        if uid not in user_data_map:
            user_data_map[uid] = []

        user_data_map[uid].append({
            "id": contrib.id,
            "type": contrib.type,
            "content": contrib.content,
            "media_url": contrib.media_url,
            "caption": contrib.caption,
            "status": contrib.status,
            "created_at": contrib.created_at.strftime("%b %d, %Y") if contrib.created_at else None
        })

    if room.creator_id not in user_data_map:
        user_data_map[room.creator_id] = []

    participants_data = []
    for user_id, contrib_list in user_data_map.items():
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user:
            participants_data.append({
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "profile_photo": user.profile_photo,
                "contributions_count": len(contrib_list),
                "contributions": contrib_list
            })

    return {
        "status": "success",
        "room_id": room.id,
        "creator_id": room.creator_id,  # 👈 Dynamic Organizer Check-ku
        "data": participants_data
    }



    # ============================================================
# GENERATE PUBLIC LINK & SET GIFT PASSWORD
# ============================================================
@app.post("/api/rooms/code/{room_code}/generate-link")
def generate_public_link(
    room_code: str, 
    payload: dict, 
    db: Session = Depends(get_db)
):
    # 1. Fetch Room from DB
    room = db.query(models.Room).filter(models.Room.room_code == room_code).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    # 2. Function-kullaye Dict la irundhu values extract panrom
    password = payload.get("password", "").strip()
    public_url = payload.get("public_url", "").strip()

    # 3. Validation inside function
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    # 4. Public URL illana auto-generate fallback (Option)
    if not public_url:
        random_slug = f"surprise-{room_code.lower()}-{uuid.uuid4().hex[:5]}"
        public_url = f"{FRONTEND_BASE_URL}/surprise/{random_slug}"

    # 5. DB Updates
    room.gift_password = password
    room.public_slug = public_url  # Storing full URL directly
    room.is_published = 1          # Auto publish room
    
    db.commit()
    db.refresh(room)

    # 6. Response
    return {
        "status": "success",
        "message": "Public link & Password generated successfully!",
        "public_url": room.public_slug,
        "gift_password": room.gift_password,
        "is_published": room.is_published
    }

# ============================================================
# FETCH PUBLIC SURPRISE PAGE DATA BY SLUG (UPDATED SCHEMA FIX)
# ============================================================
@app.get("/api/rooms/public/surprise/{slug}")
def get_public_surprise(slug: str, db: Session = Depends(get_db)):
    # 1. DB-la public_slug column matching check panrom
    room = db.query(models.Room).filter(
        models.Room.public_slug.like(f"%{slug}%")
    ).first()

    if not room:
        raise HTTPException(
            status_code=404, 
            detail="Surprise page not found or link expired!"
        )

    # 2. Fetch approved and active contributions
    contributions = db.query(models.Contribution).filter(
        models.Contribution.room_id == room.id,
        models.Contribution.status != "rejected"
    ).all()

    # 3. Room schema-la irukku target_name & title-a correct-a mapping panrom
    return {
        "status": "success",
        "data": {
            "id": room.id,
            "title": room.title,
            "target_name": room.target_name,
            "description": f"A special surprise gallery curated for {room.target_name}!",
            "event_date": room.event_date,
            "theme": room.theme,
            "gift_password": room.gift_password,
            "contributions": [
                {
                    "id": c.id,
                    "sender_name": c.user.name if (c.user and c.user.name) else getattr(c, 'sender_name', 'Special Guest'),
                    "content": getattr(c, 'content', ''),
                    "media_url": getattr(c, 'media_url', ''),
                    "type": getattr(c, 'type', 'text') or 'text',
                    "caption": getattr(c, 'caption', '')
                }
                for c in contributions
            ]
        }
    }