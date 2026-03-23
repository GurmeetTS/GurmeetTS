from fastapi import FastAPI, APIRouter, Depends, HTTPException, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os, logging, uuid, base64, hashlib
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import bcrypt
from jose import JWTError, jwt
from cryptography.fernet import Fernet
import graph_service as gs

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

SECRET_KEY = os.environ.get('SECRET_KEY', 'm365-analytics-secret-key-2025')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

security = HTTPBearer()

# Derive Fernet key from SECRET_KEY
def _fernet_key():
    raw = hashlib.sha256(SECRET_KEY.encode()).digest()
    return base64.urlsafe_b64encode(raw)

cipher = Fernet(_fernet_key())

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ─────────────────────────── Models ───────────────────────────
class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class TenantCreate(BaseModel):
    name: str
    mode: str  # "demo" | "real"
    azure_tenant_id: str = ""
    client_id: str = ""
    client_secret: str = ""
    description: str = ""

class TenantUpdate(BaseModel):
    name: Optional[str] = None
    mode: Optional[str] = None
    azure_tenant_id: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    description: Optional[str] = None

# ─────────────────────────── Auth Helpers ───────────────────────────
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())

def create_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> str:
    try:
        payload = jwt.decode(creds.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ─────────────────────────── Tenant Helper ───────────────────────────
async def get_real_tenant_creds(tenant_id: Optional[str], user_id: str) -> Optional[dict]:
    """Return decrypted Graph API credentials for a real tenant, or None."""
    if not tenant_id:
        return None
    tenant = await db.tenants.find_one({"id": tenant_id, "user_id": user_id}, {"_id": 0})
    if not tenant or tenant.get("mode") != "real":
        return None
    try:
        secret = cipher.decrypt(tenant["client_secret_encrypted"].encode()).decode()
        return {
            "azure_tenant_id": tenant["azure_tenant_id"],
            "client_id": tenant["client_id"],
            "client_secret": secret,
        }
    except Exception as e:
        logger.warning(f"Failed to decrypt secret for tenant {tenant_id}: {e}")
        return None

# ─────────────────────────── Auth Routes ───────────────────────────
@api_router.post("/auth/register")
async def register(data: UserRegister):
    if await db.users.find_one({"email": data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "name": data.name, "email": data.email,
        "password": hash_password(data.password),
        "role": "Global Admin", "tenant": "Contoso Corporation",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user)
    token = create_token({"sub": str(result.inserted_id), "email": data.email})
    return {"token": token, "user": {"name": data.name, "email": data.email, "role": "Global Admin", "tenant": "Contoso Corporation"}}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 1, "name": 1, "email": 1, "password": 1, "role": 1, "tenant": 1})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": str(user["_id"]), "email": user["email"]})
    return {"token": token, "user": {"name": user["name"], "email": user["email"], "role": user.get("role", "Global Admin"), "tenant": user.get("tenant", "Contoso Corporation")}}

# ─────────────────────────── Tenant Management ───────────────────────────
@api_router.get("/tenants")
async def list_tenants(user_id: str = Depends(get_current_user)):
    docs = await db.tenants.find({"user_id": user_id}, {"_id": 0, "client_secret_encrypted": 0}).to_list(100)
    return docs

@api_router.post("/tenants")
async def create_tenant(data: TenantCreate, user_id: str = Depends(get_current_user)):
    if data.mode == "real" and not (data.azure_tenant_id and data.client_id and data.client_secret):
        raise HTTPException(status_code=400, detail="Real tenant requires Tenant ID, Client ID, and Client Secret")
    
    secret_encrypted = ""
    if data.client_secret:
        secret_encrypted = cipher.encrypt(data.client_secret.encode()).decode()

    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "name": data.name,
        "mode": data.mode,
        "azure_tenant_id": data.azure_tenant_id,
        "client_id": data.client_id,
        "client_secret_encrypted": secret_encrypted,
        "description": data.description,
        "status": "demo" if data.mode == "demo" else "pending",
        "status_message": "",
        "last_sync_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tenants.insert_one(doc)
    doc.pop("client_secret_encrypted", None)
    doc.pop("_id", None)
    return doc

