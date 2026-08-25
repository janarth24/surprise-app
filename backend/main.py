from fastapi import FastAPI
from database import engine, Base
import models

# MySQL Tables Auto-Create Logic
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Collaborative Surprise Platform API")

@app.get("/")
def home():
    return {"message": "Surprise App Backend Server is Running Super Fast! 🚀"}