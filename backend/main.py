from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models
import random
import string


# ============================================================
# MySQL Tables Auto-Create
# ============================================================

models.Base.metadata.create_all(bind=engine)


# ============================================================
# FastAPI App
# ============================================================

app = FastAPI(
    title="Collaborative Surprise Platform API"
)


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

    # 2. Create New User
    new_user = models.User(
        name=user_data["name"],
        email=user_data["email"],
        password_hash=user_data["password"]
    )

    # 3. Save User to Database
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

    # 2. Check Email and Password
    if not user or user.password_hash != credentials["password"]:
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