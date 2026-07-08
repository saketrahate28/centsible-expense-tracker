"""
Centsible — AI-powered expense tracker backend (FastAPI + MongoDB).

Endpoint contracts mirror the original .NET Core API so the same Expo app
can point to either backend by flipping EXPO_PUBLIC_BACKEND_URL.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from pathlib import Path
import os
import uuid
import jwt
import random
import string
import logging
import httpx
import io
import csv
import json as _json
import stripe
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ── Env ──────────────────────────────────────────────────────────────────────
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
EMERGENT_LLM_KEY = os.environ["EMERGENT_LLM_KEY"]
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY", "")
SENDER_EMAIL = os.environ.get("SENDER_EMAIL", "Centsible <noreply@centsible.dev>")
STRIPE_API_KEY = os.environ.get("STRIPE_API_KEY", "")
APP_URL = os.environ.get("APP_URL", "http://localhost:3000")
JWT_ALGO = "HS256"
JWT_TTL_DAYS = 7

stripe.api_key = STRIPE_API_KEY

# ── App / DB ─────────────────────────────────────────────────────────────────
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Centsible API", version="1.0.0")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("centsible")

# ── Constants ────────────────────────────────────────────────────────────────
CATEGORIES = [
    "Food & Drinks", "Groceries", "Transport", "Shopping", "Bills",
    "Entertainment", "Health", "Travel", "Other",
]
CATEGORY_KEYWORDS = {
    "Food & Drinks": ["swiggy", "zomato", "restaurant", "cafe", "starbucks", "dominos", "kfc", "mcd", "food"],
    "Groceries":     ["bigbasket", "grofers", "blinkit", "zepto", "dmart", "grocery", "kirana"],
    "Transport":     ["uber", "ola", "rapido", "metro", "irctc", "petrol", "fuel", "hp", "iocl", "shell"],
    "Shopping":      ["amazon", "flipkart", "myntra", "ajio", "nykaa", "meesho"],
    "Bills":         ["electricity", "recharge", "airtel", "jio", "vi ", "vodafone", "bescom", "bill"],
    "Entertainment": ["netflix", "prime", "hotstar", "spotify", "bookmyshow", "youtube"],
    "Health":        ["pharmacy", "medplus", "apollo", "hospital", "clinic", "1mg", "pharmeasy"],
    "Travel":        ["makemytrip", "goibibo", "yatra", "ixigo", "irctc", "indigo", "airasia"],
}
FINANCE_TERMS = [
    "SIP", "CIBIL Score", "Emergency Fund", "Compound Interest",
    "Mutual Fund", "ETF", "Index Fund", "PPF", "NPS", "EPF",
    "Term Insurance", "Health Insurance", "Fixed Deposit", "Recurring Deposit",
    "Credit Utilization", "Debt-to-Income Ratio", "50/30/20 Rule",
]

# ── Helpers ──────────────────────────────────────────────────────────────────
def now_utc() -> datetime:
    return datetime.now(timezone.utc)

def iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()

def make_jwt(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "iat": now_utc(),
        "exp": now_utc() + timedelta(days=JWT_TTL_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def gen_otp() -> str:
    return "".join(random.choices(string.digits, k=6))

def new_id(prefix: str = "") -> str:
    return f"{prefix}{uuid.uuid4().hex[:16]}"

def guess_category(text: str) -> str:
    t = (text or "").lower()
    for cat, kws in CATEGORY_KEYWORDS.items():
        for kw in kws:
            if kw in t:
                return cat
    return "Other"

async def get_user_by_id(user_id: str) -> Optional[dict]:
    return await db.users.find_one({"user_id": user_id}, {"_id": 0})

async def require_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()

    # Try JWT (OTP flow)
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = payload.get("sub")
        if user_id:
            user = await get_user_by_id(user_id)
            if user:
                return user
    except jwt.InvalidTokenError:
        pass

    # Try Emergent session (Google flow)
    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if session:
        exp = session.get("expires_at")
        if isinstance(exp, str):
            exp = datetime.fromisoformat(exp)
        if exp and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp and exp > now_utc():
            user = await get_user_by_id(session["user_id"])
            if user:
                return user
    raise HTTPException(401, "Invalid or expired token")

# ── Models ───────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    identifier: str

class VerifyRequest(BaseModel):
    identifier: str
    otp: str

class GoogleSessionRequest(BaseModel):
    session_id: str

class OnboardingRequest(BaseModel):
    name: str
    age: int
    bank_count: int
    city: Optional[str] = None

class BudgetRequest(BaseModel):
    limit: float

class TxnCreate(BaseModel):
    amount: float
    merchant: Optional[str] = ""
    category: Optional[str] = None
    date: Optional[str] = None
    payment_method: Optional[str] = "UPI"
    account_reference: Optional[str] = "primary"
    dedup_key: Optional[str] = None
    raw_sms: Optional[str] = None
    note: Optional[str] = ""

class TxnPatch(BaseModel):
    amount: Optional[float] = None
    merchant: Optional[str] = None
    category: Optional[str] = None
    payment_method: Optional[str] = None
    note: Optional[str] = None

class CategoryPatch(BaseModel):
    category: str

class PredictCategory(BaseModel):
    merchant: str
    raw_sms: Optional[str] = None

class IncomeCreate(BaseModel):
    amount: float
    source: str
    date: Optional[str] = None
    note: Optional[str] = ""

class GroupCreate(BaseModel):
    name: str
    members: List[str] = []

class GroupExpense(BaseModel):
    amount: float
    description: str
    paid_by: str
    split_between: List[str] = []

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

def _user_view(user: dict) -> dict:
    return {
        "user_id": user["user_id"],
        "email": user.get("email"),
        "phone": user.get("phone"),
        "name": user.get("name"),
        "age": user.get("age"),
        "bank_count": user.get("bank_count", 0),
        "city": user.get("city"),
        "budget_limit": user.get("budget_limit", 25000),
        "is_onboarded": user.get("is_onboarded", False),
        "avatar": user.get("avatar"),
        "is_pro": bool(user.get("is_pro", False)),
        "pro_plan": user.get("pro_plan"),
        "pro_expires_at": iso(user["pro_expires_at"]) if isinstance(user.get("pro_expires_at"), datetime) else user.get("pro_expires_at"),
    }

# ── Email helper ─────────────────────────────────────────────────────────────
def send_otp_email(to_email: str, otp: str) -> bool:
    """Send OTP via SendGrid. Returns False if key not configured (dev mode)."""
    if not SENDGRID_API_KEY or not SENDGRID_API_KEY.startswith("SG."):
        return False
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; background: #0A0B10; color: #F8FAFC; border-radius: 16px;">
      <h1 style="color: #06B6D4; font-size: 28px; margin: 0 0 8px;">Centsible</h1>
      <p style="color: #94A3B8; margin: 0 0 32px;">AI-powered finance for GenZ</p>
      <p style="font-size: 16px; margin: 0 0 8px;">Your verification code is:</p>
      <div style="font-size: 40px; font-weight: 800; letter-spacing: 8px; color: #06B6D4; background: #171923; padding: 20px; border-radius: 12px; text-align: center; border: 1px solid rgba(6,182,212,0.3); margin: 16px 0;">{otp}</div>
      <p style="color: #94A3B8; font-size: 13px; margin-top: 20px;">This code expires in 10 minutes. If you didn't request this, safely ignore this email.</p>
      <p style="color: #475569; font-size: 11px; margin-top: 40px; text-align: center;">© Centsible · Made in India</p>
    </div>
    """
    try:
        msg = Mail(from_email=SENDER_EMAIL, to_emails=to_email, subject=f"Your Centsible code: {otp}", html_content=html)
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        resp = sg.send(msg)
        return resp.status_code in (200, 202)
    except Exception as e:
        log.warning(f"SendGrid failed: {e}")
        return False

