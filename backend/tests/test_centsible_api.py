"""Centsible backend API tests — health, auth, users, transactions, income, groups, AI."""
import uuid
import pytest


# ── Health ───────────────────────────────────────────────────────────────────
class TestHealth:
    def test_health(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/health", timeout=15)
        assert r.status_code == 200
        assert r.json()["ok"] is True

    def test_root(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/", timeout=15)
        assert r.status_code == 200
        assert r.json()["service"] == "centsible"

    def test_categories(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/categories", timeout=15)
        assert r.status_code == 200
        items = r.json()["items"]
        assert "Food & Drinks" in items and "Transport" in items


# ── Auth ─────────────────────────────────────────────────────────────────────
class TestAuth:
    def test_login_returns_devotp(self, api_client, base_url):
        r = api_client.post(f"{base_url}/api/Auth/login",
                            json={"identifier": f"TEST_{uuid.uuid4().hex[:6]}@centsible.dev"}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert len(d["devOTP"]) == 6 and d["devOTP"].isdigit()

    def test_verify_returns_token_and_user(self, auth_user):
        assert auth_user["token"]
        assert auth_user["user"]["email"] == auth_user["identifier"]
        assert auth_user["user"]["is_onboarded"] is False

    def test_verify_bad_otp(self, api_client, base_url):
        ident = f"TEST_{uuid.uuid4().hex[:6]}@centsible.dev"
        api_client.post(f"{base_url}/api/Auth/login", json={"identifier": ident}, timeout=30)
        r = api_client.post(f"{base_url}/api/Auth/verify",
                            json={"identifier": ident, "otp": "000000"}, timeout=30)
        assert r.status_code == 400

    def test_me_requires_auth(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/Auth/me", timeout=15)
        assert r.status_code == 401

    def test_me_with_bad_token(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/Auth/me",
                           headers={"Authorization": "Bearer bad.token.here"}, timeout=15)
        assert r.status_code == 401

    def test_me_success(self, api_client, base_url, auth_user):
        r = api_client.get(f"{base_url}/api/Auth/me", headers=auth_user["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json()["user"]["user_id"] == auth_user["user"]["user_id"]

    def test_logout(self, api_client, base_url):
        ident = f"TEST_logout_{uuid.uuid4().hex[:6]}@centsible.dev"
        api_client.post(f"{base_url}/api/Auth/login", json={"identifier": ident}, timeout=30)
        otp = api_client.post(f"{base_url}/api/Auth/login", json={"identifier": ident}, timeout=30).json()["devOTP"]
        tok = api_client.post(f"{base_url}/api/Auth/verify",
                              json={"identifier": ident, "otp": otp}, timeout=30).json()["token"]
        r = api_client.post(f"{base_url}/api/Auth/logout",
                            headers={"Authorization": f"Bearer {tok}"}, timeout=15)
        assert r.status_code == 200


# ── Users / Onboarding / Budget / Accounts ───────────────────────────────────
class TestUsers:
    def test_onboarding(self, api_client, base_url, auth_user):
        r = api_client.post(f"{base_url}/api/Users/onboarding",
                            json={"name": "Test GenZ", "age": 21, "bank_count": 2, "city": "Bengaluru"},
                            headers=auth_user["headers"], timeout=30)
        assert r.status_code == 200
        u = r.json()["user"]
        assert u["is_onboarded"] is True
        assert u["name"] == "Test GenZ" and u["age"] == 21 and u["bank_count"] == 2

    def test_budget_update(self, api_client, base_url, auth_user):
        r = api_client.post(f"{base_url}/api/Users/me/budget",
                            json={"limit": 30000}, headers=auth_user["headers"], timeout=30)
        assert r.status_code == 200
        assert r.json()["budget_limit"] == 30000
        me = api_client.get(f"{base_url}/api/Auth/me", headers=auth_user["headers"], timeout=15).json()
        assert me["user"]["budget_limit"] == 30000

    def test_accounts(self, api_client, base_url, auth_user):
        r = api_client.get(f"{base_url}/api/Users/me/accounts",
                           headers=auth_user["headers"], timeout=15)
        assert r.status_code == 200
        accs = r.json()["accounts"]
        assert accs[0]["id"] == "all"
        assert len(accs) >= 2


# ── Transactions ─────────────────────────────────────────────────────────────
class TestTransactions:
    @pytest.mark.parametrize("merchant,expected", [
        ("Swiggy", "Food & Drinks"),
        ("Uber Auto Ride", "Transport"),
        ("Amazon.in", "Shopping"),
    ])
    def test_auto_category(self, api_client, base_url, auth_user, merchant, expected):
        r = api_client.post(f"{base_url}/api/Transactions/sms",
                            json={"amount": 100, "merchant": merchant},
                            headers=auth_user["headers"], timeout=30)
        assert r.status_code == 200
        assert r.json()["transaction"]["category"] == expected

    def test_list_with_filters(self, api_client, base_url, auth_user_with_txns):
        h = auth_user_with_txns["headers"]
        r = api_client.get(f"{base_url}/api/Transactions",
                           headers=h, params={"q": "Swiggy"}, timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert data["total"] >= 1
        assert all("swiggy" in t["merchant"].lower() for t in data["items"])

        r2 = api_client.get(f"{base_url}/api/Transactions",
                            headers=h, params={"category": "Transport"}, timeout=15)
        assert r2.status_code == 200
        assert all(t["category"] == "Transport" for t in r2.json()["items"])

    def test_dashboard(self, api_client, base_url, auth_user_with_txns):
        r = api_client.get(f"{base_url}/api/Transactions/dashboard",
                           headers=auth_user_with_txns["headers"], timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["monthly_spend"] > 0
        assert d["budget_limit"] >= 25000
        assert len(d["recent"]) >= 3

    @pytest.mark.parametrize("tf", ["week", "month", "year"])
    def test_analytics(self, api_client, base_url, auth_user_with_txns, tf):
        r = api_client.get(f"{base_url}/api/Transactions/analytics",
                           headers=auth_user_with_txns["headers"], params={"timeframe": tf}, timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["timeframe"] == tf
        assert "heatmap" in d and isinstance(d["heatmap"], list)
        assert "by_category" in d
        assert d["total"] > 0

    def test_patch_category(self, api_client, base_url, auth_user):
        create = api_client.post(f"{base_url}/api/Transactions/sms",
                                 json={"amount": 250, "merchant": "SomePlace"},
                                 headers=auth_user["headers"], timeout=30).json()
        tid = create["transaction"]["id"]
        r = api_client.patch(f"{base_url}/api/Transactions/{tid}/category",
                             json={"category": "Health"}, headers=auth_user["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json()["transaction"]["category"] == "Health"

    def test_patch_update_and_delete(self, api_client, base_url, auth_user):
        c = api_client.post(f"{base_url}/api/Transactions/sms",
                            json={"amount": 500, "merchant": "TestMerchant"},
                            headers=auth_user["headers"], timeout=30).json()
        tid = c["transaction"]["id"]
        r = api_client.patch(f"{base_url}/api/Transactions/{tid}",
                             json={"amount": 750, "merchant": "Renamed", "category": "Bills"},
                             headers=auth_user["headers"], timeout=15)
        assert r.status_code == 200
        t = r.json()["transaction"]
        assert t["amount"] == 750 and t["merchant"] == "Renamed" and t["category"] == "Bills"

        d = api_client.delete(f"{base_url}/api/Transactions/{tid}",
                              headers=auth_user["headers"], timeout=15)
        assert d.status_code == 200
        # Verify gone
        lst = api_client.get(f"{base_url}/api/Transactions",
                             headers=auth_user["headers"], params={"q": "Renamed"}, timeout=15).json()
        assert not any(x["id"] == tid for x in lst["items"])

    def test_delete_missing_returns_404(self, api_client, base_url, auth_user):
        r = api_client.delete(f"{base_url}/api/Transactions/t_nonexistent",
                              headers=auth_user["headers"], timeout=15)
        assert r.status_code == 404

    def test_predict_category(self, api_client, base_url, auth_user):
        r = api_client.post(f"{base_url}/api/Transactions/predict-category",
                            json={"merchant": "Zomato Order"}, headers=auth_user["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json()["category"] == "Food & Drinks"

    def test_export_csv(self, api_client, base_url, auth_user_with_txns):
        r = api_client.get(f"{base_url}/api/Transactions/export",
                           headers=auth_user_with_txns["headers"], timeout=30)
        assert r.status_code == 200
        assert "text/csv" in r.headers.get("content-type", "")
        body = r.text
        assert "date,merchant,amount,category" in body
        assert "Swiggy" in body

    def test_txn_requires_auth(self, api_client, base_url):
        r = api_client.get(f"{base_url}/api/Transactions", timeout=15)
        assert r.status_code == 401


# ── Income ───────────────────────────────────────────────────────────────────
class TestIncome:
    def test_create_and_list(self, api_client, base_url, auth_user):
        r = api_client.post(f"{base_url}/api/Income",
                            json={"amount": 40000, "source": "Salary"},
                            headers=auth_user["headers"], timeout=15)
        assert r.status_code == 200
        assert r.json()["income"]["amount"] == 40000

        lst = api_client.get(f"{base_url}/api/Income", headers=auth_user["headers"], timeout=15)
        assert lst.status_code == 200
        d = lst.json()
        assert d["monthly_total"] >= 40000
        assert any(i["source"] == "Salary" for i in d["items"])


# ── Groups ───────────────────────────────────────────────────────────────────
class TestGroups:
    def test_full_group_flow(self, api_client, base_url, auth_user):
        h = auth_user["headers"]
        c = api_client.post(f"{base_url}/api/Groups",
                            json={"name": "TEST_Trip", "members": ["Alice", "Bob"]},
                            headers=h, timeout=15)
        assert c.status_code == 200
        gid = c.json()["group"]["id"]

        lst = api_client.get(f"{base_url}/api/Groups", headers=h, timeout=15)
        assert lst.status_code == 200
        assert any(g["id"] == gid for g in lst.json()["items"])

        add = api_client.post(f"{base_url}/api/Groups/{gid}/expenses",
                              json={"amount": 1200, "description": "Dinner",
                                    "paid_by": "Alice", "split_between": ["Alice", "Bob"]},
                              headers=h, timeout=15)
        assert add.status_code == 200

        det = api_client.get(f"{base_url}/api/Groups/{gid}", headers=h, timeout=15)
        assert det.status_code == 200
        g = det.json()["group"]
        assert g["expense_count"] == 1 and g["total_spent"] == 1200

        d = api_client.delete(f"{base_url}/api/Groups/{gid}", headers=h, timeout=15)
        assert d.status_code == 200

        det2 = api_client.get(f"{base_url}/api/Groups/{gid}", headers=h, timeout=15)
        assert det2.status_code == 404


# ── AI ───────────────────────────────────────────────────────────────────────
class TestAI:
    def test_finance_term_fresh_user(self, api_client, base_url, auth_user):
        r = api_client.get(f"{base_url}/api/AI/finance-term",
                           headers=auth_user["headers"], timeout=60)
        assert r.status_code == 200
        d = r.json()
        for k in ("term", "definition", "example", "tip"):
            assert k in d and isinstance(d[k], str) and d[k]

    def test_finance_term_seeded(self, api_client, base_url, auth_user_with_txns):
        r = api_client.get(f"{base_url}/api/AI/finance-term",
                           headers=auth_user_with_txns["headers"], timeout=60)
        assert r.status_code == 200
        assert set(("term", "definition", "example", "tip")).issubset(r.json().keys())

    def test_insight_fresh(self, api_client, base_url, auth_user):
        r = api_client.get(f"{base_url}/api/AI/insight",
                           headers=auth_user["headers"], timeout=60)
        assert r.status_code == 200
        assert isinstance(r.json()["insight"], str) and r.json()["insight"]

    def test_insight_seeded(self, api_client, base_url, auth_user_with_txns):
        r = api_client.get(f"{base_url}/api/AI/insight",
                           headers=auth_user_with_txns["headers"], timeout=60)
        assert r.status_code == 200
        assert isinstance(r.json()["insight"], str)

    def test_chat_session_echo_and_history(self, api_client, base_url, auth_user_with_txns):
        h = auth_user_with_txns["headers"]
        sess = f"sess_TEST_{uuid.uuid4().hex[:6]}"
        r = api_client.post(f"{base_url}/api/AI/chat",
                            json={"message": "How can I save on food?", "session_id": sess},
                            headers=h, timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["session_id"] == sess
        assert isinstance(d["reply"], str) and d["reply"]

        hist = api_client.get(f"{base_url}/api/AI/chat/history",
                              headers=h, params={"session_id": sess}, timeout=15)
        assert hist.status_code == 200
        items = hist.json()["items"]
        # If LLM succeeded it stored a message; fallback path doesn't store.
        if items:
            assert items[0]["user_text"] == "How can I save on food?"

    def test_ai_requires_auth(self, api_client, base_url):
        assert api_client.get(f"{base_url}/api/AI/insight", timeout=15).status_code == 401
        assert api_client.post(f"{base_url}/api/AI/chat", json={"message": "hi"}, timeout=15).status_code == 401
