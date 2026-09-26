"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users,
  LogOut,
  Menu,
  X,
  Mail,
  Send,
  Paperclip,
  Eye,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Info,
  FileSpreadsheet,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/hooks/useAuth";

const navItems = [
  { label: "Send Email", icon: Mail, href: "/send-email" },
];

const TICKET_TYPES = ["ALL", "DAY1", "DAY2", "COMBO"];
const EVENTS = ["ALL", "Event A", "Event B", "Event C"];

const TEMPLATES = [
  {
    id: "announcement",
    name: "General Announcement",
    subject: "Important Update regarding Abhivriddhi 2026",
    body: `Dear {name},

We are excited to welcome you to Abhivriddhi!

Here are a few important announcements regarding your registration for {event} ({ticketType} pass):

1. Please make sure to bring your college ID and event ticket QR code.
2. Gates open at 8:30 AM at Vishwakarma Institute of Technology, Pune.
3. For any questions, reply directly to this email or reach out to our team.

We look forward to seeing you there!

Warm regards,
Abhivriddhi Organizing Team`,
  },
  {
    id: "schedule",
    name: "Event Schedule & Timings",
    subject: "Schedule & Venue Details for {event} — Abhivriddhi",
    body: `Hello {name},

Here is the detailed schedule for {event} ({ticketType} pass):

• Date & Reporting Time: 9:00 AM Sharp
• Venue: Vishwakarma Institute of Technology, Bibwewadi, Pune
• Important: Keep your QR ticket handy on your phone for quick entry scanning.

If you have any queries, feel free to contact our coordinator team.

See you at the event!
Abhivriddhi Team`,
  },
  {
    id: "reminder",
    name: "Urgent Reminder",
    subject: "Reminder: Tomorrow is Abhivriddhi 2026!",
    body: `Hi {name},

This is a friendly reminder that {event} is scheduled for tomorrow!

Your Registration Details:
• Name: {name}
• Ticket Type: {ticketType}
• PRN: {prn}

Please arrive 15 minutes before your scheduled slot. We can't wait to host you!

Best wishes,
Team Abhivriddhi`,
  },
];

