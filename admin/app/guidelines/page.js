"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, QrCode, BarChart2, LogOut, Menu, X, FileJson, Award, Ticket, BookOpen, ChevronDown, ChevronUp, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/useAuth";

const navItems = [
  { label: "Guidelines", icon: BookOpen, href: "/guidelines" },
  { label: "Events & Templates", icon: BookOpen, href: "/events" },
  { label: "Scan Attendance", icon: QrCode, href: "/" },
  { label: "Convert to JSON", icon: FileJson, href: "/convert-data" },
  { label: "Add Participant", icon: Users, href: "/add-participant" },
  { label: "Send Tickets", icon: Ticket, href: "/send-tickets" },
  { label: "Send Email", icon: Mail, href: "/send-email" },
  { label: "Total Attendance", icon: BarChart2, href: "/attendance" },
  { label: "Send Certificates", icon: Award, href: "/certificates" },
];

const guidelines = [
  {
    step: "01",
    title: "Convert Data to JSON",
    href: "/convert-data",
    color: "bg-gray-600",
    description: "First, prepare your participant data by converting a CSV/Excel file to JSON format.",
    steps: [
      "Go to Convert to JSON from the sidebar.",
      "Prepare your CSV file with the exact columns mentioned below.",
      "Upload the CSV or Excel file.",
      "Click Convert to JSON.",
      "Copy the output JSON and use it in the next step (Add Participant).",
    ],
    csvFormat: `Name,PRN,Email,TicketType,RegisteredEvent
VIKRANT THAKUR,12412111,vikrant@vit.edu,COMBO,Event A
KHUSHI GHUMRE,12411524,khushi@vit.edu,DAY1,Event A
JIDNYESH TOKE,,jidnyesh@gmail.com,DAY2,Event A`,
    csvNote: [
      { col: "Name", required: true, note: "Full name of the participant. Example: VIKRANT THAKUR" },
      { col: "PRN", required: false, note: "University roll number. Leave empty for NON-VIT students." },
      { col: "Email", required: true, note: "Valid email address. Used as primary identifier." },
      { col: "TicketType", required: true, note: "Must be exactly: DAY1, DAY2, or COMBO" },
      { col: "RegisteredEvent", required: true, note: "Event name. Must be exactly: Event A, Event B, or Event C" },
    ],
  },
  {
    step: "02",
    title: "Add Participants",
    href: "/add-participant",
    color: "bg-blue-500",
    description: "After converting, paste the JSON output to register all participants into the database.",
    steps: [
      "Go to Add Participant from the sidebar.",
      "Paste the JSON array (from Convert to JSON step) into the text area.",
      "Click Insert Participants — system will skip duplicates automatically.",
      "To clear data, use the Delete Collection section to remove users or attendance records.",
    ],
    format: `[
  {
    "id": "Name:VIKRANT THAKUR\\nPRN:12412111\\nEmail:vikrant@vit.edu\\nTicketType:COMBO",
    "name": "VIKRANT THAKUR",
    "prn": "12412111",          ← leave empty string "" for NON-VIT
    "email": "vikrant@vit.edu",
    "ticketType": "DAY1 / DAY2 / COMBO",
    "registeredEvent": ["Event A"]
  }
]`,
  },
  {
    step: "03",
    title: "Send Event Tickets",
    href: "/send-tickets",
    color: "bg-orange-500",
    description: "Send personalized event tickets with QR codes to all registered participants via email.",
    steps: [
      "Go to Send Tickets from the sidebar.",
      "Step 1: Select recipients by Ticket Type and Event.",
      "Step 2: Upload your ticket design image (PNG/JPG/WEBP).",
      "Step 3: Drag the green box to position the QR code on the ticket.",
      "Step 4: Customize the email subject and body.",
      "Step 5: Review and click Send Tickets.",
    ],
  },
  {
    step: "04",
    title: "Scan Attendance",
    href: "/",
    color: "bg-green-500",
    description: "On event day, scan participant QR codes to mark attendance in real time.",
    steps: [
      "Open the main page (Scan Attendance).",
      "Select the event from the dropdown (Event A / B / C).",
      "Click Start Scanner — allow camera permission.",
      "Point the camera at the participant's QR code.",
      "Success or error message appears instantly.",
      "Scanner has a 3-second cooldown between scans to prevent duplicates.",
    ],
  },
  {
    step: "05",
    title: "View Total Attendance",
    href: "/attendance",
    color: "bg-purple-500",
    description: "After the event, view and export attendance records.",
    steps: [
      "Go to Total Attendance from the sidebar.",
      "Filter by Ticket Type (DAY1 / DAY2 / COMBO) and Event.",
      "View the table with Name, Email, PRN, Ticket, Event, and Time.",
      "Click Download Excel to export filtered records as a CSV file.",
      "Use the Refresh button to get the latest data.",
    ],
  },
  {
    step: "06",
    title: "Send Certificates",
    href: "/certificates",
    color: "bg-yellow-500",
    description: "Send personalized certificates to attendees who attended the event.",
    steps: [
      "Go to Send Certificates from the sidebar.",
      "Step 1: Select recipients — only attendees will receive certificates.",
      "Step 2: Upload your certificate template image (PNG/JPG).",
      "Step 3: Drag the blue box to position the attendee's name. Choose font size, color, style, and family.",
      "Step 4: Customize the email subject and body.",
      "Step 5: Review and click Send Certificates.",
      "Each person receives the certificate only once per event (duplicate prevention).",
    ],
  },
  {
    step: "07",
    title: "Send Broadcast Emails",
    href: "/send-email",
    color: "bg-teal-500",
    description: "Send personalized announcements, schedules, or updates to all registered participants or selected filter groups.",
    steps: [
      "Go to Send Email from the sidebar.",
      "Step 1: Filter target recipients by Ticket Type (ALL / DAY1 / DAY2 / COMBO) and Event, or add manual extra emails.",
      "Step 2: Check the live recipient count and click 'Preview List' to view matching recipients.",
      "Step 3: Choose a template preset or compose your custom subject and email message.",
      "Step 4: Use variable tags like {name}, {event}, and {ticketType} to personalize content.",
      "Step 5: Optionally attach files (PDF, schedule images, guidelines).",
      "Step 6: Review the live sample preview and click 'Send Broadcast' to initiate live streamed delivery.",
    ],
  },
];

