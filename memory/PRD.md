# Centsible — Product Requirements (PRD)

## Vision
An AI-powered personal expense tracker for Indian GenZ that teaches finance while it tracks money. Dark, premium, playful, opinionated.

## Tech Stack
- **Frontend**: Expo (React Native 0.81) + expo-router. Works on iOS, Android, and web.
- **Backend**: FastAPI + MongoDB + Motor. JWT for OTP auth, Emergent session tokens for Google Auth.
- **AI**: Emergent Universal LLM Key via `emergentintegrations` → OpenAI `gpt-4.1-mini` (drop-in for `gpt-4o-mini`).
- **Original .NET backend**: Kept as-is in user's GitHub for portfolio. Endpoint contracts match so the Expo app can flip `EXPO_PUBLIC_BACKEND_URL` between the FastAPI mirror and the .NET API.

## Core Features (v1)

### Auth & onboarding
- Email/Phone OTP with 6-box UI, dev OTP auto-fill.
- Google Sign-In via Emergent-managed OAuth.
- 3-step onboarding wizard (Name → Age → Bank count).

### Dashboard
- Monthly spending hero card with budget progress bar.
- Account switcher (multi-bank).
- AI insight card ("Cent" personalized nudge).
- Quick actions (Add income, Groups).
- Recent transactions with tap-to-categorize.
- Set budget modal with quick presets.
- Floating "+" to add expense.

### Add Expense
- Custom numpad, category chips, payment method chips, optional merchant.

### Analytics
- Week / Month / Year toggle.
- Total spend + Avg daily stat cards.
- GitHub-style spending heatmap.
- **AI Finance Term of the Day** (definition + example + personal tip tied to actual spend).
- Category breakdown bars.

### Transactions
- Search + category filter chips.
- Edit (amount, merchant, category).
- Delete with confirmation.
- CSV export.

### AI Chatbot ("Cent")
- Persistent chat history per user.
- Personalized replies with spending context injected.
- Suggested prompts on first view.

### Shared Budgets (Groups)
- Create group with named members.
- Add expenses with paid-by + auto-split.
- Real-time balance summary (who owes whom).
- Delete group.

### Income tracking
- Add income by source (Salary, Freelance, etc.).
- Monthly + all-time totals.

### Profile
- User info + Pro upsell placeholder.
- Toggles for SMS auto-sync, biometric lock, budget alerts (persist locally).
- CSV export + sign out.

## Non-goals (v1)
- Real Twilio/SendGrid OTP delivery (dev OTP only).
- Push notifications (requires build; documented for post-launch).
- Native SMS parsing on-device (documented; ready to re-enable via `react-native-get-sms-android` in a build).
- Biometric lock (toggle exists; requires build).

## Design system
Defined in `/app/design_guidelines.json`. Neo-brutalist dark, primary neon pink `#EC4899`, AI accent purple `#8B5CF6`, Manrope/Outfit typography.

## API Contract
All endpoints under `/api`, PascalCase paths mirror the original .NET routes (`/Auth/login`, `/Transactions/dashboard`, `/Groups`, etc.). JWT `Authorization: Bearer <token>` required on all authed routes.

## Deployment
- **Emergent**: One-click Publish button (top-right).
- **.NET portable backend**: Documented deployment guide in root README (Railway / Render / Azure).
