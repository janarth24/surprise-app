from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

# 1. USERS TABLE
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    profile_photo = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    created_rooms = relationship("Room", back_populates="creator")
    contributions = relationship("Contribution", back_populates="user")


# 2. SURPRISE ROOMS TABLE
class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    room_code = Column(String(20), unique=True, index=True, nullable=False) # e.g., RAHUL-X82K
    public_slug = Column(String(100), unique=True, index=True, nullable=True) # e.g., rahul-birthday-x82kd92
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_name = Column(String(100), nullable=False) # Birthday person name
    event_date = Column(String(50), nullable=True)
    title = Column(String(200), nullable=False)
    theme = Column(String(50), default="default")
    is_published = Column(Integer, default=0) # 0 = Draft, 1 = Published
    gift_password = Column(String(100), nullable=True) # 🔑 Target person password protection
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    creator = relationship("User", back_populates="created_rooms")
    contributions = relationship("Contribution", back_populates="room")


# 3. CONTRIBUTIONS TABLE (Photos, Messages, Audio, Video, Memories)
class Contribution(Base):
    __tablename__ = "contributions"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=True) # 'text', 'photo', 'video', 'audio', 'memory', 'letter'
    content = Column(Text, nullable=True) # Text message or letter content
    media_url = Column(String(255), nullable=True) # Image/Audio/Video file path
    caption = Column(String(255), nullable=True)
    # Default-a 'approved' nu tharlaam, or admin review-ku 'pending' nu tharlaam
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    room = relationship("Room", back_populates="contributions")
    user = relationship("User", back_populates="contributions")