# ── Auth ─────────────────────────────────────────────────────────────────────
@api.post("/Auth/login")
async def auth_login(body: LoginRequest):
    otp = gen_otp()
    await db.otps.update_one(
        {"identifier": body.identifier},
        {"$set": {
            "identifier": body.identifier,
            "otp": otp,
            "created_at": now_utc(),
            "expires_at": now_utc() + timedelta(minutes=10),
        }},
        upsert=True,
    )
    log.info(f"OTP for {body.identifier}: {otp}")

    # If it's an email and SendGrid is configured, deliver real email
    email_sent = False
    if "@" in body.identifier:
        email_sent = send_otp_email(body.identifier, otp)

    resp = {"ok": True, "message": "OTP sent" if email_sent else "OTP generated"}
    # Only expose devOTP when real delivery didn't happen (keeps dev/testing smooth)
    if not email_sent:
        resp["devOTP"] = otp
    return resp

@api.post("/Auth/verify")
async def auth_verify(body: VerifyRequest):
    doc = await db.otps.find_one({"identifier": body.identifier}, {"_id": 0})
    if not doc or doc["otp"] != body.otp:
        raise HTTPException(400, "Invalid OTP")
    exp = doc["expires_at"]
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < now_utc():
        raise HTTPException(400, "OTP expired")

    is_email = "@" in body.identifier
    lookup = {"email": body.identifier} if is_email else {"phone": body.identifier}
    user = await db.users.find_one(lookup, {"_id": 0})
    if not user:
        user = {
            "user_id": new_id("u_"),
            "name": None,
            "age": None,
            "bank_count": 0,
            "city": None,
            "budget_limit": 25000,
            "is_onboarded": False,
            "created_at": now_utc(),
            "avatar": None,
            "auth_provider": "otp",
        }
        if is_email:
            user["email"] = body.identifier
        else:
            user["phone"] = body.identifier
        insert_doc = user.copy()
        await db.users.insert_one(insert_doc)

    await db.otps.delete_one({"identifier": body.identifier})
    token = make_jwt(user["user_id"])
    return {"token": token, "user": _user_view(user)}

