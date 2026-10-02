# Event Management System
## Copilot Project Reference

> This document is the authoritative implementation reference for the modular event-management system being developed inside the existing Next.js admin application.
>
> The existing admin repository has already been fully inspected.
>
> The goal is to extend and refactor the existing application, not rebuild it from scratch.

---

# 1. PROJECT OVERVIEW

This project is a modular event-management platform for managing participants, tickets, attendance, certificates, and personalized email communication.

The system is being built by extending the existing Next.js admin application.

The final architecture is:

```text
                    ┌─────────────────────┐
                    │   Event Configuration│
                    └──────────┬──────────┘
                               │
                               ▼
┌──────────────┐      ┌─────────────────────┐
│ Excel        │      │ Participant Sources │
│ Google Sheet │ ───► │ MongoDB             │
│ MongoDB      │      └──────────┬──────────┘
└──────────────┘                 │
                                 ▼
                         ┌────────────────┐
                         │ Field Mapping  │
                         └───────┬────────┘
                                 │
                                 ▼
                      ┌──────────────────────┐
                      │ Normalized Participant│
                      │ + Custom Fields       │
                      └──────────┬───────────┘
                                 │
               ┌─────────────────┼─────────────────┐
               │                 │                 │
               ▼                 ▼                 ▼
          ┌─────────┐      ┌────────────┐    ┌─────────┐
          │ Tickets │      │ Certificates│    │ Email   │
          └────┬────┘      └──────┬─────┘    └────┬────┘
               │                  │               │
               └──────────────────┼───────────────┘
                                  ▼
                       ┌────────────────────┐
                       │ Template Engine    │
                       │ Google Slides      │
                       └────────────────────┘
