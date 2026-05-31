# Centsible — Production Deployment & Launch Setup Guide

This guide documents the environment configuration, CORS setup, security hardening, database setup, and mobile build pipeline required to launch the Centsible application in a production environment.

---

## 🖥️ Backend API Configuration (ASP.NET Core)

The production backend runs under the `Production` environment. All configurations should ideally be supplied via **Environment Variables** (or docker secrets) to prevent committing sensitive keys to version control.

### 1. Environment Variables Checklist
Configure the following environment variables on your production host (or container service like AWS ECS, Azure App Service, or Render):

| Environment Variable | Description | Example / Value |
|----------------------|-------------|-----------------|
| `ASPNETCORE_ENVIRONMENT` | Sets the application environment. Enforces HTTPS & disables Swagger. | `Production` |
| `ConnectionStrings__DefaultConnection` | PostgreSQL connection string. | `Host=prod-db-url;Database=CentsibleDB;Username=postgres;Password=SECURE_PASS` |
| `Jwt__Key` | Secret key used to sign JWTs. Must be a strong, cryptographically secure key. | Generate with: `openssl rand -base64 64` |
| `Jwt__Issuer` | The identity validation issuer. | `CentsibleApi` |
| `Jwt__Audience` | The intended audience of the tokens. | `CentsibleApp` |
| `Jwt__ExpiryHours` | How long before user tokens expire. | `72` |
| `AllowedOrigins` | **CRITICAL:** Comma-separated list of origins permitted to call this API (CORS). Wildcards are blocked. | `https://centsible.app,https://admin.centsible.app` |

### 2. HTTPS & HSTS
When `ASPNETCORE_ENVIRONMENT=Production` is set:
- The backend enforces HTTPS redirection automatically (`app.UseHttpsRedirection()`).
- HTTP Strict Transport Security (HSTS) headers are sent to restrict connections to HTTPS only.
- Ensure your SSL certificate is configured on your reverse proxy (e.g., Nginx, Caddy, Cloudflare, or AWS ALB) forwarding traffic to port `8080` (or the configured `ASPNETCORE_URLS` port).

---

## ⚡ Supabase Auth Setup (Google Login & Validation)

To enable secure Google OAuth logins for users:

1. **Create a Supabase Project:**
   - Go to [Supabase Console](https://supabase.com) and create a project.
   - Go to **Project Settings -> API** to retrieve your `supabaseUrl` and `supabaseAnonKey`.

2. **Configure Google OAuth Provider:**
   - Go to **Authentication -> Providers -> Google** in Supabase.
   - Input your Google Cloud Console Client ID and Client Secret.

3. **Set Up Redirect URI:**
   - In Supabase Auth settings, add the redirect URI scheme for the mobile app:
     ```
     centsiblemobile://login-callback
     ```

---

## 📱 Mobile App Production Build (Expo & EAS)

Building the release binaries requires EAS Build.

### 1. Environment Configuration (`.env`)
Provide the production Supabase endpoint in your build environment. Create or set these in your EAS build environment secrets:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Build Commands
Run the production build commands from the `frontend/CentsibleMobile` directory:

```bash
# Log in to Expo CLI
npx eas login

# Run a production Android App Bundle (AAB) build (configured in eas.json)
npx eas build --platform android --profile production

# Run a production iOS IPA build
npx eas build --platform ios --profile production
```

The output build artifact (e.g., `.aab` or `.ipa` file) will be ready for submission to the Google Play Console or Apple App Store.

---

## 🗄️ Database Migrations

Before launching the web service, apply migrations to the production database:

```bash
# Navigate to the backend directory
cd CentsibleBackend

# Apply migrations safely
dotnet run --project src/Centsible.Api --migrate-only
```
Alternatively, database migrations will execute and seed the global category catalog safely on the initial web server boot.