@api.post("/Auth/google/session")
async def auth_google_session(body: GoogleSessionRequest):
    async with httpx.AsyncClient(timeout=15) as hc:
        r = await hc.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": body.session_id},
        )
    if r.status_code != 200:
        raise HTTPException(401, "Google session invalid")
    data = r.json()
    email = data["email"]
    session_token = data["session_token"]

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user = {
            "user_id": new_id("u_"),
            "email": email,
            "name": data.get("name"),
            "age": None,
            "bank_count": 0,
            "city": None,
            "budget_limit": 25000,
            "is_onboarded": False,
            "created_at": now_utc(),
            "avatar": data.get("picture"),
            "auth_provider": "google",
        }
        insert_doc = user.copy()
        await db.users.insert_one(insert_doc)

    await db.user_sessions.update_one(
        {"session_token": session_token},
        {"$set": {
            "session_token": session_token,
            "user_id": user["user_id"],
            "created_at": now_utc(),
            "expires_at": now_utc() + timedelta(days=7),
        }},
        upsert=True,
    )
    jwt_token = make_jwt(user["user_id"])
    return {"token": jwt_token, "session_token": session_token, "user": _user_view(user)}

@api.get("/Auth/me")
async def auth_me(user: dict = Depends(require_user)):
    return {"user": _user_view(user)}

@api.post("/Auth/logout")
async def auth_logout(user: dict = Depends(require_user), authorization: Optional[str] = Header(None)):
    if authorization:
        token = authorization.split(" ", 1)[1].strip()
        await db.user_sessions.delete_one({"session_token": token})
    return {"ok": True}

# ── Users ────────────────────────────────────────────────────────────────────
@api.post("/Users/onboarding")
async def users_onboarding(body: OnboardingRequest, user: dict = Depends(require_user)):
    upd = {
        "name": body.name, "age": body.age,
        "bank_count": body.bank_count, "city": body.city,
        "is_onboarded": True,
    }
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": upd})
    updated = await get_user_by_id(user["user_id"])
    return {"user": _user_view(updated)}

@api.patch("/Users/me")
async def users_patch(body: dict, user: dict = Depends(require_user)):
    allowed = {"name", "age", "city", "avatar"}
    upd = {k: v for k, v in body.items() if k in allowed}
    if upd:
        await db.users.update_one({"user_id": user["user_id"]}, {"$set": upd})
    updated = await get_user_by_id(user["user_id"])
    return {"user": _user_view(updated)}

@api.post("/Users/me/budget")
async def users_budget(body: BudgetRequest, user: dict = Depends(require_user)):
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"budget_limit": body.limit}})
    return {"budget_limit": body.limit}

@api.get("/Users/me/accounts")
async def users_accounts(user: dict = Depends(require_user)):
    n = max(1, user.get("bank_count") or 1)
    accounts = [
        {"id": f"acc_{i}", "name": f"Bank Account {i+1}", "last4": f"{1234 + i*11:04d}"}
        for i in range(n)
    ]
    accounts.insert(0, {"id": "all", "name": "All accounts", "last4": ""})
    return {"accounts": accounts}

