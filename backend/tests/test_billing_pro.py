"""Iteration 3 delta tests: Razorpay Billing + Cent Pro flow (Stripe removed)."""
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


# ── Billing / Plans (public) — Razorpay ──────────────────────────────────────
class TestBillingPlans:
    def test_plans_public_no_auth(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/Billing/plans", timeout=15)
        assert r.status_code == 200
        body = r.json()
        # Razorpay disabled because RAZORPAY_KEY_ID/SECRET are empty in .env
        assert "razorpay_enabled" in body
        assert body["razorpay_enabled"] is False
        plans = body["plans"]
        assert isinstance(plans, list) and len(plans) == 2

        by_id = {p["id"]: p for p in plans}
        assert set(by_id) == {"monthly", "yearly"}

        assert by_id["monthly"]["amount"] == 99
        assert by_id["monthly"]["currency"] == "INR"
        assert by_id["monthly"]["interval"] == "month"

        assert by_id["yearly"]["amount"] == 899
        assert by_id["yearly"]["currency"] == "INR"
        assert by_id["yearly"]["interval"] == "year"


# ── Billing / Order (new Razorpay endpoint) ─────────────────────────────────
class TestBillingOrder:
    def test_order_requires_auth(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/Billing/order",
                            json={"plan": "monthly"}, timeout=15)
        assert r.status_code == 401

    def test_order_invalid_plan(self, api_client, base_url, auth_user):
        r = api_client.post(f"{base_url}/api/Billing/order",
                            json={"plan": "lifetime"},
                            headers=auth_user["headers"], timeout=15)
        assert r.status_code == 400

    def test_order_returns_500_when_razorpay_not_configured(self, api_client, base_url, auth_user):
        r = api_client.post(f"{base_url}/api/Billing/order",
                            json={"plan": "monthly"},
                            headers=auth_user["headers"], timeout=30)
        # RAZORPAY_KEY_ID/SECRET are empty in .env — expected 500
        assert r.status_code == 500
        assert "razorpay not configured" in r.text.lower()


# ── Billing / Verify (new Razorpay endpoint) ────────────────────────────────
class TestBillingVerify:
    def test_verify_requires_auth(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/Billing/verify",
                            json={
                                "razorpay_order_id": "order_x",
                                "razorpay_payment_id": "pay_x",
                                "razorpay_signature": "sig_x",
                                "plan": "monthly",
                            }, timeout=15)
        assert r.status_code == 401

    def test_verify_returns_500_when_razorpay_not_configured(self, api_client, base_url, auth_user):
        r = api_client.post(f"{base_url}/api/Billing/verify",
                            json={
                                "razorpay_order_id": "order_x",
                                "razorpay_payment_id": "pay_x",
                                "razorpay_signature": "sig_x",
                                "plan": "monthly",
                            },
                            headers=auth_user["headers"], timeout=30)
        assert r.status_code == 500
        assert "razorpay not configured" in r.text.lower()


# ── Old Stripe endpoints REMOVED — should 404 ────────────────────────────────
class TestStripeEndpointsRemoved:
    def test_billing_checkout_removed(self, api_client, base_url, auth_user):
        r = api_client.post(f"{base_url}/api/Billing/checkout",
                            json={"plan": "monthly"},
                            headers=auth_user["headers"], timeout=15)
        assert r.status_code == 404

    def test_billing_status_removed(self, api_client, base_url, auth_user):
        r = api_client.get(f"{base_url}/api/Billing/status",
                           params={"session_id": "cs_fake"},
                           headers=auth_user["headers"], timeout=15)
        assert r.status_code == 404


# ── Billing / Mock Activate (dev bypass — still works) ───────────────────────
class TestBillingMockActivate:
    def test_mock_activate_requires_auth(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/Billing/mock-activate",
                            json={"plan": "monthly"}, timeout=15)
        assert r.status_code == 401

    def test_mock_activate_monthly_sets_is_pro(self, api_client, base_url):
        ident = f"TEST_pro_m_{uuid.uuid4().hex[:6]}@centsible.dev"
        otp = api_client.post(f"{base_url}/api/Auth/login", json={"identifier": ident}, timeout=30).json()["devOTP"]
        v = api_client.post(f"{base_url}/api/Auth/verify",
                            json={"identifier": ident, "otp": otp}, timeout=30).json()
        h = {"Authorization": f"Bearer {v['token']}", "Content-Type": "application/json"}

        me0 = api_client.get(f"{base_url}/api/Auth/me", headers=h, timeout=15).json()["user"]
        assert me0.get("is_pro") is False

        r = api_client.post(f"{base_url}/api/Billing/mock-activate",
                            json={"plan": "monthly"}, headers=h, timeout=15)
        assert r.status_code == 200, r.text
        u = r.json()["user"]
        assert u["is_pro"] is True
        assert u["pro_plan"] == "monthly"
        assert u["pro_expires_at"]

        me = api_client.get(f"{base_url}/api/Auth/me", headers=h, timeout=15).json()["user"]
        assert me["is_pro"] is True
        assert me["pro_plan"] == "monthly"

    def test_mock_activate_yearly_sets_is_pro(self, api_client, base_url):
        ident = f"TEST_pro_y_{uuid.uuid4().hex[:6]}@centsible.dev"
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