export default function SendEmailPage() {
  const router = useRouter();
  const { admin, loading, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Audience & Filter State
  const [selectedTicketType, setSelectedTicketType] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState("ALL");
  const [customEmails, setCustomEmails] = useState("");
  const [recipientCount, setRecipientCount] = useState(null);
  const [previewUsers, setPreviewUsers] = useState([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [showRecipientModal, setShowRecipientModal] = useState(false);

  // Email Content State
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);

  // Sending & Stream State
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(null); // { sent, failed, total, currentEmail, devMode }
  const [streamLogs, setStreamLogs] = useState([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Excel Upload State
  const [excelParticipants, setExcelParticipants] = useState([]);
  const [excelFileName, setExcelFileName] = useState("");
  const [saveToDatabase, setSaveToDatabase] = useState(false);

  const [bulkCampaignName, setBulkCampaignName] = useState("");
  const [bulkSubject, setBulkSubject] = useState("");
  const [bulkBody, setBulkBody] = useState("");
  const [bulkPreview, setBulkPreview] = useState(null);
  const [bulkHistory, setBulkHistory] = useState([]);
  const [bulkUploadError, setBulkUploadError] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [showBulkConfirmModal, setShowBulkConfirmModal] = useState(false);

  const logsEndRef = useRef(null);
  const excelInputRef = useRef(null);

  // Parse uploaded Excel file
  const handleExcelUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        // Auto-detect name and email columns
        const parsed = jsonData
          .map((row) => {
            const name =
              row.name || row.Name || row["NAME"] || row["Student Name"] || row["Full Name"] || row["student_name"] || "";
            const email =
              row.email || row.Email || row["EMAIL"] || row["Email Address"] || row["Mail"] || row["email_id"] || "";
            const prn = row.prn || row.PRN || row["Roll No"] || row["roll_no"] || "";
            return { name: String(name).trim(), email: String(email).trim().toLowerCase(), prn: String(prn).trim() };
          })
          .filter((r) => r.email && /\S+@\S+\.\S+/.test(r.email));

        setExcelParticipants(parsed);
      } catch (err) {
        console.error("Excel parse error:", err);
        alert("Failed to parse Excel file. Please make sure it's a valid .xlsx or .xls file.");
        setExcelParticipants([]);
        setExcelFileName("");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const clearExcel = () => {
    setExcelParticipants([]);
    setExcelFileName("");
    if (excelInputRef.current) excelInputRef.current.value = "";
  };

  const fetchBulkHistory = async () => {
    try {
      const response = await fetch("/api/bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "history" }),
      });

      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setBulkHistory(data.campaigns || []);
    } catch (error) {
      console.error("Failed to fetch bulk campaign history:", error);
    }
  };

  const handleBulkExcelUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setBulkUploadError("");
    const formData = new FormData();
    formData.append("action", "preview");
    formData.append("file", file);

    try {
      const response = await fetch("/api/bulk-email", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to validate uploaded file.");
      }

      setBulkPreview(data);
      setBulkCampaignName((prev) => prev || file.name.replace(/\.[^.]+$/, ""));
      setBulkSubject((prev) => prev || "Abhivriddhi VIT Email Campaign");
    } catch (error) {
      setBulkPreview(null);
      setBulkUploadError(error.message || "Unable to validate file.");
    }
  };

  const openBulkSendConfirmation = () => {
    if (!bulkPreview || bulkPreview.validCount === 0) {
      setBulkUploadError("Please upload a valid Excel file with at least one accepted VIT participant.");
      return;
    }

    if (!bulkCampaignName.trim() || !bulkSubject.trim() || !bulkBody.trim()) {
      setBulkUploadError("Campaign name, subject, and email body are required before sending.");
      return;
    }

    setBulkUploadError("");
    setShowBulkConfirmModal(true);
  };

  const sendBulkCampaign = async () => {
    if (!bulkPreview || bulkPreview.validCount === 0) {
      return;
    }

    setBulkSending(true);
    setBulkUploadError("");
    setShowBulkConfirmModal(false);

    try {
      const response = await fetch("/api/bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          campaignName: bulkCampaignName,
          subject: bulkSubject,
          body: bulkBody,
          participants: bulkPreview.validParticipants,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Bulk email request failed.");
      }

      setBulkCampaignName("");
      setBulkSubject("");
      setBulkBody("");
      setBulkPreview(null);
      const input = document.getElementById("bulk-email-file");
      if (input) input.value = "";
      await fetchBulkHistory();
      alert(data.message || "Bulk campaign queued successfully.");
    } catch (error) {
      setBulkUploadError(error.message || "Unable to send bulk email campaign.");
    } finally {
      setBulkSending(false);
    }
  };

  const retryBulkCampaign = async (campaignId) => {
    try {
      const response = await fetch("/api/bulk-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "retry", campaignId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Retry failed.");
      }

      await fetchBulkHistory();
      alert(data.message || "Retry queued successfully.");
    } catch (error) {
      alert(error.message || "Unable to retry failed emails.");
    }
  };

  // Fetch recipient count whenever filters change
  useEffect(() => {
    const fetchRecipients = async () => {
      setLoadingRecipients(true);
      try {
        const res = await fetch(
          `/api/get-email-recipients?ticketType=${encodeURIComponent(
            selectedTicketType
          )}&event=${encodeURIComponent(selectedEvent)}`
        );
        if (res.ok) {
          const data = await res.json();
          setRecipientCount(data.totalCount || 0);
          setPreviewUsers(data.users || []);
        }
      } catch (err) {
        console.error("Error fetching recipients:", err);
      } finally {
        setLoadingRecipients(false);
      }
    };

    fetchRecipients();
  }, [selectedTicketType, selectedEvent]);

  useEffect(() => {
    fetchBulkHistory();
  }, []);

  // Auto-scroll stream logs
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [streamLogs]);

  // Insert variable into active field
  const insertVariable = (variable) => {
    setBody((prev) => prev + variable);
  };

  // Apply template preset
  const applyTemplate = (tmpl) => {
    setSubject(tmpl.subject);
    setBody(tmpl.body);
  };

  // Calculate total target count (Excel + DB users + manual emails)
  const manualCount = customEmails
    .split(/[\n,;]+/)
    .map((e) => e.trim())
    .filter((e) => e.length > 0 && /\S+@\S+\.\S+/.test(e)).length;

  const excelCount = excelParticipants.length;
  const totalTargetCount = excelCount > 0 ? excelCount + manualCount : (recipientCount || 0) + manualCount;

  // Handle starting the broadcast
  const startBroadcast = async () => {
    setShowConfirmModal(false);
    setIsSending(true);
    setIsCompleted(false);
    setStreamLogs([]);
    setSendProgress({ sent: 0, failed: 0, total: totalTargetCount, currentEmail: "" });

    const formData = new FormData();
    formData.append("ticketType", selectedTicketType);
    formData.append("event", selectedEvent);
    formData.append("emailSubject", subject);
    formData.append("emailBody", body);
    if (excelParticipants.length > 0) {
      formData.append("excelParticipants", JSON.stringify(excelParticipants));
      formData.append("saveToDatabase", saveToDatabase ? "true" : "false");
    }
    if (customEmails.trim()) {
      formData.append("customEmails", customEmails);
    }
    if (attachment) {
      formData.append("attachment", attachment);
    }

    try {
      const response = await fetch("/api/send-email-stream", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.message || "Failed to start sending emails.");
        setIsSending(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop(); // keep remainder

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.replace("data: ", ""));

              if (data.type === "total") {
                setSendProgress((p) => ({
                  ...p,
                  total: data.total,
                  devMode: data.devMode,
                }));
              } else if (data.type === "progress") {
                setSendProgress((p) => ({
                  ...p,
                  sent: data.sent,
                  failed: data.failed,
                  total: data.total,
                  currentEmail: data.email,
                }));

                setStreamLogs((prev) => [
                  ...prev,
                  {
                    email: data.email,
                    name: data.name,
                    status: data.status,
                    reason: data.reason,
                    time: new Date().toLocaleTimeString(),
                  },
                ]);
              } else if (data.type === "done") {
                setSendProgress((p) => ({
                  ...p,
                  sent: data.sent,
                  failed: data.failed,
                  total: data.total,
                  failedList: data.failedList || [],
                  devMode: data.devMode,
                }));
                setIsCompleted(true);
                setIsSending(false);
              }
            } catch (err) {
              console.error("Error parsing stream line:", err);
            }
          }
        }
      }
    } catch (error) {
      console.error("Stream error:", error);
      alert("An error occurred during email transmission: " + error.message);
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Verifying administrator credentials...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
        <div className="p-6 border-b border-border flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" />
          <span className="font-semibold text-base tracking-tight text-card-foreground">
            Abhivriddhi Admin
          </span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/send-email";
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="w-full justify-start text-muted-foreground hover:text-destructive gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border p-6 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <span className="font-semibold text-base">Abhivriddhi Admin</span>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 mt-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === "/send-email";
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      router.push(item.href);
                      setSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="mt-auto text-destructive justify-start gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="border-b border-border bg-card px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-base font-semibold text-foreground">Send Broadcast Email</h1>
              <p className="text-xs text-muted-foreground">
                Dispatch personalized emails to all registered participants or selected groups
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Logged in as <strong className="text-foreground">{admin?.username || "Admin"}</strong>
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-8 max-w-6xl w-full mx-auto space-y-6">
          <Card className="border-primary/30 bg-card/95">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    Bulk Participant Email Campaign
                  </CardTitle>
                  <CardDescription>
                    Upload a participant Excel file with Name, Email, and Mobile No columns. Only @vit.edu email addresses are accepted.
                  </CardDescription>
                </div>
                <div className="text-xs text-muted-foreground">
                  {bulkPreview ? `${bulkPreview.validCount} valid / ${bulkPreview.invalidCount} invalid` : "Awaiting file upload"}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Upload participant Excel (.xlsx / .xls)</label>
                  <input
                    id="bulk-email-file"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleBulkExcelUpload}
                    className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground file:font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Campaign Name</label>
                  <input
                    type="text"
                    value={bulkCampaignName}
                    onChange={(event) => setBulkCampaignName(event.target.value)}
                    placeholder="e.g. VIT Placement Drive"
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Subject</label>
                  <input
                    type="text"
                    value={bulkSubject}
                    onChange={(event) => setBulkSubject(event.target.value)}
                    placeholder="Bulk email subject"
                    className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground">Personalization</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "{{name}}",
                      "{{email}}",
                      "{{mobileNo}}",
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setBulkBody((prev) => `${prev}${prev ? " " : ""}${tag}`)}
                        className="text-xs px-2 py-1 border border-border rounded bg-muted hover:bg-muted/80 text-foreground"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Email Body</label>
                <textarea
                  value={bulkBody}
                  onChange={(event) => setBulkBody(event.target.value)}
                  rows={7}
                  placeholder="Dear {{name}},\n\nWe are pleased to share..."
                  className="w-full bg-background border border-border rounded-md p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {bulkUploadError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {bulkUploadError}
                </div>
              )}

              {bulkPreview && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="border border-border rounded-lg bg-muted/30 p-3 text-center">
                      <div className="text-xl font-bold text-foreground">{bulkPreview.totalRows}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Total Rows</div>
                    </div>
                    <div className="border border-border rounded-lg bg-muted/30 p-3 text-center">
                      <div className="text-xl font-bold text-emerald-500">{bulkPreview.validCount}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Valid</div>
                    </div>
                    <div className="border border-border rounded-lg bg-muted/30 p-3 text-center">
                      <div className="text-xl font-bold text-destructive">{bulkPreview.invalidCount}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Invalid</div>
                    </div>
                    <div className="border border-border rounded-lg bg-muted/30 p-3 text-center">
                      <div className="text-xl font-bold text-primary">{bulkPreview.validParticipants.length}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Ready to Send</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                        Valid Participants
                      </div>
                      <div className="max-h-52 overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-muted/20 border-b border-border">
                            <tr>
                              <th className="px-3 py-2">Name</th>
                              <th className="px-3 py-2">Email</th>
                              <th className="px-3 py-2">Mobile</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {bulkPreview.validParticipants.slice(0, 25).map((participant, index) => (
                              <tr key={`${participant.email}-${index}`}>
                                <td className="px-3 py-2">{participant.name}</td>
                                <td className="px-3 py-2 text-muted-foreground">{participant.email}</td>
                                <td className="px-3 py-2 text-muted-foreground">{participant.mobileNo}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                        Invalid Rows
                      </div>
                      <div className="max-h-52 overflow-y-auto">
                        {bulkPreview.invalidRows.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground">No invalid rows found.</div>
                        ) : (
                          <table className="w-full text-left text-xs">
                            <thead className="bg-muted/20 border-b border-border">
                              <tr>
                                <th className="px-3 py-2">Row</th>
                                <th className="px-3 py-2">Email</th>
                                <th className="px-3 py-2">Issue</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {bulkPreview.invalidRows.slice(0, 25).map((row, index) => (
                                <tr key={`${row.rowNumber}-${index}`}>
                                  <td className="px-3 py-2 text-muted-foreground">{row.rowNumber}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{row.email || "-"}</td>
                                  <td className="px-3 py-2 text-destructive">{row.issues.join(", ")}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 justify-between items-center border-t border-border pt-4">
                <div className="text-xs text-muted-foreground">
                  {bulkPreview ? `Ready to send ${bulkPreview.validCount} valid recipients` : "Upload a file to continue"}
                </div>
                <Button
                  size="lg"
                  onClick={openBulkSendConfirmation}
                  disabled={bulkSending || !bulkPreview || bulkPreview.validCount === 0}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  {bulkSending ? "Sending..." : "Send Emails"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  Campaign History
                </CardTitle>
                <Button variant="outline" size="sm" onClick={fetchBulkHistory}>
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {bulkHistory.length === 0 ? (
                <div className="text-sm text-muted-foreground">No bulk email campaigns yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-border text-muted-foreground">
                      <tr>
                        <th className="pb-2 pr-3">Campaign</th>
                        <th className="pb-2 pr-3">Status</th>
                        <th className="pb-2 pr-3">Sent</th>
                        <th className="pb-2 pr-3">Failed</th>
                        <th className="pb-2 pr-3">Pending</th>
                        <th className="pb-2 pr-3">Total</th>
                        <th className="pb-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {bulkHistory.map((campaign) => (
                        <tr key={campaign._id}>
                          <td className="py-2 pr-3 font-medium text-foreground">{campaign.campaignName}</td>
                          <td className="py-2 pr-3 text-primary">{campaign.status}</td>
                          <td className="py-2 pr-3">{campaign.sentCount}</td>
                          <td className="py-2 pr-3">{campaign.failedCount}</td>
                          <td className="py-2 pr-3">{campaign.pendingCount}</td>
                          <td className="py-2 pr-3">{campaign.totalRecipients}</td>
                          <td className="py-2">
                            {campaign.failedCount > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => retryBulkCampaign(campaign._id)}
                                className="h-7"
                              >
                                Retry Failed
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress / Live Stream Modal or Banner when sending */}
          {(isSending || isCompleted) && (
            <Card className="border-primary/40 shadow-lg bg-card/90 backdrop-blur">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isSending ? (
                      <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    <CardTitle className="text-lg">
                      {isSending ? "Broadcasting Emails..." : "Broadcast Completed"}
                    </CardTitle>
                  </div>
                  {sendProgress?.devMode && (
                    <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium">
                      Dev Simulation Mode
                    </span>
                  )}
                </div>
                <CardDescription>
                  {isSending
                    ? `Currently delivering: ${sendProgress?.currentEmail || "preparing batches..."}`
                    : `Finished delivering emails to ${sendProgress?.sent || 0} recipients.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-muted/40 p-3 rounded-lg border border-border text-center">
                    <div className="text-2xl font-bold text-foreground">{sendProgress?.sent || 0}</div>
                    <div className="text-xs text-muted-foreground">Sent Successfully</div>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-lg border border-border text-center">
                    <div className="text-2xl font-bold text-destructive">{sendProgress?.failed || 0}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-lg border border-border text-center">
                    <div className="text-2xl font-bold text-primary">{sendProgress?.total || 0}</div>
                    <div className="text-xs text-muted-foreground">Total Recipients</div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-primary h-full transition-all duration-300 ease-out"
                    style={{
                      width: `${
                        sendProgress?.total
                          ? Math.min(
                              100,
                              Math.round(
                                (((sendProgress?.sent || 0) + (sendProgress?.failed || 0)) /
                                  sendProgress.total) *
                                  100
                              )
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>

                {/* Live Stream Terminal Logs */}
                <div className="bg-black/90 text-green-400 font-mono text-xs rounded-lg p-3 h-44 overflow-y-auto border border-border space-y-1">
                  <div className="text-muted-foreground">-- Live Delivery Feed --</div>
                  {streamLogs.map((log, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-muted-foreground shrink-0">{log.time}</span>
                      {log.status === "success" ? (
                        <span className="text-green-400">✓ Sent to {log.email} ({log.name})</span>
                      ) : (
                        <span className="text-red-400">✗ Failed {log.email}: {log.reason}</span>
                      )}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>

                {isCompleted && (
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsCompleted(false);
                        setSendProgress(null);
                        setStreamLogs([]);
                      }}
                    >
                      Dismiss Summary
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (2 cols): Recipient Filters & Composer */}
            <div className="lg:col-span-2 space-y-6">
              {/* Step 1: Target Audience */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-primary" />
                      1. Select Target Recipients
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRecipientModal(true)}
                      className="text-xs h-7 gap-1"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview List ({loadingRecipients ? "..." : recipientCount})
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Filter who will receive this message or add custom email addresses.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Excel Upload Section */}
                  <div className="space-y-3">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                      Upload Participant Excel File (.xlsx / .xls)
                    </label>
                    <input
                      ref={excelInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleExcelUpload}
                      className="hidden"
                      id="excel-upload"
                    />

                    {excelParticipants.length === 0 ? (
                      <label
                        htmlFor="excel-upload"
                        className="cursor-pointer flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-6 hover:border-primary/50 hover:bg-muted/30 transition-colors"
                      >
                        <FileSpreadsheet className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm font-medium text-foreground">
                          Click to upload Excel file
                        </span>
                        <span className="text-xs text-muted-foreground mt-1">
                          Columns should include Name and Email
                        </span>
                      </label>
                    ) : (
                      <div className="space-y-3">
                        {/* File info and actions */}
                        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-primary" />
                            <div>
                              <div className="text-sm font-medium text-foreground">{excelFileName}</div>
                              <div className="text-xs text-muted-foreground">
                                {excelParticipants.length} valid email recipients found
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearExcel}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 h-7"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </Button>
                        </div>

                        {/* Preview table of parsed participants */}
                        <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-muted/50 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-muted-foreground font-semibold">#</th>
                                <th className="px-3 py-2 text-muted-foreground font-semibold">Name</th>
                                <th className="px-3 py-2 text-muted-foreground font-semibold">Email</th>
                                <th className="px-3 py-2 text-muted-foreground font-semibold">PRN</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {excelParticipants.slice(0, 50).map((p, i) => (
                                <tr key={i} className="hover:bg-muted/20">
                                  <td className="px-3 py-1.5 text-muted-foreground">{i + 1}</td>
                                  <td className="px-3 py-1.5 font-medium text-foreground">{p.name || "-"}</td>
                                  <td className="px-3 py-1.5 text-muted-foreground font-mono">{p.email}</td>
                                  <td className="px-3 py-1.5 text-muted-foreground">{p.prn || "-"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {excelParticipants.length > 50 && (
                            <div className="bg-muted/30 text-center py-2 text-xs text-muted-foreground border-t border-border">
                              Showing 50 of {excelParticipants.length} participants
                            </div>
                          )}
                        </div>

                        {/* Save to Database checkbox */}
                        <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={saveToDatabase}
                            onChange={(e) => setSaveToDatabase(e.target.checked)}
                            className="rounded border-border"
                          />
                          Also save these participants to the database for future use
                        </label>
                      </div>
                    )}
                  </div>

                  {/* DB Filters — only shown when no Excel is uploaded */}
                  {excelParticipants.length === 0 && (
                    <>
                      <div className="relative flex items-center py-1">
                        <div className="flex-1 border-t border-border"></div>
                        <span className="px-3 text-[10px] text-muted-foreground uppercase tracking-wider">
                          Or filter from database
                        </span>
                        <div className="flex-1 border-t border-border"></div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Ticket Type Filter */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">
                            Ticket Type
                          </label>
                          <select
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            value={selectedTicketType}
                            onChange={(e) => setSelectedTicketType(e.target.value)}
                            disabled={isSending}
                          >
                            {TICKET_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t === "ALL" ? "All Ticket Types" : t}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Event Filter */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground">
                            Registered Event
                          </label>
                          <select
                            className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            value={selectedEvent}
                            onChange={(e) => setSelectedEvent(e.target.value)}
                            disabled={isSending}
                          >
                            {EVENTS.map((ev) => (
                              <option key={ev} value={ev}>
                                {ev === "ALL" ? "All Events" : ev}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Manual / Custom emails input */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
                      <span>Additional / Manual Emails (Optional)</span>
                      {manualCount > 0 && (
                        <span className="text-primary font-normal">
                          +{manualCount} manual addresses detected
                        </span>
                      )}
                    </label>
                    <textarea
                      placeholder={"Paste additional emails separated by commas or new lines\ne.g. guest1@example.com, speaker@vit.edu"}
                      value={customEmails}
                      onChange={(e) => setCustomEmails(e.target.value)}
                      disabled={isSending}
                      rows={2}
                      className="w-full bg-background border border-border rounded-md p-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Recipient summary badge */}
                  <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-primary" />
                      Total recipients to be emailed:
                    </span>
                    <span className="font-bold text-foreground text-sm">
                      {loadingRecipients && excelParticipants.length === 0 ? "Loading..." : totalTargetCount} recipients
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Step 2: Email Composer */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      2. Compose Email
                    </CardTitle>
                    {/* Quick Template Picker */}
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      <select
                        className="text-xs bg-muted border border-border rounded px-2 py-1 text-foreground focus:outline-none"
                        onChange={(e) => {
                          const tmpl = TEMPLATES.find((t) => t.id === e.target.value);
                          if (tmpl) applyTemplate(tmpl);
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Load Template...
                        </option>
                        {TEMPLATES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <CardDescription>
                    Write your message. Use variables like {"{name}"} to automatically personalize each email.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Subject Line */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Email Subject Line
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Schedule Announcement for {event} — Abhivriddhi"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      disabled={isSending}
                      className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  {/* Variable Helper Chips */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground font-medium">
                      Insert Personalization Tags:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { label: "{name}", desc: "Full Name" },
                        { label: "{email}", desc: "Email" },
                        { label: "{ticketType}", desc: "Ticket Type" },
                        { label: "{event}", desc: "Event Name" },
                        { label: "{prn}", desc: "Roll/PRN" },
                      ].map((v) => (
                        <button
                          key={v.label}
                          type="button"
                          onClick={() => insertVariable(v.label)}
                          className="text-xs bg-muted hover:bg-muted/80 text-foreground px-2.5 py-1 rounded border border-border transition-colors flex items-center gap-1"
                          title={`Inserts ${v.desc}`}
                        >
                          <span className="font-mono text-primary font-bold">{v.label}</span>
                          <span className="text-[10px] text-muted-foreground">({v.desc})</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Email Body */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground">
                      Email Message Body
                    </label>
                    <textarea
                      placeholder="Write your email body here...&#10;&#10;Dear {name},&#10;&#10;We look forward to seeing you at {event}!"
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      disabled={isSending}
                      rows={9}
                      className="w-full bg-background border border-border rounded-md p-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-sans leading-relaxed"
                    />
                  </div>

                  {/* File Attachment */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-primary" />
                      Attach File / Document (Optional)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        id="email-attachment"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            setAttachment(e.target.files[0]);
                          }
                        }}
                      />
                      <label
                        htmlFor="email-attachment"
                        className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-muted/60 hover:bg-muted text-xs font-medium text-foreground transition-colors"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        {attachment ? "Change Attachment" : "Select File (PDF, Image, Doc)"}
                      </label>
                      {attachment && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">{attachment.name}</span>
                          <span>({(attachment.size / 1024).toFixed(1)} KB)</span>
                          <button
                            type="button"
                            onClick={() => setAttachment(null)}
                            className="text-destructive hover:underline"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column (1 col): Live Preview & Action Card */}
            <div className="space-y-6">
              {/* Broadcast Action Card */}
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Send className="h-4 w-4 text-primary" />
                    Review & Broadcast
                  </CardTitle>
                  <CardDescription>
                    Verify recipient count and email content before triggering broadcast.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-xs border border-border bg-muted/30 p-3 rounded-lg">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Source:</span>
                      <span className="font-semibold text-foreground">
                        {excelParticipants.length > 0 ? `Excel (${excelFileName})` : "Database"}
                      </span>
                    </div>
                    {excelParticipants.length === 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Ticket Filter:</span>
                          <span className="font-semibold text-foreground">{selectedTicketType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Event Filter:</span>
                          <span className="font-semibold text-foreground">{selectedEvent}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target Recipients:</span>
                      <span className="font-bold text-primary text-sm">{totalTargetCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Attachment:</span>
                      <span className="text-foreground">
                        {attachment ? attachment.name : "None"}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => setShowConfirmModal(true)}
                    disabled={isSending || totalTargetCount === 0 || !subject.trim() || !body.trim()}
                    className="w-full gap-2 shadow-sm font-semibold"
                    size="lg"
                  >
                    {isSending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Sending Broadcast...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Broadcast to {totalTargetCount} Recipients
                      </>
                    )}
                  </Button>

                  {(!subject.trim() || !body.trim()) && (
                    <p className="text-[11px] text-amber-500 text-center">
                      Please enter a subject and body to enable broadcasting.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Sample Live Preview Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5 text-primary" />
                      Live Sample Preview
                    </span>
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      Sample: Vikrant Thakur
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-background border border-border rounded-lg p-3 text-xs space-y-2">
                    <div className="border-b border-border pb-2">
                      <div className="text-muted-foreground text-[10px]">Subject:</div>
                      <div className="font-semibold text-foreground mt-0.5">
                        {subject
                          ? subject
                              .replace(/{name}/g, "Vikrant Thakur")
                              .replace(/{event}/g, selectedEvent === "ALL" ? "Event A" : selectedEvent)
                              .replace(/{ticketType}/g, selectedTicketType === "ALL" ? "COMBO" : selectedTicketType)
                              .replace(/{prn}/g, "12412111")
                          : "(Subject line will appear here)"}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-[10px] mb-1">Body:</div>
                      <div className="text-muted-foreground whitespace-pre-wrap leading-relaxed text-[11px]">
                        {body
                          ? body
                              .replace(/{name}/g, "Vikrant Thakur")
                              .replace(/{event}/g, selectedEvent === "ALL" ? "Event A" : selectedEvent)
                              .replace(/{ticketType}/g, selectedTicketType === "ALL" ? "COMBO" : selectedTicketType)
                              .replace(/{prn}/g, "12412111")
                          : "(Email body will appear here)"}
                      </div>
                    </div>
                    {attachment && (
                      <div className="mt-2 pt-2 border-t border-border flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Paperclip className="h-3 w-3 text-primary" />
                        Attached: {attachment.name}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

      {/* Recipient Preview Modal */}
      {showRecipientModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base">Recipient Preview</h3>
                <p className="text-xs text-muted-foreground">
                  Showing matches for Ticket: <strong>{selectedTicketType}</strong> | Event:{" "}
                  <strong>{selectedEvent}</strong>
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowRecipientModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {previewUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No participants match this filter in the database.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border text-muted-foreground">
                    <tr>
                      <th className="pb-2">Name</th>
                      <th className="pb-2">Email</th>
                      <th className="pb-2">Ticket</th>
                      <th className="pb-2">Events</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewUsers.map((u, i) => (
                      <tr key={i} className="hover:bg-muted/30">
                        <td className="py-2 font-medium text-foreground">{u.name}</td>
                        <td className="py-2 text-muted-foreground font-mono">{u.email}</td>
                        <td className="py-2 text-primary">{u.ticketType}</td>
                        <td className="py-2 text-muted-foreground">
                          {Array.isArray(u.registeredEvent)
                            ? u.registeredEvent.join(", ")
                            : u.registeredEvent}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-3 border-t border-border flex justify-between items-center bg-muted/20 text-xs text-muted-foreground">
              <span>
                Showing {previewUsers.length} of {recipientCount} total matching database records
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRecipientModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal before Sending */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-full">
                <Send className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Confirm Broadcast Dispatch</h3>
                <p className="text-xs text-muted-foreground">
                  You are about to broadcast this email.
                </p>
              </div>
            </div>

            <div className="bg-muted/40 p-3 rounded-lg border border-border text-xs space-y-1.5">
              <div>
                <strong>Recipients:</strong> {totalTargetCount} participants
              </div>
              <div>
                <strong>Subject:</strong> {subject}
              </div>
              {attachment && (
                <div>
                  <strong>Attachment:</strong> {attachment.name}
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Once initiated, emails will be delivered sequentially with live progress streaming. Are you sure you want to proceed?
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel
              </Button>
              <Button size="sm" onClick={startBroadcast} className="gap-1.5">
                <Send className="h-3.5 w-3.5" />
                Yes, Send Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {showBulkConfirmModal && bulkPreview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-full">
                <Send className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Confirm Bulk Email Campaign</h3>
                <p className="text-xs text-muted-foreground">
                  This will queue emails for valid VIT recipients only.
                </p>
              </div>
            </div>

            <div className="bg-muted/40 p-3 rounded-lg border border-border text-xs space-y-1.5">
              <div>
                <strong>Campaign:</strong> {bulkCampaignName}
              </div>
              <div>
                <strong>Recipients:</strong> {bulkPreview.validCount} participants
              </div>
              <div>
                <strong>Subject:</strong> {bulkSubject}
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Emails are sent in the background and each recipient is tracked as PENDING, SENDING, SENT, or FAILED. This action cannot be undone for already queued emails.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowBulkConfirmModal(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={sendBulkCampaign} className="gap-1.5" disabled={bulkSending}>
                <Send className="h-3.5 w-3.5" />
                Yes, Send Emails
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