# ── Transactions ─────────────────────────────────────────────────────────────
def _txn_view(t: dict) -> dict:
    return {
        "id": t["txn_id"],
        "amount": float(t.get("amount", 0)),
        "merchant": t.get("merchant", ""),
        "category": t.get("category", "Other"),
        "date": iso(t["date"]) if isinstance(t.get("date"), datetime) else t.get("date"),
        "payment_method": t.get("payment_method", "UPI"),
        "account_reference": t.get("account_reference", "primary"),
        "note": t.get("note", ""),
        "type": t.get("type", "expense"),
    }

@api.post("/Transactions/sms")
async def txn_create(body: TxnCreate, user: dict = Depends(require_user)):
    dedup = body.dedup_key
    if dedup:
        existing = await db.transactions.find_one(
            {"user_id": user["user_id"], "dedup_key": dedup}, {"_id": 0})
        if existing:
            return {"ok": True, "transaction": _txn_view(existing), "duplicate": True}

    category = body.category or guess_category(f"{body.merchant} {body.raw_sms or ''}")
    date = datetime.fromisoformat(body.date) if body.date else now_utc()
    if date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)

    doc = {
        "txn_id": new_id("t_"),
        "user_id": user["user_id"],
        "amount": float(body.amount),
        "merchant": body.merchant or "",
        "category": category,
        "date": date,
        "payment_method": body.payment_method or "UPI",
        "account_reference": body.account_reference or "primary",
        "dedup_key": dedup,
        "raw_sms": body.raw_sms,
        "note": body.note or "",
        "type": "expense",
        "created_at": now_utc(),
    }
    insert_doc = doc.copy()
    await db.transactions.insert_one(insert_doc)
    return {"ok": True, "transaction": _txn_view(doc)}

@api.get("/Transactions")
async def txn_list(
    user: dict = Depends(require_user),
    q: Optional[str] = None,
    category: Optional[str] = None,
    account: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
):
    query: Dict[str, Any] = {"user_id": user["user_id"]}
    if q:
        query["$or"] = [
            {"merchant": {"$regex": q, "$options": "i"}},
            {"note": {"$regex": q, "$options": "i"}},
        ]
    if category and category != "All":
        query["category"] = category
    if account and account != "all":
        query["account_reference"] = account

    total = await db.transactions.count_documents(query)
    cur = db.transactions.find(query, {"_id": 0}).sort("date", -1).skip(skip).limit(limit)
    items = [_txn_view(t) async for t in cur]
    return {"items": items, "total": total}

@api.get("/Transactions/dashboard")
async def txn_dashboard(user: dict = Depends(require_user), account: Optional[str] = None):
    now = now_utc()
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    q: Dict[str, Any] = {"user_id": user["user_id"], "date": {"$gte": start}}
    if account and account != "all":
        q["account_reference"] = account

    total = 0.0
    cats: Dict[str, float] = {}
    recent = []
    cur = db.transactions.find(q, {"_id": 0}).sort("date", -1)
    async for t in cur:
        total += float(t.get("amount", 0))
        cats[t.get("category", "Other")] = cats.get(t.get("category", "Other"), 0) + float(t.get("amount", 0))
        if len(recent) < 10:
            recent.append(_txn_view(t))

    limit = float(user.get("budget_limit") or 25000)
    percent = min(100.0, (total / limit * 100) if limit else 0)
    return {
        "monthly_spend": round(total, 2),
        "budget_limit": limit,
        "percent_used": round(percent, 1),
        "recent": recent,
        "by_category": [{"category": k, "amount": round(v, 2)} for k, v in cats.items()],
    }

