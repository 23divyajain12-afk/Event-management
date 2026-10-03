# Abhivriddhi Event Management System

A modular event-management platform built for **Abhivriddhi – Student Training & Development Committee, VIT Pune**.

The system centralizes event operations including participant management, ticket generation, personalized documents, email delivery, QR-based ticket scanning, attendance, certificates, and participant/ticket tracking.

## Features

- Event creation and configuration
- Participant management
- Excel and Google Sheets participant sources
- Dynamic participant field mapping
- Personalized Google Slides tickets
- QR-based ticket generation
- Red/Blue ticket validation
- Email ticket delivery
- Offline-first QR scanning
- Attendance tracking
- Certificate generation
- Participant and ticket tracking
- Operation/job monitoring
- Admin authentication

## Tech Stack

- **Frontend:** Next.js 15, React
- **Backend:** Next.js App Router APIs
- **Database:** MongoDB
- **Documents:** Google Slides & Google Apps Script
- **Email:** Gmail SMTP
- **Scanner:** QR scanning + IndexedDB

## System Overview

```text
Admin Panel
     │
     ▼
Next.js Application
     │
     ├── MongoDB
     │    ├── Events
     │    ├── Participants
     │    ├── Tickets
     │    └── Operations
     │
     ├── Google Slides
     │
     ├── Google Apps Script
     │
     └── Gmail SMTP
              │
              ▼
       Tickets / Emails
              │
              ▼
        QR Scanner

## Project Structure

admin/
├── app/
├── components/
├── lib/
├── public/
└── AppsScript/
    ├── Code.gs
    └── README_AppsScript.md

## Getting Started

cd admin
npm install
npm run dev

## Documentation
- [Deployment & Account Setup](docs/DEPLOYMENT.md)
- [Apps Script Setup](admin/AppsScript/README_AppsScript.md)

## Security
Never commit:
- .env.local
- Google service-account credentials
- MongoDB credentials
- Gmail App Passwords
- API secrets
- JWT secrets
- Participant personal-data exports

## Project Status
Developed for operational use by the Abhivriddhi Student Training & Development Committee, VIT Pune.