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