@api.get("/Transactions/analytics")
async def txn_analytics(timeframe: str = "month", user: dict = Depends(require_user)):
    now = now_utc()
    if timeframe == "week":
        start = now - timedelta(days=6)
        days = 7
    elif timeframe == "year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        days = (now - start).days + 1
    else:
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        days = (now - start).days + 1
    start = start.replace(hour=0, minute=0, second=0, microsecond=0)

    q = {"user_id": user["user_id"], "date": {"$gte": start}}
    total = 0.0
    cats: Dict[str, float] = {}
    heat: Dict[str, float] = {}
    cur = db.transactions.find(q, {"_id": 0})
    async for t in cur:
        amt = float(t.get("amount", 0))
        total += amt
        cats[t.get("category", "Other")] = cats.get(t.get("category", "Other"), 0) + amt
        dt = t["date"]
        if isinstance(dt, str):
            dt = datetime.fromisoformat(dt)
        key = dt.date().isoformat()
        heat[key] = heat.get(key, 0) + amt

    avg_daily = total / days if days else 0
    heatmap = [{"date": k, "amount": round(v, 2)} for k, v in sorted(heat.items())]
    breakdown = sorted(
        [{"category": k, "amount": round(v, 2)} for k, v in cats.items()],
        key=lambda x: x["amount"], reverse=True,
    )
    return {
        "timeframe": timeframe,
        "total": round(total, 2),
        "avg_daily": round(avg_daily, 2),
        "by_category": breakdown,
        "heatmap": heatmap,
        "trends": heatmap,
        "days": days,
    }

