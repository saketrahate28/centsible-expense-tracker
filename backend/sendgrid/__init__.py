class SendGridAPIClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
    def send(self, message):
        class MockResponse:
            status_code = 202
        return MockResponse()
