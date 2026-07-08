import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://finance-sense-app.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="session")
def base_url():
    return BASE_URL


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login_and_verify(session: requests.Session, identifier: str) -> dict:
    r = session.post(f"{BASE_URL}/api/Auth/login", json={"identifier": identifier}, timeout=30)
    assert r.status_code == 200, r.text
    dev_otp = r.json()["devOTP"]
    r2 = session.post(f"{BASE_URL}/api/Auth/verify",
                      json={"identifier": identifier, "otp": dev_otp}, timeout=30)
    assert r2.status_code == 200, r2.text
    return r2.json()


@pytest.fixture(scope="session")
def auth_user(api_client):
    identifier = f"TEST_{uuid.uuid4().hex[:8]}@centsible.dev"
    data = _login_and_verify(api_client, identifier)
    token = data["token"]
    return {
        "identifier": identifier,
        "token": token,
        "user": data["user"],
        "headers": {"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    }


@pytest.fixture(scope="session")
def auth_user_with_txns(api_client, base_url):
    identifier = f"TEST_seeded_{uuid.uuid4().hex[:8]}@centsible.dev"
    data = _login_and_verify(api_client, identifier)
    headers = {"Authorization": f"Bearer {data['token']}", "Content-Type": "application/json"}
    # onboard
    api_client.post(f"{base_url}/api/Users/onboarding",
                    json={"name": "Seed User", "age": 22, "bank_count": 2, "city": "Bangalore"},
                    headers=headers, timeout=30)
    # Seed 3 transactions
    for merchant, amount in [("Swiggy", 350), ("Uber", 180), ("Amazon", 999)]:
        api_client.post(f"{base_url}/api/Transactions/sms",
                        json={"amount": amount, "merchant": merchant, "payment_method": "UPI"},
                        headers=headers, timeout=30)
    return {"token": data["token"], "user": data["user"], "headers": headers, "identifier": identifier}