@api.patch("/Transactions/{txn_id}/category")
async def txn_update_category(txn_id: str, body: CategoryPatch, user: dict = Depends(require_user)):
    res = await db.transactions.update_one(
        {"txn_id": txn_id, "user_id": user["user_id"]},
        {"$set": {"category": body.category}},
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Transaction not found")
    t = await db.transactions.find_one({"txn_id": txn_id}, {"_id": 0})
    return {"transaction": _txn_view(t)}

@api.patch("/Transactions/{txn_id}")
async def txn_update(txn_id: str, body: TxnPatch, user: dict = Depends(require_user)):
    upd = {k: v for k, v in body.model_dump(exclude_none=True).items()}
    if not upd:
        raise HTTPException(400, "No fields to update")
    res = await db.transactions.update_one(
        {"txn_id": txn_id, "user_id": user["user_id"]}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(404, "Transaction not found")
    t = await db.transactions.find_one({"txn_id": txn_id}, {"_id": 0})
    return {"transaction": _txn_view(t)}

@api.delete("/Transactions/{txn_id}")
async def txn_delete(txn_id: str, user: dict = Depends(require_user)):
    res = await db.transactions.delete_one({"txn_id": txn_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Transaction not found")
    return {"ok": True}

@api.post("/Transactions/predict-category")
async def txn_predict(body: PredictCategory, user: dict = Depends(require_user)):
    return {"category": guess_category(f"{body.merchant} {body.raw_sms or ''}")}

@api.get("/Transactions/export")
async def txn_export(user: dict = Depends(require_user)):
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["date", "merchant", "amount", "category", "payment_method", "note"])
    cur = db.transactions.find({"user_id": user["user_id"]}, {"_id": 0}).sort("date", -1)
    async for t in cur:
        dt = t["date"]
        writer.writerow([
            iso(dt) if isinstance(dt, datetime) else dt,
            t.get("merchant", ""), t.get("amount", 0),
            t.get("category", ""), t.get("payment_method", ""),
            t.get("note", ""),
        ])
    csv_data = buf.getvalue()
    return StreamingResponse(
        io.BytesIO(csv_data.encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=centsible-transactions.csv"},
    )

# ── Income ───────────────────────────────────────────────────────────────────
@api.post("/Income")
async def income_create(body: IncomeCreate, user: dict = Depends(require_user)):
    date = datetime.fromisoformat(body.date) if body.date else now_utc()
    if date.tzinfo is None:
        date = date.replace(tzinfo=timezone.utc)
    doc = {
        "income_id": new_id("i_"),
        "user_id": user["user_id"],
        "amount": float(body.amount),
        "source": body.source,
        "date": date,
        "note": body.note,
        "created_at": now_utc(),
    }
    insert_doc = doc.copy()
    await db.income.insert_one(insert_doc)
    return {"income": {
        "id": doc["income_id"], "amount": doc["amount"], "source": doc["source"],
        "date": iso(doc["date"]), "note": doc["note"],
    }}

@api.get("/Income")
async def income_list(user: dict = Depends(require_user)):
    now = now_utc()
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    q = {"user_id": user["user_id"]}
    cur = db.income.find(q, {"_id": 0}).sort("date", -1)
    items = []
    monthly_total = 0.0
    total = 0.0
    async for it in cur:
        dt = it["date"]
        if isinstance(dt, str):
            dt = datetime.fromisoformat(dt)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        amt = float(it.get("amount", 0))
        total += amt
        if dt >= start:
            monthly_total += amt
        items.append({
            "id": it["income_id"], "amount": amt, "source": it.get("source", ""),
            "date": iso(dt), "note": it.get("note", ""),
        })
    return {"items": items, "monthly_total": round(monthly_total, 2), "total": round(total, 2)}

# ── Groups (Shared Budgets) ──────────────────────────────────────────────────
def _group_view(g: dict) -> dict:
    return {
        "id": g["group_id"],
        "name": g["name"],
        "members": g.get("members", []),
        "total_spent": round(sum(e.get("amount", 0) for e in g.get("expenses", [])), 2),
        "expense_count": len(g.get("expenses", [])),
        "created_at": iso(g["created_at"]) if isinstance(g.get("created_at"), datetime) else g.get("created_at"),
    }

@api.post("/Groups")
async def group_create(body: GroupCreate, user: dict = Depends(require_user)):
    doc = {
        "group_id": new_id("g_"),
        "user_id": user["user_id"],
        "name": body.name,
        "members": body.members,
        "expenses": [],
        "created_at": now_utc(),
    }
    insert_doc = doc.copy()
    await db.groups.insert_one(insert_doc)
    return {"group": _group_view(doc)}

@api.get("/Groups")
async def group_list(user: dict = Depends(require_user)):
    cur = db.groups.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1)
    return {"items": [_group_view(g) async for g in cur]}

@api.get("/Groups/{group_id}")
async def group_get(group_id: str, user: dict = Depends(require_user)):
    g = await db.groups.find_one({"group_id": group_id, "user_id": user["user_id"]}, {"_id": 0})
    if not g:
        raise HTTPException(404, "Group not found")
    view = _group_view(g)
    view["expenses"] = g.get("expenses", [])
    return {"group": view}

@api.post("/Groups/{group_id}/expenses")
async def group_add_expense(group_id: str, body: GroupExpense, user: dict = Depends(require_user)):
    g = await db.groups.find_one({"group_id": group_id, "user_id": user["user_id"]})
    if not g:
        raise HTTPException(404, "Group not found")
    expense = {
        "expense_id": new_id("ge_"),
        "amount": float(body.amount),
        "description": body.description,
        "paid_by": body.paid_by,
        "split_between": body.split_between or g.get("members", []),
        "date": iso(now_utc()),
    }
    await db.groups.update_one(
        {"group_id": group_id, "user_id": user["user_id"]},
        {"$push": {"expenses": expense}},
    )
    return {"expense": expense}

@api.delete("/Groups/{group_id}")
async def group_delete(group_id: str, user: dict = Depends(require_user)):
    res = await db.groups.delete_one({"group_id": group_id, "user_id": user["user_id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Group not found")
    return {"ok": True}

# ── AI ───────────────────────────────────────────────────────────────────────
async def _user_spend_context(user_id: str) -> str:
    now = now_utc()
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    cats: Dict[str, float] = {}
    total = 0.0
    cur = db.transactions.find(
        {"user_id": user_id, "date": {"$gte": start}}, {"_id": 0})
    async for t in cur:
        amt = float(t.get("amount", 0))
        total += amt
        cats[t.get("category", "Other")] = cats.get(t.get("category", "Other"), 0) + amt
    parts = [f"{c}: ₹{round(v)}" for c, v in sorted(cats.items(), key=lambda x: -x[1])[:5]]
    return f"Monthly spend so far: ₹{round(total)}. Top categories: {', '.join(parts) or 'none yet'}."

@api.get("/AI/finance-term")
async def ai_finance_term(user: dict = Depends(require_user)):
    term = random.choice(FINANCE_TERMS)
    context = await _user_spend_context(user["user_id"])
    system = (
        "You are Cent, a friendly finance coach for Indian GenZ users. "
        "Explain concepts in plain, punchy language. Use rupees (₹). "
        "Give practical, actionable advice. Never mention you're an AI."
    )
    prompt = (
        f"Term: {term}\n"
        f"User's spending context: {context}\n\n"
        "Return JSON with exactly these keys: "
        "{\"term\":\"...\",\"definition\":\"one crisp sentence, <=25 words\","
        "\"example\":\"a relatable Indian example, <=40 words\","
        "\"tip\":\"a personal tip tied to their spending, <=40 words, starts with an action verb\"}"
        " Return only valid JSON, no markdown fences."
    )
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"term-{user['user_id']}",
            system_message=system,
        ).with_model("openai", "gpt-4.1-mini")
        resp = await chat.send_message(UserMessage(text=prompt))
        text = str(resp).strip()
        if text.startswith("```"):
            text = text.strip("`").split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        data = _json.loads(text)
        return data
    except Exception as e:
        log.warning(f"AI finance term fallback: {e}")
        return {
            "term": term,
            "definition": f"{term} is a common personal finance concept every young adult should know.",
            "example": "Think of it as a habit — small, consistent, and powerful over time.",
            "tip": "Automate savings the day your salary hits — future you will thank you.",
        }

@api.get("/AI/insight")
async def ai_insight(user: dict = Depends(require_user)):
    context = await _user_spend_context(user["user_id"])
    system = "You are Cent, a friendly finance coach. Reply with ONE punchy sentence, <=25 words, no preamble, no emojis."
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"insight-{user['user_id']}",
            system_message=system,
        ).with_model("openai", "gpt-4.1-mini")
        prompt = f"{context}\nGive one sharp, personalized savings insight."
        resp = await chat.send_message(UserMessage(text=prompt))
        return {"insight": str(resp).strip().strip('"')}
    except Exception as e:
        log.warning(f"AI insight fallback: {e}")
        return {"insight": "Track a few more transactions and I'll spot patterns you can save on."}

@api.post("/AI/chat")
async def ai_chat(body: ChatMessage, user: dict = Depends(require_user)):
    context = await _user_spend_context(user["user_id"])
    session_id = body.session_id or f"chat-{user['user_id']}"
    system = (
        "You are Cent, a friendly, witty finance coach for Indian GenZ users. "
        "Keep replies short (2-4 sentences), use rupees (₹), and give actionable steps. "
        "Reference the user's actual spending when relevant. Never mention you're an AI."
        f"\n\nUser context: {context}"
    )
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=session_id,
            system_message=system,
        ).with_model("openai", "gpt-4.1-mini")
        resp = await chat.send_message(UserMessage(text=body.message))
        text = str(resp).strip()
        await db.chat_messages.insert_one({
            "user_id": user["user_id"],
            "session_id": session_id,
            "user_text": body.message,
            "bot_text": text,
            "created_at": now_utc(),
        })
        return {"reply": text, "session_id": session_id}
    except Exception as e:
        log.error(f"AI chat error: {e}")
        return {"reply": "I'm having trouble thinking right now — try again in a moment.", "session_id": session_id}

@api.get("/AI/chat/history")
async def ai_chat_history(user: dict = Depends(require_user), session_id: Optional[str] = None):
    q = {"user_id": user["user_id"]}
    if session_id:
        q["session_id"] = session_id
    cur = db.chat_messages.find(q, {"_id": 0}).sort("created_at", 1).limit(200)
    items = []
    async for m in cur:
        items.append({
            "user_text": m["user_text"], "bot_text": m["bot_text"],
            "created_at": iso(m["created_at"]) if isinstance(m.get("created_at"), datetime) else m.get("created_at"),
        })
    return {"items": items}

# ── Stripe / Cent Pro ────────────────────────────────────────────────────────
PLANS = {
    "monthly": {"amount": 9900, "currency": "inr", "name": "Cent Pro Monthly", "interval": "month", "days": 30},
    "yearly":  {"amount": 89900, "currency": "inr", "name": "Cent Pro Yearly", "interval": "year",  "days": 365},
}

class CheckoutRequest(BaseModel):
    plan: str  # "monthly" | "yearly"
    return_url: Optional[str] = None

@api.post("/Billing/checkout")
async def billing_checkout(body: CheckoutRequest, user: dict = Depends(require_user)):
    if body.plan not in PLANS:
        raise HTTPException(400, "Invalid plan")
    if not STRIPE_API_KEY:
        raise HTTPException(500, "Stripe not configured")

    p = PLANS[body.plan]
    base_return = body.return_url or APP_URL
    # Attach session id placeholder so we can verify on return
    success_url = f"{base_return}?checkout=success&session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{base_return}?checkout=cancel"

    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": p["currency"],
                    "product_data": {"name": p["name"], "description": "Unlock unlimited AI chats, deep analytics, PDF+CSV export, and premium finance insights."},
                    "recurring": {"interval": p["interval"]},
                    "unit_amount": p["amount"],
                },
                "quantity": 1,
            }],
            customer_email=user.get("email"),
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"user_id": user["user_id"], "plan": body.plan},
            subscription_data={"metadata": {"user_id": user["user_id"], "plan": body.plan}},
        )
        # Record intent
        await db.billing_sessions.insert_one({
            "session_id": session.id,
            "user_id": user["user_id"],
            "plan": body.plan,
            "amount": p["amount"],
            "status": "pending",
            "created_at": now_utc(),
        })
        return {"url": session.url, "session_id": session.id}
    except Exception as e:
        log.error(f"Stripe checkout error: {e}")
        raise HTTPException(500, f"Checkout failed: {e}")

