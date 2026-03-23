"""Backend tests for M365 Analytics Platform"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "testadmin_backend@contoso.com"
TEST_PASSWORD = "TestAdmin123!"
EXISTING_EMAIL = "admin@contoso.com"
EXISTING_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def auth_token():
    """Get auth token - try existing user first, else register"""
    # Try login with existing
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EXISTING_EMAIL, "password": EXISTING_PASSWORD})
    if r.status_code == 200:
        return r.json()["token"]
    # Try register
    r = requests.post(f"{BASE_URL}/api/auth/register", json={"name": "Test Admin", "email": TEST_EMAIL, "password": TEST_PASSWORD})
    if r.status_code == 200:
        return r.json()["token"]
    pytest.skip("Could not get auth token")


@pytest.fixture(scope="module")
def headers(auth_token):
    return {"Authorization": f"Bearer {auth_token}"}


# Auth tests
class TestAuth:
    """Auth endpoint tests"""

    def test_register_new_user(self):
        import uuid
        unique_email = f"TEST_{uuid.uuid4().hex[:8]}@contoso.com"
        r = requests.post(f"{BASE_URL}/api/auth/register", json={"name": "Test User", "email": unique_email, "password": "TestPass123!"})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == unique_email

    def test_register_duplicate_email(self):
        r = requests.post(f"{BASE_URL}/api/auth/register", json={"name": "Dup", "email": EXISTING_EMAIL, "password": "any"})
        # Should be 400 or succeed if user doesn't exist yet
        assert r.status_code in [200, 400]

    def test_login_valid_credentials(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": EXISTING_EMAIL, "password": EXISTING_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == EXISTING_EMAIL

    def test_login_invalid_credentials(self):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": "notexist@contoso.com", "password": "wrongpass"})
        assert r.status_code == 401


# Dashboard
class TestDashboard:
    """Dashboard API tests"""

    def test_dashboard_overview_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/dashboard/overview")
        assert r.status_code == 403

    def test_dashboard_overview(self, headers):
        r = requests.get(f"{BASE_URL}/api/dashboard/overview", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert "total_users" in data
        assert "licensed_users" in data
        assert "storage_used_gb" in data
        assert "tenant_health_score" in data
        assert "secure_score" in data
        assert "recent_alerts" in data
        assert isinstance(data["recent_alerts"], list)
        assert len(data["recent_alerts"]) > 0


# Exchange
class TestExchange:
    """Exchange Online API tests"""

    def test_mailbox_usage(self, headers):
        r = requests.get(f"{BASE_URL}/api/exchange/mailbox-usage", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert "summary" in data
        assert len(data["data"]) > 0
        assert "total_mailboxes" in data["summary"]

    def test_inactive_mailboxes(self, headers):
        r = requests.get(f"{BASE_URL}/api/exchange/inactive-mailboxes", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert "high_risk" in data

    def test_mail_traffic(self, headers):
        r = requests.get(f"{BASE_URL}/api/exchange/mail-traffic", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert "trend" in data
        assert "top_senders" in data

    def test_forwarding_rules(self, headers):
        r = requests.get(f"{BASE_URL}/api/exchange/forwarding-rules", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert len(data["data"]) > 0


# Entra ID
class TestEntraID:
    """Entra ID API tests"""

    def test_signin_logs(self, headers):
        r = requests.get(f"{BASE_URL}/api/entra/signin-logs", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert "summary" in data

    def test_risky_users(self, headers):
        r = requests.get(f"{BASE_URL}/api/entra/risky-users", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert len(data["data"]) > 0

    def test_mfa_status(self, headers):
        r = requests.get(f"{BASE_URL}/api/entra/mfa-status", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert "data" in data
        assert "summary" in data
        assert "enforced" in data["summary"]

    def test_conditional_access(self, headers):
        r = requests.get(f"{BASE_URL}/api/entra/conditional-access", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert "policies" in data
        assert len(data["policies"]) > 0


# Alerts
class TestAlerts:
    """Alerts API tests"""

    def test_alerts(self, headers):
        r = requests.get(f"{BASE_URL}/api/alerts", headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert "alerts" in data
        assert "summary" in data
        assert len(data["alerts"]) > 0


# Tenant Management
class TestTenants:
    """Tenant CRUD and connection tests"""

    tenant_id = None

    def test_list_tenants_empty_or_existing(self, headers):
        r = requests.get(f"{BASE_URL}/api/tenants", headers=headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_create_demo_tenant(self, headers):
        r = requests.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Corp Demo",
            "mode": "demo",
            "description": "Test demo tenant"
        }, headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "TEST_Corp Demo"
        assert data["mode"] == "demo"
        assert "id" in data
        TestTenants.tenant_id = data["id"]

    def test_get_tenant_after_create(self, headers):
        if not TestTenants.tenant_id:
            pytest.skip("No tenant created")
        r = requests.get(f"{BASE_URL}/api/tenants", headers=headers)
        assert r.status_code == 200
        ids = [t["id"] for t in r.json()]
        assert TestTenants.tenant_id in ids

    def test_update_tenant(self, headers):
        if not TestTenants.tenant_id:
            pytest.skip("No tenant created")
        r = requests.put(f"{BASE_URL}/api/tenants/{TestTenants.tenant_id}", json={
            "name": "TEST_Corp Demo Updated",
            "mode": "demo"
        }, headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "TEST_Corp Demo Updated"

    def test_create_real_tenant(self, headers):
        r = requests.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Real Tenant",
            "mode": "real",
            "azure_tenant_id": "fake-tenant-id-1234",
            "client_id": "fake-client-id-5678",
            "client_secret": "fake-secret"
        }, headers=headers)
        assert r.status_code == 200
        data = r.json()
        assert data["mode"] == "real"
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tenants/{data['id']}", headers=headers)

    def test_test_connection_real_tenant_fails_gracefully(self, headers):
        """Test connection on a real tenant with fake creds should not 500"""
        # Create real tenant
        r = requests.post(f"{BASE_URL}/api/tenants", json={
            "name": "TEST_Real Conn",
            "mode": "real",
            "azure_tenant_id": "00000000-fake-0000-0000-000000000000",
            "client_id": "00000000-fake-0000-0000-000000000001",
            "client_secret": "fakesecret123"
        }, headers=headers)
        assert r.status_code == 200
        tid = r.json()["id"]
        # Test connection - should return success=False, not 500
        rc = requests.post(f"{BASE_URL}/api/tenants/{tid}/test-connection", json={}, headers=headers)
        assert rc.status_code == 200
        assert "success" in rc.json()
        # Cleanup
        requests.delete(f"{BASE_URL}/api/tenants/{tid}", headers=headers)

    def test_delete_tenant(self, headers):
        if not TestTenants.tenant_id:
            pytest.skip("No tenant created")
        r = requests.delete(f"{BASE_URL}/api/tenants/{TestTenants.tenant_id}", headers=headers)
        assert r.status_code in [200, 204]
        # Verify deletion
        r2 = requests.get(f"{BASE_URL}/api/tenants", headers=headers)
        ids = [t["id"] for t in r2.json()]
        assert TestTenants.tenant_id not in ids

    def test_tenants_require_auth(self):
        r = requests.get(f"{BASE_URL}/api/tenants")
        assert r.status_code == 403
