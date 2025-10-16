# Zenlink Project Setup

Follow these steps to get the project up and running:

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd zenlink
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Set up environment variables:**
    Create a `.env` file in the root of the project and add the following variables:
    ```env
    DATABASE_URL="postgresql://username:password@localhost:5432/zenlink"
    JWT_SECRET="yoursecretjwttoken"
    # Gmail (recommended for production – use an App Password)
    GMAIL_USER="zenlinkdev@gmail.com"
    GMAIL_APP_PASSWORD="your-16-character-app-password"

    # Optional: custom SMTP provider
    # SMTP_PROVIDER="gmail" # or leave blank to auto-detect from vars
    # SMTP_HOST="smtp.gmail.com"
    # SMTP_PORT="465"
    # SMTP_SECURE="true"
    # SMTP_USER="zenlinkdev@gmail.com"
    # SMTP_PASS="your-16-character-app-password"

    # Dev fallback (Mailtrap)
    MAILTRAP_USER="yourmailtrapusername"
    MAILTRAP_PASS="yourmailtrappassword"
    ```
    Replace placeholders with your actual credentials. For Gmail, enable 2FA and create an App Password in Google Account > Security.

4.  **Generate Prisma Client:**
    ```bash
    npx prisma generate
    ```

5.  **Open Prisma Studio (optional, for viewing/editing data):**
    ```bash
    npx prisma studio
    ```
    This will open a web interface, usually at `http://localhost:5555`.

6.  **Run database migrations:**
    ```bash
    npx prisma migrate dev
    ```
    This will apply any pending database schema changes.

7.  **Start the development server:**
    ```bash
    npm run dev
    ```
    The application should now be running, typically at `http://localhost:3000`.

---

## 📚 Testing Documentation

### Password Reset Testing (NEW: OTP-Based) 🔐
- **[🚀 Quick Start](./OTP_PASSWORD_RESET_QUICKSTART.md)** - Test OTP flow in 4 steps
- **[📖 Full OTP Guide](./POSTMAN_OTP_PASSWORD_RESET.md)** - Complete API documentation for OTP flow
- **[📧 Old Flow Docs](./PASSWORD_RESET_TESTING_OVERVIEW.md)** - Legacy link-based flow (deprecated)

### Other Documentation
- **[Vercel Blob Setup](./VERCEL_BLOB_SETUP.md)** - Configure image uploads for production

---

## 🚀 Quick Links

- **Local Development:** http://localhost:3000
- **Prisma Studio:** http://localhost:5555 (after running `npx prisma studio`)
- **API Endpoints:**
  - Request OTP: `POST /api/auth/forgot-password`
  - Verify OTP: `POST /api/auth/verify-otp`
  - Reset Password: `POST /api/auth/reset-password`
  - Employee Photo Upload: `POST /api/upload/employee-photo`

---

## 🔐 Password Reset Flow (OTP-Based)

The new password reset flow uses **OTP (One-Time Password)** for better security:

1. **Request OTP** - User enters email, receives 6-digit code
2. **Verify OTP** - User enters code to verify identity
3. **Reset Password** - User sets new password

**Key Features:**
- ✅ 6-digit codes (easy to type)
- ✅ 10-minute expiration
- ✅ Two-phase verification
- ✅ Better mobile UX

**Quick Test:** See [OTP Quick Start Guide](./OTP_PASSWORD_RESET_QUICKSTART.md)