@api.get("/Billing/status")
async def billing_status(session_id: str, user: dict = Depends(require_user)):
    """Called by app after redirect to verify + activate Pro."""
    if not session_id:
        raise HTTPException(400, "session_id required")
    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception as e:
        raise HTTPException(400, f"Invalid session: {e}")

    if session.metadata.get("user_id") != user["user_id"]:
        raise HTTPException(403, "Not your session")

    paid = session.payment_status == "paid" or session.status == "complete"
    plan = session.metadata.get("plan", "monthly")
    if paid:
        expires = now_utc() + timedelta(days=PLANS.get(plan, PLANS["monthly"])["days"])
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {
                "is_pro": True,
                "pro_plan": plan,
                "pro_expires_at": expires,
                "stripe_customer_id": session.customer,
            }},
        )
        await db.billing_sessions.update_one(
            {"session_id": session_id},
            {"$set": {"status": "paid", "confirmed_at": now_utc()}},
        )
        updated = await get_user_by_id(user["user_id"])
        return {"paid": True, "plan": plan, "user": _user_view(updated)}
    return {"paid": False}

@api.get("/Billing/plans")
async def billing_plans():
    return {"plans": [
        {"id": "monthly", "name": "Cent Pro Monthly", "amount": 99,  "currency": "INR", "interval": "month", "highlight": "Cancel anytime"},
        {"id": "yearly",  "name": "Cent Pro Yearly",  "amount": 899, "currency": "INR", "interval": "year",  "highlight": "Save 24% · 2 months free"},
    ]}

