from pydantic import BaseModel

class UserMessage(BaseModel):
    text: str

class LlmResponse:
    def __init__(self, text: str):
        self.text = text
    def __str__(self):
        return self.text

class LlmChat:
    def __init__(self, api_key: str, session_id: str, system_message: str):
        self.api_key = api_key
        self.session_id = session_id
        self.system_message = system_message

    def with_model(self, provider: str, model_name: str):
        return self

    async def send_message(self, message: UserMessage):
        # Return mock responses tailored to the call context
        if "JSON" in self.system_message or "term" in self.session_id:
            import json
            return LlmResponse(json.dumps({
                "term": "SIP",
                "definition": "Systematic Investment Plan allows you to invest a fixed amount regularly in mutual funds.",
                "example": "Investing ₹500 every month in a mutual fund instead of buying one extra pizza.",
                "tip": "Set up a monthly auto-debit on the day after you get paid to build discipline."
            }))
        elif "insight" in self.session_id:
            return LlmResponse("Your food spending is up by 15% this week. Try cooking one meal at home to save ₹300!")
        else:
            return LlmResponse("Hey there! I am Cent, your AI finance buddy. Let's get your expenses sorted!")
