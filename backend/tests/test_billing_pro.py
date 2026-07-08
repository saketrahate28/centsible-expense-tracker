"""Iteration 2 delta tests: SendGrid dev fallback + Billing / Cent Pro flow."""
import uuid


# ── SendGrid dev fallback (email login without SENDGRID_API_KEY) ─────────────
class TestEmailLoginDevFallback:
    def test_email_login_returns_devotp_when_sendgrid_empty(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/Auth/login",
                            json={"identifier": f"TEST_email_{uuid.uuid4().hex[:6]}@centsible.dev"},
                            timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert "devOTP" in d and len(d["devOTP"]) == 6 and d["devOTP"].isdigit()

    def test_phone_login_still_returns_devotp(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/Auth/login",
                            json={"identifier": f"+9199999{uuid.uuid4().int % 100000:05d}"},
                            timeout=30)
        assert r.status_code == 200
        assert r.json()["ok"] is True


# ── Billing / Plans (public) ─────────────────────────────────────────────────
class TestBillingPlans:
    def test_plans_public_no_auth(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/Billing/plans", timeout=15)
        assert r.status_code == 200
        plans = r.json()["plans"]
        assert isinstance(plans, list) and len(plans) == 2

        by_id = {p["id"]: p for p in plans}
        assert set(by_id) == {"monthly", "yearly"}

        assert by_id["monthly"]["amount"] == 99
        assert by_id["monthly"]["currency"] == "INR"
        assert by_id["monthly"]["interval"] == "month"

        assert by_id["yearly"]["amount"] == 899
        assert by_id["yearly"]["currency"] == "INR"
        assert by_id["yearly"]["interval"] == "year"


# ── Billing / Checkout (auth) ────────────────────────────────────────────────
class TestBillingCheckout:
    def test_checkout_requires_auth(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/Billing/checkout",
                            json={"plan": "monthly"}, timeout=15)
        assert r.status_code == 401

    def test_checkout_invalid_plan(self, api_client, base_url, auth_user):
        r = api_client.post(f"{base_url}/api/Billing/checkout",
                            json={"plan": "lifetime"},
                            headers=auth_user["headers"], timeout=15)
        assert r.status_code == 400

    def test_checkout_with_placeholder_stripe_key_fails_500(self, api_client, base_url, auth_user):
        r = api_client.post(f"{base_url}/api/Billing/checkout",
                            json={"plan": "monthly"},
                            headers=auth_user["headers"], timeout=30)
        # sk_test_emergent is a placeholder; Stripe SDK should reject it → 500
        assert r.status_code == 500
        body = r.text.lower()
        assert "checkout failed" in body or "invalid api key" in body


# ── Billing / Status (auth) ──────────────────────────────────────────────────
class TestBillingStatus:
    def test_status_requires_auth(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/Billing/status",
                           params={"session_id": "cs_fake_x"}, timeout=15)
        assert r.status_code == 401

    def test_status_invalid_session_returns_400(self, api_client, base_url, auth_user):
        r = api_client.get(f"{base_url}/api/Billing/status",
                           params={"session_id": "cs_fake_invalid_session_id"},
                           headers=auth_user["headers"], timeout=30)
        assert r.status_code == 400


# ── Billing / Mock Activate (auth, sk_test only) ─────────────────────────────
class TestBillingMockActivate:
    def test_mock_activate_requires_auth(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/Billing/mock-activate",
                            json={"plan": "monthly"}, timeout=15)
        assert r.status_code == 401

    def test_mock_activate_monthly_sets_is_pro(self, api_client, base_url):
        # fresh user (do not reuse session-scoped auth_user; we mutate is_pro here)
        ident = f"TEST_pro_m_{uuid.uuid4().hex[:6]}@centsible.dev"
        api_client.post(f"{base_url}/api/Auth/login", json={"identifier": ident}, timeout=30)
        otp = api_client.post(f"{base_url}/api/Auth/login", json={"identifier": ident}, timeout=30).json()["devOTP"]
        v = api_client.post(f"{base_url}/api/Auth/verify",
                            json={"identifier": ident, "otp": otp}, timeout=30).json()
        h = {"Authorization": f"Bearer {v['token']}", "Content-Type": "application/json"}

        # Before: not pro
        me0 = api_client.get(f"{base_url}/api/Auth/me", headers=h, timeout=15).json()["user"]
        assert me0.get("is_pro") is False

        r = api_client.post(f"{base_url}/api/Billing/mock-activate",
                            json={"plan": "monthly"}, headers=h, timeout=15)
        assert r.status_code == 200, r.text
        u = r.json()["user"]
        assert u["is_pro"] is True
        assert u["pro_plan"] == "monthly"
        assert u["pro_expires_at"]  # ISO string present

        # Re-verify via /Auth/me
        me = api_client.get(f"{base_url}/api/Auth/me", headers=h, timeout=15).json()["user"]
        assert me["is_pro"] is True
        assert me["pro_plan"] == "monthly"
        assert me["pro_expires_at"]

    def test_mock_activate_yearly_sets_is_pro(self, api_client, base_url):
        ident = f"TEST_pro_y_{uuid.uuid4().hex[:6]}@centsible.dev"
        api_client.post(f"{base_url}/api/Auth/login", json={"identifier": ident}, timeout=30)
        otp = api_client.post(f"{base_url}/api/Auth/login", json={"identifier": ident}, timeout=30).json()["devOTP"]
        v = api_client.post(f"{base_url}/api/Auth/verify",
                            json={"identifier": ident, "otp": otp}, timeout=30).json()
        h = {"Authorization": f"Bearer {v['token']}", "Content-Type": "application/json"}

        r = api_client.post(f"{base_url}/api/Billing/mock-activate",
                            json={"plan": "yearly"}, headers=h, timeout=15)
        assert r.status_code == 200, r.text
        u = r.json()["user"]
        assert u["is_pro"] is True
        assert u["pro_plan"] == "yearly"

        me = api_client.get(f"{base_url}/api/Auth/me", headers=h, timeout=15).json()["user"]
        assert me["is_pro"] is True
        assert me["pro_plan"] == "yearly"