@api.post("/Billing/mock-activate")
async def billing_mock_activate(body: dict, user: dict = Depends(require_user)):
    """Dev helper: activate Pro without going through Stripe checkout.
    Only usable when STRIPE_API_KEY is the emergent test key.
    """
    if not STRIPE_API_KEY.startswith("sk_test"):
        raise HTTPException(403, "Only allowed in test mode")
    plan = body.get("plan", "monthly")
    expires = now_utc() + timedelta(days=PLANS.get(plan, PLANS["monthly"])["days"])
    await db.users.update_one(
        {"user_id": user["user_id"]},
        {"$set": {"is_pro": True, "pro_plan": plan, "pro_expires_at": expires}},
    )
    updated = await get_user_by_id(user["user_id"])
    return {"ok": True, "user": _user_view(updated)}

# ── Meta ─────────────────────────────────────────────────────────────────────
@api.get("/")
async def root():
    return {"service": "centsible", "status": "ok"}

@api.get("/health")
async def health():
    return {"ok": True, "time": iso(now_utc())}

@api.get("/categories")
async def categories():
    return {"items": CATEGORIES}

# ── Startup ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("email", unique=True, sparse=True)
    await db.users.create_index("phone", unique=True, sparse=True)
    await db.transactions.create_index([("user_id", 1), ("date", -1)])
    await db.transactions.create_index([("user_id", 1), ("dedup_key", 1)], sparse=True)
    await db.user_sessions.create_index("session_token", unique=True)
    await db.user_sessions.create_index("expires_at", expireAfterSeconds=0)
    await db.groups.create_index([("user_id", 1), ("created_at", -1)])
    await db.income.create_index([("user_id", 1), ("date", -1)])
    log.info("Centsible API ready.")

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
