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
- **SMS auto-sync on mobile**: requires a signed APK build + `react-native-get-sms-android` + Play Console permission declaration. Not available in Expo Go or web preview.
- **Real Stripe checkout**: needs the user to set a real `sk_test_...` (or live `sk_live_...`) key in `.env`. Placeholder `sk_test_emergent` is provided but not a real Stripe key — Mock Activate is available for testing UX end-to-end.
- **Real email OTP delivery**: SendGrid code is wired but dormant until `SENDGRID_API_KEY` + verified `SENDER_EMAIL` are added to `.env`. Until then, dev-OTP is returned in the login response and auto-fills.
- **Push notifications** (budget-exceeded): requires a real device build + `google-services.json`.
- **Biometric lock** toggle exists in Profile (visual only until a native build is made).

## Design system
- **Primary color**: electric cyan `#06B6D4` (crypto/trading terminal vibe)
- **Premium accent**: amber gold `#FBBF24` (Cent Pro, upgrades, wealth cues)
- **AI accent**: purple `#8B5CF6` (unchanged)
- **Background**: `#0A0B10` dark base with `#171923` surface
- Landing page hero: 3D rotating Indian Rupee coin (SVG + Animated) with metallic gold gradient and cyan/gold glow.

Full spec at `/app/design_guidelines.json`.

## Cent Pro (Stripe subscription)
- Monthly: **₹99/mo** (`price_data` inline, no pre-created price IDs required).
- Yearly: **₹899/yr** (Save 24%, marked BEST VALUE).
- Flow: `/Billing/checkout` creates a Stripe Checkout Session → user redirected → returns with `session_id` → `/Billing/status` verifies + flips `is_pro=true` on the user.
- Dev/test: `/Billing/mock-activate` (guarded by `sk_test` prefix) lets us verify Pro UI without a live Stripe key.
- Pro perks (UI-gated in follow-ups): unlimited AI chats, PDF+CSV export, advanced analytics, custom categories.

## API Contract
All endpoints under `/api`, PascalCase paths mirror the original .NET routes (`/Auth/login`, `/Transactions/dashboard`, `/Groups`, etc.). JWT `Authorization: Bearer <token>` required on all authed routes.

## Deployment
- **Emergent**: One-click Publish button (top-right).
- **.NET portable backend**: Documented deployment guide in root README (Railway / Render / Azure).