export default function GuidelinesPage() {
  const router = useRouter();
  const { logout, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expanded, setExpanded] = useState(null);

  if (loading) return null;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-200
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:flex`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <span className="font-bold text-lg tracking-tight">Abhivriddhi</span>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => { router.push(item.href); setSidebarOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                item.href === "/guidelines" && "bg-accent"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-border">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card">
          <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-sm">Guidelines</span>
        </header>

        <main className="flex-1 p-6 overflow-auto space-y-6">
          {/* Welcome */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Welcome to Abhivriddhi Panel</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Follow the steps below to manage your event from start to finish.
            </p>
          </div>

          {/* Guidelines Cards */}
          {guidelines.map((g) => (
            <Card key={g.step} className="overflow-hidden">
              <button
                className="w-full text-left"
                onClick={() => setExpanded(expanded === g.step ? null : g.step)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={cn("h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white", g.color)}>
                        {g.step}
                      </span>
                      <div>
                        <CardTitle className="text-base">{g.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-0.5">{g.description}</p>
                      </div>
                    </div>
                    {expanded === g.step
                      ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    }
                  </div>
                </CardHeader>
              </button>

              {expanded === g.step && (
                <CardContent className="pt-0 space-y-4">
                  <div className="border-t border-border pt-4 space-y-2">
                    {g.steps.map((s, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <span className={cn("h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5", g.color)}>
                          {i + 1}
                        </span>
                        <p className="text-sm text-foreground">{s}</p>
                      </div>
                    ))}
                  </div>

                  {/* CSV Format */}
                  {g.csvFormat && (
                    <div className="space-y-3">
                      <div className="rounded-lg bg-muted/50 border border-border px-4 py-3">
                        <p className="text-xs text-muted-foreground mb-2 font-medium">📄 Required CSV Column Format:</p>
                        <pre className="text-xs font-mono text-foreground leading-relaxed overflow-x-auto">{g.csvFormat}</pre>
                      </div>
                      <div className="rounded-lg border border-border overflow-hidden">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-muted/50 border-b border-border">
                              <th className="text-left px-3 py-2 font-medium">Column</th>
                              <th className="text-left px-3 py-2 font-medium">Required</th>
                              <th className="text-left px-3 py-2 font-medium">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.csvNote.map((n, i) => (
                              <tr key={i} className="border-b border-border/50 last:border-0">
                                <td className="px-3 py-2 font-mono font-bold">{n.col}</td>
                                <td className="px-3 py-2">
                                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium",
                                    n.required ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                  )}>
                                    {n.required ? "Required" : "Optional"}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-muted-foreground">{n.note}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* JSON Format */}
                  {g.format && (
                    <div className="rounded-lg bg-muted/50 border border-border px-4 py-3">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">📋 JSON Format (paste in Add Participant):</p>
                      <pre className="text-xs font-mono text-foreground leading-relaxed overflow-x-auto">{g.format}</pre>
                    </div>
                  )}

                  <Button size="sm" onClick={() => router.push(g.href)}>
                    Go to {g.title} →
                  </Button>
                </CardContent>
              )}
            </Card>
          ))}
        </main>
      </div>
    </div>
  );
}
