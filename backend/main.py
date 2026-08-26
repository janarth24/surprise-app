from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models

# MySQL Tables Auto-Create
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Collaborative Surprise Platform API")

# React App Cross-Origin Access (CORS) Enable Panrom
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # React dev server-ku access tharrom
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"message": "Surprise App Backend Server is Running Super Fast! 🚀"}

# --- REGISTER LOGIC (FRONTEND TARGET HERE) ---
@app.post("/api/auth/register")
def register_user(user_data: dict, db: Session = Depends(get_db)):
    # 1. Email Already Exists-a nu Check Panrom
    existing_user = db.query(models.User).filter(models.User.email == user_data["email"]).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered!")

    # 2. Pudhu User Table Schema Create Panrom
    new_user = models.User(
        name=user_data["name"],
        email=user_data["email"],
        password_hash=user_data["password"] # Simple format (Later Hash pannuvom)
    )

    # 3. Database-la Commit (Save) Panrom
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"status": "success", "message": "User registered successfully!", "user_id": new_user.id}

    # --- LOGIN LOGIC ---
@app.post("/api/auth/login")
def login_user(credentials: dict, db: Session = Depends(get_db)):
    # 1. Email check panrom
    user = db.query(models.User).filter(models.User.email == credentials["email"]).first()
    
    # 2. Email illana or Password match aagalana error throw panrom
    if not user or user.password_hash != credentials["password"]:
        raise HTTPException(status_code=400, detail="Invalid Email or Password!")

    # 3. User details return panrom
    return {
        "status": "success",
        "message": "Login successful!",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }