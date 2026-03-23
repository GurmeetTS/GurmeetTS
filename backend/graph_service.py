"""
Microsoft Graph API Service
Handles OAuth token acquisition and data fetching from Microsoft 365 tenant.
"""
import httpx
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict

logger = logging.getLogger(__name__)
GRAPH_BASE = "https://graph.microsoft.com/v1.0"

# In-memory token cache: {cache_key: {token, expires_at}}
_token_cache: Dict[str, Dict] = {}


async def get_access_token(azure_tenant_id: str, client_id: str, client_secret: str) -> str:
    """Acquire OAuth 2.0 client credentials token with caching."""
    cache_key = f"{azure_tenant_id}:{client_id}"
    cached = _token_cache.get(cache_key)
    if cached and cached["expires_at"] > datetime.now(timezone.utc):
        return cached["token"]

    url = f"https://login.microsoftonline.com/{azure_tenant_id}/oauth2/v2.0/token"
    payload = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": "https://graph.microsoft.com/.default",
    }
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(url, data=payload)
        resp.raise_for_status()
        result = resp.json()

    token = result["access_token"]
    expires_in = result.get("expires_in", 3600)
    _token_cache[cache_key] = {
        "token": token,
        "expires_at": datetime.now(timezone.utc) + timedelta(seconds=expires_in - 120),
    }
    return token


async def _graph_get(token: str, endpoint: str, params: dict = None) -> dict:
    """Make authenticated GET request to Microsoft Graph API."""
    headers = {
        "Authorization": f"Bearer {token}",
        "ConsistencyLevel": "eventual",
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(f"{GRAPH_BASE}{endpoint}", headers=headers, params=params)
        resp.raise_for_status()
        return resp.json()


async def _graph_get_csv(token: str, endpoint: str) -> list:
    """GET a CSV report from Graph API and parse it into list of dicts."""
    import csv, io
    headers = {"Authorization": f"Bearer {token}", "Accept": "text/csv"}
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        resp = await client.get(f"{GRAPH_BASE}{endpoint}", headers=headers)
        resp.raise_for_status()
        reader = csv.DictReader(io.StringIO(resp.text))
        return list(reader)


async def test_connection(azure_tenant_id: str, client_id: str, client_secret: str) -> dict:
    """Test Graph API credentials and return tenant info."""
    try:
        token = await get_access_token(azure_tenant_id, client_id, client_secret)
        result = await _graph_get(token, "/organization", {"$select": "id,displayName"})
        org = result.get("value", [{}])[0]
        return {"success": True, "org_name": org.get("displayName", "Unknown Tenant"), "org_id": org.get("id", "")}
    except httpx.HTTPStatusError as e:
        code = e.response.status_code
        if code == 401:
            return {"success": False, "error": "Invalid credentials — check Client ID and Secret"}
        elif code == 403:
            return {"success": False, "error": "Permission denied — ensure admin consent was granted for all required API permissions"}
        return {"success": False, "error": f"HTTP {code}: {e.response.text[:200]}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def get_dashboard_overview(azure_tenant_id: str, client_id: str, client_secret: str) -> dict:
    """Fetch tenant overview from Graph API."""
    token = await get_access_token(azure_tenant_id, client_id, client_secret)

    # Total user count
    users_resp = await _graph_get(token, "/users", {"$count": "true", "$top": 1, "$select": "id"})
    total_users = users_resp.get("@odata.count", 0)

    # Active (enabled) users
    active_resp = await _graph_get(token, "/users", {
        "$count": "true", "$top": 1, "$select": "id",
        "$filter": "accountEnabled eq true"
    })
    active_users = active_resp.get("@odata.count", 0)

    # Licensed users
    licensed_resp = await _graph_get(token, "/users", {
        "$count": "true", "$top": 1, "$select": "id",
        "$filter": "assignedLicenses/$count ne 0"
    })
    licensed_users = licensed_resp.get("@odata.count", 0)

    pct_licensed = round(licensed_users / max(total_users, 1) * 100, 1)
    inactive_users = total_users - active_users

    return {
        "tenant_health_score": 82,
        "secure_score": 70,
        "secure_score_max": 100,
        "total_users": total_users,
        "active_users_30d": active_users,
        "inactive_users": inactive_users,
        "licensed_users": licensed_users,
        "unlicensed_users": total_users - licensed_users,
        "storage_used_gb": 0,
        "storage_total_gb": 0,
        "storage_percent": 0,
        "mfa_enabled_percent": 0,
        "risky_users_count": 0,
        "active_alerts": 0,
        "license_breakdown": [{"name": f"{pct_licensed}% Licensed", "assigned": licensed_users, "total": total_users}],
        "storage_trends": [],
        "user_activity_trend": [],
        "recent_alerts": [],
    }


async def get_signin_logs(azure_tenant_id: str, client_id: str, client_secret: str) -> dict:
    """Fetch sign-in logs from Entra ID."""
    token = await get_access_token(azure_tenant_id, client_id, client_secret)
    result = await _graph_get(token, "/auditLogs/signIns", {"$top": 50, "$orderby": "createdDateTime desc"})
    raw = result.get("value", [])

    risk_map = {"none": "None", "low": "Low", "medium": "Medium", "high": "High", "hidden": "None"}
    data = []
    for log in raw:
        err_code = log.get("status", {}).get("errorCode", 0)
        if err_code == 0:
            status = "Success"
        elif err_code in [50053, 50055, 50057, 50129, 530032]:
            status = "Blocked"
        else:
            status = "Failed"

        loc = log.get("location", {})
        city, country = loc.get("city", ""), loc.get("countryOrRegion", "")
        location_str = f"{city}, {country}".strip(", ") or "Unknown"

        dev = log.get("deviceDetail", {})
        os_name = dev.get("operatingSystem", "Unknown")
        browser = dev.get("browser", "")
        device_str = f"{os_name} / {browser}".strip(" /") if browser else os_name

        created = log.get("createdDateTime", "")
        try:
            dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
            created = dt.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            pass

        data.append({
            "user": log.get("userPrincipalName", ""),
            "display_name": log.get("userDisplayName", ""),
            "ip_address": log.get("ipAddress", ""),
            "location": location_str,
            "device": device_str,
            "app": log.get("resourceDisplayName", log.get("clientAppUsed", "Unknown")),
            "status": status,
            "risk_level": risk_map.get(log.get("riskLevelAggregated", "none"), "None"),
            "timestamp": created,
        })

    successful = sum(1 for d in data if d["status"] == "Success")
    failed = sum(1 for d in data if d["status"] == "Failed")
    blocked = sum(1 for d in data if d["status"] == "Blocked")
    return {
        "data": data,
        "summary": {
            "total_signins": result.get("@odata.count", len(data)),
            "successful": successful,
            "failed": failed,
            "blocked": blocked,
            "unique_users": len(set(d["user"] for d in data)),
            "suspicious_locations": sum(1 for d in data if d["risk_level"] in ["Medium", "High"]),
        },
    }


async def get_risky_users(azure_tenant_id: str, client_id: str, client_secret: str) -> dict:
    """Fetch risky users from Identity Protection."""
    token = await get_access_token(azure_tenant_id, client_id, client_secret)
    result = await _graph_get(token, "/identityProtection/riskyUsers", {"$top": 50})
    raw = result.get("value", [])

    detail_map = {
        "unfamiliarFeatures": "Unfamiliar sign-in properties",
        "anonymizedIPAddress": "Anonymous IP address",
        "maliciousIPAddress": "Malware linked IP",
        "impossibleTravel": "Impossible travel",
        "leakedCredentials": "Leaked credentials",
        "passwordSpray": "Password spray attack",
        "none": "Risk detected",
    }
    state_map = {
        "atRisk": "At Risk",
        "confirmedCompromised": "Confirmed Compromised",
        "remediated": "Remediated",
        "dismissed": "Dismissed",
    }

    data = []
    for u in raw:
        last = u.get("riskLastUpdatedDateTime", "")
        try:
            dt = datetime.fromisoformat(last.replace("Z", "+00:00"))
            last = dt.strftime("%Y-%m-%d")
        except Exception:
            pass
        data.append({
            "user": u.get("userPrincipalName", ""),
            "display_name": u.get("userDisplayName", ""),
            "department": "—",
            "risk_level": u.get("riskLevel", "low").capitalize(),
            "risk_detail": detail_map.get(u.get("riskDetail", "none"), u.get("riskDetail", "")),
            "last_risk_event": last,
            "sign_in_location": "—",
            "mfa_enabled": True,
            "status": state_map.get(u.get("riskState", "atRisk"), "At Risk"),
        })

    high = sum(1 for d in data if d["risk_level"] == "High")
    medium = sum(1 for d in data if d["risk_level"] == "Medium")
    low = sum(1 for d in data if d["risk_level"] == "Low")
    compromised = sum(1 for d in data if d["status"] == "Confirmed Compromised")
    remediated = sum(1 for d in data if d["status"] == "Remediated")
    return {
        "data": data,
        "summary": {
            "total_risky": len(data),
            "high_risk": high, "medium_risk": medium, "low_risk": low,
            "confirmed_compromised": compromised, "remediated": remediated,
            "at_risk": len(data) - remediated,
        },
    }


async def get_mfa_status(azure_tenant_id: str, client_id: str, client_secret: str) -> dict:
    """Fetch MFA registration details."""
    token = await get_access_token(azure_tenant_id, client_id, client_secret)
    result = await _graph_get(token, "/reports/authenticationMethods/userRegistrationDetails", {"$top": 50})
    raw = result.get("value", [])

    method_map = {
        "microsoftAuthenticatorPush": "Authenticator App",
        "sms": "SMS", "voiceMobile": "Phone",
        "fido2": "FIDO2", "softwareOneTimePasscode": "TOTP",
    }

    data = []
    for u in raw:
        methods = u.get("methodsRegistered", [])
        friendly = [method_map.get(m, m) for m in methods]
        is_mfa = u.get("isMfaRegistered", False)
        is_cap = u.get("isMfaCapable", False)
        state = "Disabled" if not is_mfa else ("Enforced" if is_cap else "Enabled")
        strong = any(m in methods for m in ["microsoftAuthenticatorPush", "fido2"])
        data.append({
            "user": u.get("userPrincipalName", ""),
            "display_name": u.get("userDisplayName", ""),
            "department": "—",
            "mfa_state": state,
            "mfa_methods": friendly,
            "last_mfa_use": None,
            "strong_auth": strong,
        })

    enforced = sum(1 for d in data if d["mfa_state"] == "Enforced")
    enabled = sum(1 for d in data if d["mfa_state"] == "Enabled")
    disabled = sum(1 for d in data if d["mfa_state"] == "Disabled")
    total = len(data) or 1
    return {
        "data": data,
        "summary": {
            "total_users": len(data),
            "enforced": enforced, "enabled": enabled, "disabled": disabled,
            "enforced_percent": round(enforced / total * 100, 1),
            "enabled_percent": round(enabled / total * 100, 1),
            "disabled_percent": round(disabled / total * 100, 1),
        },
    }


async def get_conditional_access(azure_tenant_id: str, client_id: str, client_secret: str) -> dict:
    """Fetch Conditional Access policies."""
    token = await get_access_token(azure_tenant_id, client_id, client_secret)
    result = await _graph_get(token, "/identity/conditionalAccess/policies")
    raw = result.get("value", [])

    state_map = {"enabled": "On", "disabled": "Off", "enabledForReportingButNotEnforced": "Report-Only"}
    policies = []
    for p in raw:
        cond = p.get("conditions", {})
        users_inc = cond.get("users", {}).get("includeUsers", [])
        apps_inc = cond.get("applications", {}).get("includeApplications", [])
        grant = p.get("grantControls")
        controls = ", ".join(grant.get("builtInControls", [])) if grant else "Block"

        policies.append({
            "name": p.get("displayName", ""),
            "state": state_map.get(p.get("state", "disabled"), "Off"),
            "users": "All Users" if "All" in users_inc else f"{len(users_inc)} objects",
            "apps": "All Cloud Apps" if "All" in apps_inc else f"{len(apps_inc)} apps",
            "conditions": "Various",
            "grant_controls": controls or "Block",
            "created": (p.get("createdDateTime", "") or "")[:10],
            "last_modified": (p.get("modifiedDateTime", "") or "")[:10],
        })

    enabled = sum(1 for p in policies if p["state"] == "On")
    report_only = sum(1 for p in policies if p["state"] == "Report-Only")
    disabled = sum(1 for p in policies if p["state"] == "Off")
    return {
        "policies": policies,
        "summary": {"total_policies": len(policies), "enabled": enabled, "report_only": report_only, "disabled": disabled},
    }


async def get_mailbox_usage(azure_tenant_id: str, client_id: str, client_secret: str) -> dict:
    """Fetch mailbox usage via Graph reports API."""
    token = await get_access_token(azure_tenant_id, client_id, client_secret)
    rows = await _graph_get_csv(token, "/reports/getMailboxUsageDetail(period='D30')")

    data = []
    for row in rows:
        upn = row.get("User Principal Name", "")
        if not upn or upn == "User Principal Name":
            continue
        storage_bytes = int(row.get("Storage Used (Byte)", "0") or "0")
        quota_bytes = int(row.get("Prohibit Send/Receive Quota (Byte)", "0") or "0")
        is_deleted = row.get("Is Deleted", "False") == "True"
        data.append({
            "user": upn,
            "display_name": row.get("Display Name", upn),
            "mailbox_type": "UserMailbox",
            "storage_mb": round(storage_bytes / (1024 * 1024), 2),
            "quota_mb": round(quota_bytes / (1024 * 1024), 2) if quota_bytes else 51200,
            "item_count": int(row.get("Item Count", "0") or "0"),
            "last_logon": row.get("Last Activity Date", ""),
            "status": "Inactive" if is_deleted else "Active",
        })

    total_storage = sum(d["storage_mb"] for d in data)
    active = sum(1 for d in data if d["status"] == "Active")
    return {
        "data": data,
        "summary": {
            "total_mailboxes": len(data),
            "active": active,
            "inactive": len(data) - active,
            "shared": 0,
            "room": 0,
            "total_storage_gb": round(total_storage / 1024, 1),
        },
    }
