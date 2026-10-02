# Abhivriddhi — Admin Panel

A **Next.js** web application to manage event attendance using QR codes. Handles participant registration, ticket sending, attendance tracking, and certificate distribution.

---

## Tech Stack

- **Frontend**: Next.js 15, React, Tailwind CSS, Radix UI
- **Backend**: Next.js API Routes
- **Database**: MongoDB + Mongoose
- **Auth**: JWT (stored in HTTP-only cookies)
- **QR Scanner**: html5-qrcode
- **Email**: Nodemailer (Gmail)
- **Ticket templates**: Google Slides copied and rendered to temporary PDFs
- **Scanner**: IndexedDB-backed offline-first color counters with per-device tokens

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

For Brevo SMTP, set `SMTP_HOST=smtp-relay.brevo.com`, `SMTP_PORT=587`, and use the Brevo account login email as `SMTP_USER`, the verified sender as `EMAIL`, and the generated SMTP key as `EMAIL_PASSWORD`.

### 2. Environment Variables

Create a `.env` file in the root (or copy from `.env.example`):

```env
# MongoDB (Atlas for production, local for development)
MONGODB_URI=mongodb://localhost:27017/qr-attendance

# Gmail (use App Password, not regular password)
EMAIL=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# JWT Secret (use a long random string)
JWT_SECRET=your_jwt_secret

# Seed Key (used once to create first admin)
SEED_KEY=your_seed_key

# Required for modular event ticket IDs
TICKET_SAUCE=server_only_random_secret

# Google service account JSON (server environment only)
GOOGLE_SERVICE_ACCOUNT_JSON={"client_email":"...","private_key":"..."}

# Persistent email worker pacing/limit
EMAIL_DELAY_MS=1000
EMAIL_DAILY_LIMIT=1500
```

Enable the Google Drive, Slides, and Sheets APIs for the service account and share each source spreadsheet and Slides template with its `client_email`. Keep the JSON private-key credential, `TICKET_SAUCE`, and all SMTP credentials on the server; they are never sent to the browser.

> To generate Gmail App Password: Google Account → Security → 2-Step Verification → App Passwords

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Build for Production

```bash
npm run build
npm start
```

---

## First Time Setup — Create Admin Account

The admin account is stored in MongoDB. You only need to do this **once**.

Run the dev server, then send a **POST** request to:

```
POST http://localhost:3000/api/auth/seed
```

```json
{
  "name": "Your Name",
  "email": "your@email.com",
  "password": "yourpassword",
  "seedKey": "your_seed_key_from_env"
}
```

After this, login at [http://localhost:3000/login](http://localhost:3000/login) with your email and password directly — no seed needed again.

---

## Pages

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Public | QR code scanner to mark attendance |
| `/login` | Public | Admin login |
| `/dashboard` | Admin | Main dashboard |
| `/guidelines` | Admin | How-to guide for using the system |
| `/events` | Admin | Event configuration, participant sources/mappings, Slides templates, scanner devices, and persistent email/document jobs |
| `/convert-data` | Admin | Convert CSV/Excel to JSON |
| `/add-participant` | Admin | Bulk insert participants, delete collections |
| `/send-tickets` | Admin | Event-configured Google Slides ticket PDF generation and delivery |
| `/send-email` | Admin | Bulk participant email campaigns with Excel validation, personalization, and retry support |
| `/attendance` | Admin | View, filter, and export attendance records |
| `/certificates` | Admin | Event-configured Google Slides certificate PDF generation and delivery |

---

## Database Collections

| Collection | Purpose |
|-----------|---------|
| `admins` | Admin accounts |
| `users` | Registered participants |
| `attendanceday1s` | Attendance for DAY1 ticket holders |
| `attendanceday2s` | Attendance for DAY2 ticket holders |
| `attendancecombos` | Attendance for COMBO ticket holders |
| `certificatesents` | Tracks who already received a certificate |
| `refreshtokens` | JWT refresh tokens |
| `events` | Event source, field mappings, templates, email and ticket settings |
| `tickets` | HMAC IDs, alternating color, participant/event association, and used state |
| `operationjobs` | Persistent per-recipient ticket/certificate/email progress, retries, errors, and temporary Drive cleanup IDs |
| `scannerdevices` | Revocable scanner credentials, event/color pairing, and sync timestamps |
| `emailusages` / `emailratelimits` | Daily email ceiling and shared SMTP pacing |

---

## QR Code Format

QR codes are generated with this exact format:

**VIT Students (with PRN):**
```
Name:VIKRANT THAKUR
PRN:12412111
Email:vikrant@vit.edu
TicketType:DAY1
```

**Non-VIT Students (without PRN):**
```
Name:JIDNYESH TOKE
Email:jidnyesh@gmail.com
TicketType:DAY2
```

---

## CSV Format (for Convert to JSON)

```csv
Name,PRN,Email,TicketType,RegisteredEvent
VIKRANT THAKUR,12412111,vikrant@vit.edu,COMBO,Event A
JIDNYESH TOKE,,jidnyesh@gmail.com,DAY1,Event A
```

| Column | Required | Notes |
|--------|----------|-------|
| Name | ✅ | Full name in uppercase |
| PRN | ❌ | Leave empty for non-VIT students |
| Email | ✅ | Used as primary identifier |
| TicketType | ✅ | `DAY1`, `DAY2`, or `COMBO` |
| RegisteredEvent | ✅ | `Event A`, `Event B`, or `Event C` |

---

## Workflow

```
1. Convert CSV → JSON       (Convert to JSON page)
2. Insert participants      (Add Participant page)
3. Send event tickets       (Send Tickets page)
4. Scan QR on event day     (Main page — public)
5. View attendance          (Total Attendance page)
6. Send certificates        (Send Certificates page)
```

For the modular workflow, configure an event at `/events`: select MongoDB, import Excel rows, or use a Google Sheets URL; map source headers to `participant.*`; set ticket/certificate Slides URLs and the HTML email template; then queue an operation. Google Sheets and Google Slides calls run server-side using `GOOGLE_SERVICE_ACCOUNT_JSON`. Ticket PDFs contain a QR with only the ticket ID; certificate PDFs have neither ticket ID nor QR. Generated Slides copies and QR images are deleted after PDF use, and the PDF is held in memory for email attachment rather than accumulated in Drive.

Issue tickets before setting up scanner counters. In Events, provision a RED or BLUE scanner and enter its one-time pairing code on `/`; the scanner downloads only its own color's IDs. Same-color lookups and used checks are local in IndexedDB. Cross-color scans require the paired device token and an online server check; while offline, the scanner directs the guest to the help desk. Use the scanner's explicit sync action to reconcile offline used-ticket records with MongoDB.

---

## Project Structure

```
admin/
├── app/
│   ├── api/            # API routes (auth, attendance, tickets, etc.)
│   ├── dashboard/      # Protected dashboard pages
│   ├── login/          # Login page
│   └── layout.js       # Root layout
├── components/         # Reusable UI components
├── lib/
│   ├── models/         # Mongoose models
│   ├── auth.js         # JWT verification
│   ├── dbConnect.js    # MongoDB connection
│   └── utils.js        # Helper functions
└── public/             # Static assets
```

---

## Built By

**Abhivriddhi Technical Team 2026**  
VIT Pune, Bibwewadi, Pune, Maharashtra