@api_router.put("/tenants/{tenant_id}")
async def update_tenant(tenant_id: str, data: TenantUpdate, user_id: str = Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id, "user_id": user_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    update = {}
    if data.name is not None: update["name"] = data.name
    if data.mode is not None: update["mode"] = data.mode
    if data.azure_tenant_id is not None: update["azure_tenant_id"] = data.azure_tenant_id
    if data.client_id is not None: update["client_id"] = data.client_id
    if data.client_secret is not None and data.client_secret != "":
        update["client_secret_encrypted"] = cipher.encrypt(data.client_secret.encode()).decode()
    if data.description is not None: update["description"] = data.description

    await db.tenants.update_one({"id": tenant_id}, {"$set": update})
    doc = await db.tenants.find_one({"id": tenant_id}, {"_id": 0, "client_secret_encrypted": 0})
    return doc

@api_router.delete("/tenants/{tenant_id}")
async def delete_tenant(tenant_id: str, user_id: str = Depends(get_current_user)):
    result = await db.tenants.delete_one({"id": tenant_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return {"message": "Tenant deleted"}

@api_router.post("/tenants/{tenant_id}/test-connection")
async def test_tenant_connection(tenant_id: str, user_id: str = Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id, "user_id": user_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if tenant.get("mode") != "real":
        return {"success": True, "message": "Demo tenant — no connection required"}

    try:
        secret = cipher.decrypt(tenant["client_secret_encrypted"].encode()).decode()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to decrypt credentials")

    result = await gs.test_connection(tenant["azure_tenant_id"], tenant["client_id"], secret)
    
    status = "connected" if result["success"] else "error"
    await db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {"status": status, "status_message": result.get("error", result.get("org_name", ""))}}
    )
    return result

@api_router.post("/tenants/{tenant_id}/sync")
async def sync_tenant(tenant_id: str, user_id: str = Depends(get_current_user)):
    tenant = await db.tenants.find_one({"id": tenant_id, "user_id": user_id})
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    if tenant.get("mode") != "real":
        return {"message": "Demo tenant — sync not required"}

    try:
        secret = cipher.decrypt(tenant["client_secret_encrypted"].encode()).decode()
    except Exception:
        raise HTTPException(status_code=400, detail="Failed to decrypt credentials")

    errors = []
    synced = []
    creds = {"azure_tenant_id": tenant["azure_tenant_id"], "client_id": tenant["client_id"], "client_secret": secret}

    for name, fetcher in [
        ("signin_logs", gs.get_signin_logs),
        ("risky_users", gs.get_risky_users),
        ("mfa_status", gs.get_mfa_status),
        ("conditional_access", gs.get_conditional_access),
    ]:
        try:
            data = await fetcher(**creds)
            await db.tenant_cache.replace_one(
                {"tenant_id": tenant_id, "data_type": name},
                {"tenant_id": tenant_id, "data_type": name, "data": data, "synced_at": datetime.now(timezone.utc).isoformat()},
                upsert=True
            )
            synced.append(name)
        except Exception as e:
            logger.error(f"Sync failed for {name}: {e}")
            errors.append(f"{name}: {str(e)[:100]}")

    await db.tenants.update_one(
        {"id": tenant_id},
        {"$set": {"last_sync_at": datetime.now(timezone.utc).isoformat(), "status": "connected" if not errors else "error"}}
    )
    return {"synced": synced, "errors": errors, "message": f"Synced {len(synced)} datasets"}

# ─────────────────────────── Dashboard ───────────────────────────
@api_router.get("/dashboard/overview")
async def dashboard_overview(
    tenantId: Optional[str] = Query(default=None),
    user: str = Depends(get_current_user)
):
    creds = await get_real_tenant_creds(tenantId, user)
    if creds:
        try:
            return await gs.get_dashboard_overview(**creds)
        except Exception as e:
            logger.warning(f"Graph API fallback dashboard [{tenantId}]: {e}")

    return {
        "tenant_health_score": 87, "secure_score": 72, "secure_score_max": 100,
        "total_users": 1248, "active_users_30d": 934, "inactive_users": 314,
        "licensed_users": 1100, "unlicensed_users": 148,
        "storage_used_gb": 8420, "storage_total_gb": 15360, "storage_percent": 54.8,
        "mfa_enabled_percent": 78.3, "risky_users_count": 12, "active_alerts": 7,
        "license_breakdown": [
            {"name": "M365 E3", "assigned": 650, "total": 700},
            {"name": "M365 E1", "assigned": 280, "total": 300},
            {"name": "Teams Phone", "assigned": 145, "total": 150},
            {"name": "Power BI Pro", "assigned": 85, "total": 100},
        ],
        "storage_trends": [
            {"month": "Sep", "used": 6800}, {"month": "Oct", "used": 7100},
            {"month": "Nov", "used": 7450}, {"month": "Dec", "used": 7800},
            {"month": "Jan", "used": 8100}, {"month": "Feb", "used": 8420},
        ],
        "user_activity_trend": [
            {"date": "Mon", "active": 820, "inactive": 428},
            {"date": "Tue", "active": 890, "inactive": 358},
            {"date": "Wed", "active": 934, "inactive": 314},
            {"date": "Thu", "active": 870, "inactive": 378},
            {"date": "Fri", "active": 780, "inactive": 468},
            {"date": "Sat", "active": 320, "inactive": 928},
            {"date": "Sun", "active": 210, "inactive": 1038},
        ],
        "recent_alerts": [
            {"id": "a1", "title": "Suspicious Login Detected", "severity": "High", "time": "2m ago", "source": "Entra ID"},
            {"id": "a2", "title": "External Forwarding Rule Created", "severity": "Critical", "time": "1h ago", "source": "Exchange"},
            {"id": "a3", "title": "Impossible Travel Detected", "severity": "High", "time": "3h ago", "source": "Entra ID"},
            {"id": "a4", "title": "MFA Disabled on Admin Account", "severity": "High", "time": "5h ago", "source": "Entra ID"},
            {"id": "a5", "title": "Malware Emails Blocked (22)", "severity": "Medium", "time": "8h ago", "source": "Exchange"},
        ]
    }

# ─────────────────────────── Exchange Online ───────────────────────────
@api_router.get("/exchange/mailbox-usage")
async def mailbox_usage(tenantId: Optional[str] = Query(default=None), user: str = Depends(get_current_user)):
    creds = await get_real_tenant_creds(tenantId, user)
    if creds:
        try:
            return await gs.get_mailbox_usage(**creds)
        except Exception as e:
            logger.warning(f"Graph API fallback mailbox-usage [{tenantId}]: {e}")
    return {"data": [
        {"user": "john.smith@contoso.com", "display_name": "John Smith", "mailbox_type": "UserMailbox", "storage_mb": 8420, "quota_mb": 51200, "item_count": 12450, "last_logon": "2025-02-10", "status": "Active"},
        {"user": "sarah.johnson@contoso.com", "display_name": "Sarah Johnson", "mailbox_type": "UserMailbox", "storage_mb": 6830, "quota_mb": 51200, "item_count": 9870, "last_logon": "2025-02-11", "status": "Active"},
        {"user": "mike.davis@contoso.com", "display_name": "Mike Davis", "mailbox_type": "UserMailbox", "storage_mb": 15200, "quota_mb": 51200, "item_count": 22100, "last_logon": "2025-02-09", "status": "Active"},
        {"user": "emily.chen@contoso.com", "display_name": "Emily Chen", "mailbox_type": "UserMailbox", "storage_mb": 2340, "quota_mb": 51200, "item_count": 3450, "last_logon": "2025-01-15", "status": "Inactive"},
        {"user": "robert.wilson@contoso.com", "display_name": "Robert Wilson", "mailbox_type": "SharedMailbox", "storage_mb": 18900, "quota_mb": 51200, "item_count": 35600, "last_logon": "2025-02-11", "status": "Active"},
        {"user": "lisa.anderson@contoso.com", "display_name": "Lisa Anderson", "mailbox_type": "UserMailbox", "storage_mb": 4200, "quota_mb": 51200, "item_count": 6700, "last_logon": "2025-02-08", "status": "Active"},
        {"user": "david.martinez@contoso.com", "display_name": "David Martinez", "mailbox_type": "UserMailbox", "storage_mb": 9800, "quota_mb": 51200, "item_count": 15200, "last_logon": "2025-02-11", "status": "Active"},
        {"user": "jennifer.taylor@contoso.com", "display_name": "Jennifer Taylor", "mailbox_type": "UserMailbox", "storage_mb": 1200, "quota_mb": 51200, "item_count": 1800, "last_logon": "2024-11-20", "status": "Inactive"},
        {"user": "it.helpdesk@contoso.com", "display_name": "IT Help Desk", "mailbox_type": "SharedMailbox", "storage_mb": 25600, "quota_mb": 51200, "item_count": 48200, "last_logon": "2025-02-11", "status": "Active"},
        {"user": "kevin.brown@contoso.com", "display_name": "Kevin Brown", "mailbox_type": "UserMailbox", "storage_mb": 3400, "quota_mb": 51200, "item_count": 5100, "last_logon": "2025-02-07", "status": "Active"},
        {"user": "nancy.white@contoso.com", "display_name": "Nancy White", "mailbox_type": "UserMailbox", "storage_mb": 7200, "quota_mb": 51200, "item_count": 10800, "last_logon": "2025-02-10", "status": "Active"},
        {"user": "patricia.lee@contoso.com", "display_name": "Patricia Lee", "mailbox_type": "UserMailbox", "storage_mb": 11400, "quota_mb": 51200, "item_count": 18900, "last_logon": "2025-02-11", "status": "Active"},
        {"user": "christopher.hall@contoso.com", "display_name": "Christopher Hall", "mailbox_type": "UserMailbox", "storage_mb": 890, "quota_mb": 51200, "item_count": 1200, "last_logon": "2024-12-05", "status": "Inactive"},
        {"user": "barbara.king@contoso.com", "display_name": "Barbara King", "mailbox_type": "UserMailbox", "storage_mb": 5600, "quota_mb": 51200, "item_count": 8400, "last_logon": "2025-02-09", "status": "Active"},
    ], "summary": {"total_mailboxes": 1248, "active": 934, "inactive": 314, "shared": 87, "room": 24, "total_storage_gb": 8420}}

@api_router.get("/exchange/inactive-mailboxes")
async def inactive_mailboxes(tenantId: Optional[str] = Query(default=None), user: str = Depends(get_current_user)):
    return {"data": [
        {"user": "jennifer.taylor@contoso.com", "display_name": "Jennifer Taylor", "department": "Marketing", "last_logon": "2024-11-20", "days_inactive": 83, "mailbox_size_mb": 1200, "license": "Microsoft 365 E1", "risk_level": "Medium"},
        {"user": "emily.chen@contoso.com", "display_name": "Emily Chen", "department": "Engineering", "last_logon": "2025-01-15", "days_inactive": 27, "mailbox_size_mb": 2340, "license": "Microsoft 365 E3", "risk_level": "Low"},
        {"user": "christopher.hall@contoso.com", "display_name": "Christopher Hall", "department": "Sales", "last_logon": "2024-12-05", "days_inactive": 68, "mailbox_size_mb": 890, "license": "Microsoft 365 E1", "risk_level": "Medium"},
        {"user": "mark.thompson@contoso.com", "display_name": "Mark Thompson", "department": "Finance", "last_logon": "2024-09-12", "days_inactive": 152, "mailbox_size_mb": 3200, "license": "Microsoft 365 E3", "risk_level": "High"},
        {"user": "susan.roberts@contoso.com", "display_name": "Susan Roberts", "department": "HR", "last_logon": "2024-10-01", "days_inactive": 133, "mailbox_size_mb": 1800, "license": "Microsoft 365 E1", "risk_level": "High"},
        {"user": "james.campbell@contoso.com", "display_name": "James Campbell", "department": "Legal", "last_logon": "2025-01-05", "days_inactive": 37, "mailbox_size_mb": 4100, "license": "Microsoft 365 E3", "risk_level": "Low"},
        {"user": "patricia.mitchell@contoso.com", "display_name": "Patricia Mitchell", "department": "Operations", "last_logon": "2024-11-01", "days_inactive": 102, "mailbox_size_mb": 2700, "license": "Microsoft 365 E1", "risk_level": "High"},
        {"user": "thomas.perez@contoso.com", "display_name": "Thomas Perez", "department": "Engineering", "last_logon": "2025-01-20", "days_inactive": 22, "mailbox_size_mb": 5600, "license": "Microsoft 365 E3", "risk_level": "Low"},
        {"user": "richard.phillips@contoso.com", "display_name": "Richard Phillips", "department": "Finance", "last_logon": "2024-08-15", "days_inactive": 180, "mailbox_size_mb": 7200, "license": "Microsoft 365 E3", "risk_level": "High"},
    ], "total": 314, "high_risk": 4, "medium_risk": 2, "low_risk": 3}

@api_router.get("/exchange/mail-traffic")
async def mail_traffic(tenantId: Optional[str] = Query(default=None), user: str = Depends(get_current_user)):
    return {"trend": [
        {"date": "Feb 1", "sent": 4250, "received": 8900, "spam": 340, "malware": 12},
        {"date": "Feb 2", "sent": 3800, "received": 7600, "spam": 290, "malware": 8},
        {"date": "Feb 3", "sent": 1200, "received": 2400, "spam": 90, "malware": 2},
        {"date": "Feb 5", "sent": 4580, "received": 9200, "spam": 380, "malware": 15},
        {"date": "Feb 6", "sent": 4900, "received": 9800, "spam": 420, "malware": 18},
        {"date": "Feb 7", "sent": 5100, "received": 10200, "spam": 450, "malware": 22},
        {"date": "Feb 8", "sent": 4750, "received": 9500, "spam": 390, "malware": 14},
        {"date": "Feb 10", "sent": 4300, "received": 8600, "spam": 310, "malware": 11},
        {"date": "Feb 11", "sent": 4680, "received": 9360, "spam": 360, "malware": 16},
    ], "summary": {"total_sent": 45740, "total_received": 94060, "total_spam": 3351, "total_malware": 128, "spam_filter_rate": 97.8},
    "top_senders": [
        {"user": "john.smith@contoso.com", "sent": 1240, "received": 2180},
        {"user": "sarah.johnson@contoso.com", "sent": 980, "received": 1890},
        {"user": "mike.davis@contoso.com", "sent": 1100, "received": 2340},
    ]}

@api_router.get("/exchange/forwarding-rules")
async def forwarding_rules(tenantId: Optional[str] = Query(default=None), user: str = Depends(get_current_user)):
    return {"data": [
        {"user": "james.campbell@contoso.com", "display_name": "James Campbell", "rule_name": "Forward to personal", "forward_to": "james.campbell@gmail.com", "rule_type": "External", "created_date": "2025-01-15", "status": "Active", "risk_level": "High"},
        {"user": "patricia.lee@contoso.com", "display_name": "Patricia Lee", "rule_name": "Copy to team", "forward_to": "team-archive@contoso.com", "rule_type": "Internal", "created_date": "2024-12-01", "status": "Active", "risk_level": "Low"},
        {"user": "mark.thompson@contoso.com", "display_name": "Mark Thompson", "rule_name": "Auto forward all", "forward_to": "m.thompson@yahoo.com", "rule_type": "External", "created_date": "2025-02-01", "status": "Active", "risk_level": "Critical"},
        {"user": "kevin.brown@contoso.com", "display_name": "Kevin Brown", "rule_name": "Backup copy", "forward_to": "kb-backup@contoso.com", "rule_type": "Internal", "created_date": "2024-11-20", "status": "Active", "risk_level": "Low"},
        {"user": "nancy.white@contoso.com", "display_name": "Nancy White", "rule_name": "External delegate", "forward_to": "nwhite@vendor.com", "rule_type": "External", "created_date": "2025-01-28", "status": "Active", "risk_level": "High"},
    ], "summary": {"total_rules": 5, "external_rules": 3, "internal_rules": 2, "critical_risk": 1, "high_risk": 2, "low_risk": 2}}

# ─────────────────────────── Entra ID ───────────────────────────
@api_router.get("/entra/signin-logs")
async def signin_logs(tenantId: Optional[str] = Query(default=None), user: str = Depends(get_current_user)):
    creds = await get_real_tenant_creds(tenantId, user)
    if creds:
        try:
            return await gs.get_signin_logs(**creds)
        except Exception as e:
            logger.warning(f"Graph API fallback signin-logs [{tenantId}]: {e}")
    return {"data": [
        {"user": "john.smith@contoso.com", "display_name": "John Smith", "ip_address": "192.168.1.100", "location": "New York, US", "device": "Windows 11 / Chrome", "app": "Microsoft 365", "status": "Success", "risk_level": "None", "timestamp": "2025-02-11 09:23:45"},
        {"user": "sarah.johnson@contoso.com", "display_name": "Sarah Johnson", "ip_address": "185.220.101.45", "location": "Amsterdam, NL", "device": "macOS / Safari", "app": "Exchange Online", "status": "Success", "risk_level": "Medium", "timestamp": "2025-02-11 08:45:12"},
        {"user": "mike.davis@contoso.com", "display_name": "Mike Davis", "ip_address": "10.0.0.45", "location": "Chicago, US", "device": "Windows 10 / Edge", "app": "SharePoint Online", "status": "Success", "risk_level": "None", "timestamp": "2025-02-11 09:10:33"},
        {"user": "emily.chen@contoso.com", "display_name": "Emily Chen", "ip_address": "172.16.8.92", "location": "San Francisco, US", "device": "iOS / Mobile", "app": "Microsoft Teams", "status": "Failed", "risk_level": "Low", "timestamp": "2025-02-11 07:58:20"},
        {"user": "mark.thompson@contoso.com", "display_name": "Mark Thompson", "ip_address": "91.108.4.156", "location": "Moscow, RU", "device": "Linux / Firefox", "app": "Azure Portal", "status": "Blocked", "risk_level": "High", "timestamp": "2025-02-11 06:33:18"},
        {"user": "robert.wilson@contoso.com", "display_name": "Robert Wilson", "ip_address": "203.0.113.45", "location": "Beijing, CN", "device": "Android / Chrome", "app": "OneDrive", "status": "Blocked", "risk_level": "High", "timestamp": "2025-02-11 05:12:44"},
        {"user": "lisa.anderson@contoso.com", "display_name": "Lisa Anderson", "ip_address": "192.168.2.55", "location": "Austin, US", "device": "Windows 11 / Chrome", "app": "Microsoft 365", "status": "Success", "risk_level": "None", "timestamp": "2025-02-11 09:30:00"},
    ], "summary": {"total_signins": 15847, "successful": 15312, "failed": 412, "blocked": 123, "unique_users": 934, "suspicious_locations": 8}}

@api_router.get("/entra/risky-users")
async def risky_users(tenantId: Optional[str] = Query(default=None), user: str = Depends(get_current_user)):
    creds = await get_real_tenant_creds(tenantId, user)
    if creds:
        try:
            return await gs.get_risky_users(**creds)
        except Exception as e:
            logger.warning(f"Graph API fallback risky-users [{tenantId}]: {e}")
    return {"data": [
        {"user": "mark.thompson@contoso.com", "display_name": "Mark Thompson", "department": "Finance", "risk_level": "High", "risk_detail": "Unfamiliar sign-in properties", "last_risk_event": "2025-02-11", "sign_in_location": "Moscow, RU", "mfa_enabled": True, "status": "At Risk"},
        {"user": "robert.wilson@contoso.com", "display_name": "Robert Wilson", "department": "Operations", "risk_level": "High", "risk_detail": "Impossible travel", "last_risk_event": "2025-02-11", "sign_in_location": "Beijing, CN", "mfa_enabled": False, "status": "At Risk"},
        {"user": "sarah.johnson@contoso.com", "display_name": "Sarah Johnson", "department": "Sales", "risk_level": "Medium", "risk_detail": "Anonymous IP address", "last_risk_event": "2025-02-11", "sign_in_location": "Amsterdam, NL", "mfa_enabled": True, "status": "At Risk"},
        {"user": "james.campbell@contoso.com", "display_name": "James Campbell", "department": "Legal", "risk_level": "High", "risk_detail": "Suspicious inbox manipulation", "last_risk_event": "2025-02-08", "sign_in_location": "New York, US", "mfa_enabled": True, "status": "Confirmed Compromised"},
        {"user": "barbara.turner@contoso.com", "display_name": "Barbara Turner", "department": "Marketing", "risk_level": "Low", "risk_detail": "Leaked credentials", "last_risk_event": "2025-02-09", "sign_in_location": "London, UK", "mfa_enabled": False, "status": "At Risk"},
    ], "summary": {"total_risky": 12, "high_risk": 3, "medium_risk": 5, "low_risk": 4, "confirmed_compromised": 1, "remediated": 2, "at_risk": 9}}

@api_router.get("/entra/mfa-status")
async def mfa_status(tenantId: Optional[str] = Query(default=None), user: str = Depends(get_current_user)):
    creds = await get_real_tenant_creds(tenantId, user)
    if creds:
        try:
            return await gs.get_mfa_status(**creds)
        except Exception as e:
            logger.warning(f"Graph API fallback mfa-status [{tenantId}]: {e}")
    return {"data": [
        {"user": "john.smith@contoso.com", "display_name": "John Smith", "department": "IT", "mfa_state": "Enforced", "mfa_methods": ["Authenticator App", "Phone"], "last_mfa_use": "2025-02-11", "strong_auth": True},
        {"user": "sarah.johnson@contoso.com", "display_name": "Sarah Johnson", "department": "Sales", "mfa_state": "Enabled", "mfa_methods": ["SMS"], "last_mfa_use": "2025-02-10", "strong_auth": False},
        {"user": "mike.davis@contoso.com", "display_name": "Mike Davis", "department": "Engineering", "mfa_state": "Enforced", "mfa_methods": ["Authenticator App", "FIDO2"], "last_mfa_use": "2025-02-11", "strong_auth": True},
        {"user": "emily.chen@contoso.com", "display_name": "Emily Chen", "department": "Engineering", "mfa_state": "Disabled", "mfa_methods": [], "last_mfa_use": None, "strong_auth": False},
        {"user": "robert.wilson@contoso.com", "display_name": "Robert Wilson", "department": "Operations", "mfa_state": "Disabled", "mfa_methods": [], "last_mfa_use": None, "strong_auth": False},
        {"user": "lisa.anderson@contoso.com", "display_name": "Lisa Anderson", "department": "HR", "mfa_state": "Enforced", "mfa_methods": ["Authenticator App"], "last_mfa_use": "2025-02-11", "strong_auth": True},
        {"user": "kevin.brown@contoso.com", "display_name": "Kevin Brown", "department": "IT", "mfa_state": "Enforced", "mfa_methods": ["Authenticator App", "FIDO2", "Phone"], "last_mfa_use": "2025-02-11", "strong_auth": True},
        {"user": "jennifer.taylor@contoso.com", "display_name": "Jennifer Taylor", "department": "Marketing", "mfa_state": "Disabled", "mfa_methods": [], "last_mfa_use": None, "strong_auth": False},
    ], "summary": {"total_users": 1248, "enforced": 487, "enabled": 489, "disabled": 272, "enforced_percent": 39.0, "enabled_percent": 39.2, "disabled_percent": 21.8}}

@api_router.get("/entra/conditional-access")
async def conditional_access(tenantId: Optional[str] = Query(default=None), user: str = Depends(get_current_user)):
    creds = await get_real_tenant_creds(tenantId, user)
    if creds:
        try:
            return await gs.get_conditional_access(**creds)
        except Exception as e:
            logger.warning(f"Graph API fallback conditional-access [{tenantId}]: {e}")
    return {"policies": [
        {"name": "Require MFA for Admins", "state": "On", "users": "Admin Roles", "apps": "All Cloud Apps", "conditions": "Any Location", "grant_controls": "Require MFA", "created": "2024-01-15", "last_modified": "2024-12-01"},
        {"name": "Block Legacy Authentication", "state": "On", "users": "All Users", "apps": "All Cloud Apps", "conditions": "Legacy Auth Clients", "grant_controls": "Block", "created": "2024-02-20", "last_modified": "2024-08-15"},
        {"name": "Require Compliant Device", "state": "On", "users": "All Users", "apps": "Microsoft 365", "conditions": "External Networks", "grant_controls": "Require Compliant Device", "created": "2024-03-10", "last_modified": "2025-01-20"},
        {"name": "High Risk User Block", "state": "On", "users": "All Users", "apps": "All Cloud Apps", "conditions": "High Risk Sign-in", "grant_controls": "Block", "created": "2024-04-05", "last_modified": "2024-11-30"},
        {"name": "Privileged Identity Management", "state": "Report-Only", "users": "Global Admins", "apps": "Azure Portal", "conditions": "Any Platform", "grant_controls": "Require MFA + Compliant Device", "created": "2024-06-12", "last_modified": "2025-02-01"},
    ], "summary": {"total_policies": 8, "enabled": 5, "report_only": 2, "disabled": 1}}

# ─────────────────────────── Alerts ───────────────────────────
@api_router.get("/alerts")
async def get_alerts(tenantId: Optional[str] = Query(default=None), user: str = Depends(get_current_user)):
    return {"alerts": [
        {"id": "alert-001", "title": "Suspicious Login from Unfamiliar Location", "description": "User mark.thompson@contoso.com signed in from Moscow, Russia - a new location.", "severity": "High", "category": "Identity", "status": "Active", "user": "mark.thompson@contoso.com", "timestamp": "2025-02-11 06:33:18", "source": "Entra ID"},
        {"id": "alert-002", "title": "Impossible Travel Detected", "description": "User robert.wilson@contoso.com signed in from two geographically distant locations within 2 hours.", "severity": "High", "category": "Identity", "status": "Active", "user": "robert.wilson@contoso.com", "timestamp": "2025-02-11 05:12:44", "source": "Entra ID"},
        {"id": "alert-003", "title": "External Email Forwarding Rule Created", "description": "User mark.thompson@contoso.com created a rule forwarding all emails to m.thompson@yahoo.com.", "severity": "Critical", "category": "Exchange", "status": "Active", "user": "mark.thompson@contoso.com", "timestamp": "2025-02-11 08:45:00", "source": "Exchange Online"},
        {"id": "alert-004", "title": "MFA Not Enabled for Admin Account", "description": "Global Admin account emily.chen@contoso.com does not have MFA enabled.", "severity": "High", "category": "Compliance", "status": "Active", "user": "emily.chen@contoso.com", "timestamp": "2025-02-10 15:20:00", "source": "Entra ID"},
        {"id": "alert-005", "title": "Inactive Mailboxes with Active Licenses", "description": "152 users haven't accessed their mailboxes in 90+ days but hold active licenses.", "severity": "Medium", "category": "Exchange", "status": "Active", "user": "Multiple Users", "timestamp": "2025-02-10 12:00:00", "source": "Exchange Online"},
        {"id": "alert-006", "title": "Malware Detected in Email Traffic", "description": "22 malware-containing emails were detected and blocked in the last 24 hours.", "severity": "Medium", "category": "Security", "status": "Active", "user": "Multiple Users", "timestamp": "2025-02-11 07:00:00", "source": "Exchange Online"},
        {"id": "alert-007", "title": "Account Confirmed Compromised", "description": "User james.campbell@contoso.com confirmed compromised after suspicious inbox manipulation.", "severity": "Critical", "category": "Identity", "status": "Active", "user": "james.campbell@contoso.com", "timestamp": "2025-02-08 14:30:00", "source": "Entra ID"},
    ], "summary": {"total": 7, "critical": 2, "high": 3, "medium": 2, "low": 0, "active": 7, "resolved": 14}}

@api_router.get("/")
async def root():
    return {"message": "M365 Analytics API v1.0"}

# ─────────────────────────── App Setup ───────────────────────────
app.include_router(api_router)
app.add_middleware(
    CORSMiddleware, allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"], allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
