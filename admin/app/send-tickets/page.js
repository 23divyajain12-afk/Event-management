"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, QrCode, BarChart2, LogOut, Menu, X, FileJson, Award, Upload, Send, Ticket, Mail, ChevronRight, ChevronLeft, Check, Move, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import Tooltip from "@/components/Tooltip";
import { useAuth } from "@/lib/hooks/useAuth";

const navItems = [
  { label: "Guidelines", icon: BookOpen, href: "/guidelines" },
  { label: "Scan Attendance", icon: QrCode, href: "/" },
  { label: "Convert to JSON", icon: FileJson, href: "/convert-data" },
  { label: "Add Participant", icon: Users, href: "/add-participant" },
  { label: "Send Tickets", icon: Ticket, href: "/send-tickets" },
  { label: "Send Email", icon: Mail, href: "/send-email" },
  { label: "Total Attendance", icon: BarChart2, href: "/attendance" },
  { label: "Send Certificates", icon: Award, href: "/certificates" },
];

const TICKET_TYPES = ["ALL", "DAY1", "DAY2", "COMBO"];
const EVENTS = ["ALL", "Event A", "Event B", "Event C"];

const steps = [
  { id: 1, label: "Recipients" },
  { id: 2, label: "Ticket Design" },
  { id: 3, label: "QR Position" },
  { id: 4, label: "Email Content" },
  { id: 5, label: "Review & Send" },
];

// Default QR values from Python script
const DEFAULT_QR_SIZE = 150;
const DEFAULT_QR_X = 432;
const DEFAULT_QR_Y = 65; // (250 - 150) / 2

export default function SendTicketsPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTicketType, setSelectedTicketType] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState("ALL");
  const [ticketFile, setTicketFile] = useState(null);
  const [ticketPreviewUrl, setTicketPreviewUrl] = useState(null);
  const [emailSubject, setEmailSubject] = useState("Your Event Ticket - Abhivriddhi");
  const [emailBody, setEmailBody] = useState(
    "Dear {name},\n\nThank you for registering for {event}!\n\nPlease find your event ticket attached to this email. Kindly present this ticket at the venue for entry.\n\nEvent Details:\n- Event: {event}\n- Ticket Type: {ticketType}\n\nWe look forward to seeing you!\n\nWarm regards,\nAbhivriddhi Team"
  );
  const fileInputRef = useRef(null);

  // QR position state (actual pixel values for Python)
  const [qrSize, setQrSize] = useState(DEFAULT_QR_SIZE);
  const [qrX, setQrX] = useState(DEFAULT_QR_X);
  const [qrY, setQrY] = useState(DEFAULT_QR_Y);

  // For drag/resize on canvas
  const imgRef = useRef(null);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 630, h: 280 });
  const [imgDisplaySize, setImgDisplaySize] = useState({ w: 630, h: 280 });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [progress, setProgress] = useState(null);
  const [failedList, setFailedList] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const previewCanvasRef = useRef(null);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, qrX: 0, qrY: 0 });
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, size: 0 });

  const { logout, loading: authLoading } = useAuth();

  const handleLogout = () => { logout(); };

  // Generate ticket preview with QR code using Canvas API
  const generatePreview = async () => {
    if (!ticketPreviewUrl) return;
    setGeneratingPreview(true);
    setPreviewUrl(null);
    try {
      // Load ticket image
      const ticketImg = new Image();
      ticketImg.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        ticketImg.onload = resolve;
        ticketImg.onerror = reject;
        ticketImg.src = ticketPreviewUrl;
      });

      // Fetch sample QR code from qrserver
      const sampleQrData = encodeURIComponent("Name:Sample User\nPRN:12345678\nEmail:sample@example.com\nTicketType:DAY1");
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${sampleQrData}`;
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        qrImg.onload = resolve;
        qrImg.onerror = reject;
        qrImg.src = qrUrl;
      });

      // Draw on canvas
      const canvas = document.createElement("canvas");
      canvas.width = ticketImg.naturalWidth;
      canvas.height = ticketImg.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(ticketImg, 0, 0);
      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

      setPreviewUrl(canvas.toDataURL("image/png"));
    } catch (err) {
      console.error("Preview generation failed:", err);
    }
    setGeneratingPreview(false);
  };

  const handleTicketFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setTicketFile(file);
    const url = URL.createObjectURL(file);
    setTicketPreviewUrl(url);
  };

  // When image loads, get its natural + display size
  const handleImgLoad = () => {
    if (!imgRef.current) return;
    setImgNaturalSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
    setImgDisplaySize({ w: imgRef.current.offsetWidth, h: imgRef.current.offsetHeight });
  };

  // Scale factor: display px → actual px
  const scaleX = imgNaturalSize.w / imgDisplaySize.w;
  const scaleY = imgNaturalSize.h / imgDisplaySize.h;

  // QR box in display px
  const dispQrX = qrX / scaleX;
  const dispQrY = qrY / scaleY;
  const dispQrSize = qrSize / scaleX;

  // Drag handlers
  const onMouseDownDrag = (e) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, qrX, qrY };
  };

  const onMouseMoveDrag = useCallback((e) => {
    if (!dragging) return;
    const dx = (e.clientX - dragStart.current.mouseX) * scaleX;
    const dy = (e.clientY - dragStart.current.mouseY) * scaleY;
    setQrX(Math.max(0, Math.round(dragStart.current.qrX + dx)));
    setQrY(Math.max(0, Math.round(dragStart.current.qrY + dy)));
  }, [dragging, scaleX, scaleY]);

  const onMouseUpDrag = useCallback(() => {
    setDragging(false);
    setResizing(false);
  }, []);

  // Resize handlers (bottom-right corner)
  const onMouseDownResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);
    resizeStart.current = { mouseX: e.clientX, mouseY: e.clientY, size: qrSize };
  };

  const onMouseMoveResize = useCallback((e) => {
    if (!resizing) return;
    const dx = (e.clientX - resizeStart.current.mouseX) * scaleX;
    setQrSize(Math.max(50, Math.round(resizeStart.current.size + dx)));
  }, [resizing, scaleX]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", onMouseMoveDrag);
      window.addEventListener("mouseup", onMouseUpDrag);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMoveDrag);
      window.removeEventListener("mouseup", onMouseUpDrag);
    };
  }, [dragging, onMouseMoveDrag, onMouseUpDrag]);

  useEffect(() => {
    if (resizing) {
      window.addEventListener("mousemove", onMouseMoveResize);
      window.addEventListener("mouseup", onMouseUpDrag);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMoveResize);
      window.removeEventListener("mouseup", onMouseUpDrag);
    };
  }, [resizing, onMouseMoveResize, onMouseUpDrag]);

  const canProceed = () => {
    if (currentStep === 2 && !ticketFile) return false;
    return true;
  };

  const handleSend = async () => {
    setSending(true);
    setSendResult(null);
    setProgress(null);
    setFailedList([]);
    try {
      const formData = new FormData();
      formData.append("ticketType", selectedTicketType);
      formData.append("event", selectedEvent);
      formData.append("qrX", qrX);
      formData.append("qrY", qrY);
      formData.append("qrSize", qrSize);
      formData.append("emailSubject", emailSubject);
      formData.append("emailBody", emailBody);
      formData.append("ticketFile", ticketFile);

      const res = await fetch("/api/send-tickets-stream", { method: "POST", body: formData });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (data.type === "total") {
              setProgress({ sent: 0, failed: 0, total: data.total });
            } else if (data.type === "progress") {
              setProgress({ sent: data.sent, failed: data.failed, total: data.total });
            } else if (data.type === "done") {
              setProgress({ sent: data.sent, failed: data.failed, total: data.total });
              setFailedList(data.failedList || []);
              setSendResult({
                type: data.failed === 0 ? "success" : "warning",
                message: `Done! Sent: ${data.sent}, Failed: ${data.failed} out of ${data.total}`,
              });
              setSending(false);
            }
          }
        }
      }
    } catch (err) {
      setSendResult({ type: "error", message: "Failed to send tickets." });
      setSending(false);
    }
  };

  const totalSteps = steps.length;

  if (authLoading) return null;

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
                item.href === "/send-tickets" && "bg-accent"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-border">
          <button
            onClick={handleLogout}
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
          <span className="font-semibold text-sm">Send Event Tickets</span>
        </header>

        <main className="flex-1 p-6 overflow-auto">

          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8 overflow-x-auto pb-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                    className={cn(
                      "h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors",
                      currentStep === step.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : step.id < currentStep
                        ? "bg-primary/20 text-primary border-primary cursor-pointer"
                        : "bg-background text-muted-foreground border-border"
                    )}
                  >
                    {step.id < currentStep ? <Check className="h-4 w-4" /> : step.id}
                  </button>
                  <span className={cn(
                    "text-xs font-medium whitespace-nowrap",
                    currentStep === step.id ? "text-primary" : "text-muted-foreground"
                  )}>
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={cn(
                    "h-0.5 w-12 sm:w-20 mx-2 mb-5 transition-colors",
                    step.id < currentStep ? "bg-primary" : "bg-border"
                  )} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <Card className={cn("mx-auto", currentStep === 3 || currentStep === 5 ? "max-w-4xl" : "max-w-2xl")}>

            {/* Step 1 - Recipients */}
            {currentStep === 1 && (
              <>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Select Recipients</CardTitle>
                  <p className="text-sm text-muted-foreground">Choose which participants will receive the event ticket.</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Ticket Type</label>
                    <div className="flex gap-2 flex-wrap">
                      {TICKET_TYPES.map((t) => (
                        <button key={t} onClick={() => setSelectedTicketType(t)}
                          className={cn("px-4 py-2 rounded-md text-sm font-medium border transition-colors",
                            selectedTicketType === t ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-input hover:bg-accent"
                          )}>{t}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-sm font-medium">Event</label>
                    <div className="flex gap-2 flex-wrap">
                      {EVENTS.map((e) => (
                        <button key={e} onClick={() => setSelectedEvent(e)}
                          className={cn("px-4 py-2 rounded-md text-sm font-medium border transition-colors",
                            selectedEvent === e ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-input hover:bg-accent"
                          )}>{e}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-accent/50 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 shrink-0" />
                    Tickets will be sent to all registered participants matching the selected filters.
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 2 - Upload Ticket Design */}
            {currentStep === 2 && (
              <>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Upload Ticket Design</CardTitle>
                  <p className="text-sm text-muted-foreground">Upload your ticket template image. The QR code will be placed on it in the next step.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
                      ticketFile ? "border-primary bg-accent/30" : "border-border hover:border-primary hover:bg-accent/50"
                    )}
                  >
                    {ticketFile ? (
                      <>
                        <div className="h-12 w-12 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {ticketFile.name.split(".").pop().toUpperCase()}
                        </div>
                        <p className="text-sm font-medium">{ticketFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(ticketFile.size / 1024).toFixed(1)} KB · Click to change</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-muted-foreground" />
                        <div className="text-center">
                          <p className="text-sm font-medium">Click to upload ticket design</p>
                          <p className="text-xs text-muted-foreground mt-1">Supported: PNG, JPG, WEBP</p>
                        </div>
                      </>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden"
                    onChange={handleTicketFileChange} />
                  {ticketFile && (
                    <button onClick={() => { setTicketFile(null); setTicketPreviewUrl(null); fileInputRef.current.value = ""; }}
                      className="text-xs text-destructive hover:underline">Remove file</button>
                  )}
                </CardContent>
              </>
            )}

            {/* Step 3 - QR Position */}
            {currentStep === 3 && (
              <>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Set QR Code Position</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Drag the <span className="text-green-600 font-medium">green box</span> to position the QR code on your ticket. Drag the <span className="text-green-600 font-medium">bottom-right corner</span> to resize it.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Ticket preview with draggable QR box */}
                  <div className="relative w-full overflow-hidden rounded-lg border border-border select-none">
                    {ticketPreviewUrl ? (
                      <>
                        <img
                          ref={imgRef}
                          src={ticketPreviewUrl}
                          alt="Ticket"
                          className="w-full h-auto block"
                          onLoad={handleImgLoad}
                          draggable={false}
                        />
                        {/* Green QR overlay box */}
                        <div
                          onMouseDown={onMouseDownDrag}
                          style={{
                            position: "absolute",
                            left: `${dispQrX}px`,
                            top: `${dispQrY}px`,
                            width: `${dispQrSize}px`,
                            height: `${dispQrSize}px`,
                            border: "2px solid #16a34a",
                            backgroundColor: "rgba(22,163,74,0.15)",
                            cursor: dragging ? "grabbing" : "grab",
                            boxSizing: "border-box",
                          }}
                        >
                          {/* Move icon center */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Move className="h-5 w-5 text-green-600 opacity-80" />
                          </div>
                          {/* QR label */}
                          <div className="absolute top-1 left-1 text-green-700 text-xs font-bold pointer-events-none leading-none">
                            QR
                          </div>
                          {/* Resize handle - bottom right */}
                          <div
                            onMouseDown={onMouseDownResize}
                            style={{
                              position: "absolute",
                              right: -5,
                              bottom: -5,
                              width: 14,
                              height: 14,
                              backgroundColor: "#16a34a",
                              borderRadius: 2,
                              cursor: "se-resize",
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                        No ticket image uploaded.
                      </div>
                    )}
                  </div>

                  {/* Coordinates display */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border px-4 py-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">QR_X</p>
                      <p className="text-lg font-bold text-green-600">{qrX}</p>
                    </div>
                    <div className="rounded-lg border border-border px-4 py-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">QR_Y</p>
                      <p className="text-lg font-bold text-green-600">{qrY}</p>
                    </div>
                    <div className="rounded-lg border border-border px-4 py-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">QR_SIZE</p>
                      <p className="text-lg font-bold text-green-600">{qrSize}</p>
                    </div>
                  </div>

                  {/* Python code snippet */}
                  <div className="rounded-lg bg-muted/50 border border-border px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs text-muted-foreground font-medium">Python values (auto-updated):</p>
                      <Tooltip text="These coordinates are used in the Python script to place the QR code on the ticket image." />
                    </div>
                    <pre className="text-xs font-mono text-foreground leading-relaxed">
{`QR_SIZE = ${qrSize}
QR_X    = ${qrX}
QR_Y    = ${qrY}`}
                    </pre>
                  </div>

                  <Button variant="outline" size="sm" onClick={() => { setQrX(DEFAULT_QR_X); setQrY(DEFAULT_QR_Y); setQrSize(DEFAULT_QR_SIZE); }}>
                    Reset to Default
                  </Button>
                </CardContent>
              </>
            )}

            {/* Step 4 - Email Content */}
            {currentStep === 4 && (
              <>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Email Content</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Customize the email. Use{" "}
                    <code className="bg-accent px-1 rounded text-xs">{"{name}"}</code>,{" "}
                    <code className="bg-accent px-1 rounded text-xs">{"{event}"}</code>,{" "}
                    <code className="bg-accent px-1 rounded text-xs">{"{ticketType}"}</code>{" "}
                    as placeholders.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Subject</label>
                    <input type="text" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium">Body</label>
                    <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={10}
                      className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring resize-y" />
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 5 - Review & Send */}
            {currentStep === 5 && (
              <>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Review & Send</CardTitle>
                  <p className="text-sm text-muted-foreground">Review your settings before sending tickets to participants.</p>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* QR Preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Ticket Preview</p>
                      <Button variant="outline" size="sm" onClick={generatePreview} disabled={generatingPreview || !ticketPreviewUrl}>
                        {generatingPreview ? "Generating..." : "Generate Preview"}
                      </Button>
                    </div>
                    {previewUrl ? (
                      <div className="rounded-lg overflow-hidden border border-border">
                        <img src={previewUrl} alt="Ticket Preview" className="w-full h-auto block" />
                        <p className="text-xs text-center text-muted-foreground py-2 bg-muted/30">
                          Preview uses a sample QR code. Actual tickets will have each participant's unique QR.
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border flex items-center justify-center h-24 text-xs text-muted-foreground">
                        Click "Generate Preview" to see how the ticket will look with the QR code.
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-border divide-y divide-border text-sm">
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-muted-foreground flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Recipients</span>
                      <span className="font-medium">
                        {selectedTicketType === "ALL" ? "All Ticket Types" : selectedTicketType} · {selectedEvent === "ALL" ? "All Events" : selectedEvent}
                      </span>
                    </div>
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-muted-foreground flex items-center gap-2"><Ticket className="h-3.5 w-3.5" /> Ticket File</span>
                      <span className={cn("font-medium", !ticketFile && "text-destructive")}>
                        {ticketFile ? ticketFile.name : "Not uploaded"}
                      </span>
                    </div>
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-muted-foreground flex items-center gap-2"><QrCode className="h-3.5 w-3.5" /> QR Position</span>
                      <span className="font-medium font-mono text-xs">X:{qrX} Y:{qrY} Size:{qrSize}</span>
                    </div>
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-muted-foreground flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> Subject</span>
                      <span className="font-medium truncate max-w-[220px]">{emailSubject}</span>
                    </div>
                  </div>

                  {sendResult && (
                    <div className={cn(
                      "px-4 py-3 rounded-lg border text-sm font-medium",
                      sendResult.type === "success"
                        ? "border-green-600 text-green-600 bg-green-50"
                        : sendResult.type === "warning"
                        ? "border-yellow-500 text-yellow-700 bg-yellow-50"
                        : "border-destructive text-destructive bg-destructive/10"
                    )}>
                      {sendResult.message}
                    </div>
                  )}

                  {/* Progress Bar */}
                  {progress && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Sending tickets...</span>
                        <span>{progress.sent + progress.failed} / {progress.total}</span>
                      </div>
                      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300 rounded-full"
                          style={{ width: `${progress.total > 0 ? ((progress.sent + progress.failed) / progress.total) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="text-green-600">✓ Sent: {progress.sent}</span>
                        {progress.failed > 0 && <span className="text-destructive">✗ Failed: {progress.failed}</span>}
                      </div>
                    </div>
                  )}

                  {/* Failed List */}
                  {failedList.length > 0 && (
                    <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 space-y-2">
                      <p className="text-xs font-medium text-destructive">Failed Emails ({failedList.length}):</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {failedList.map((f, i) => (
                          <div key={i} className="text-xs flex gap-2">
                            <span className="text-destructive font-medium shrink-0">{f.email}</span>
                            <span className="text-muted-foreground truncate">— {f.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button className="w-full" onClick={handleSend} disabled={sending || !ticketFile}>
                    <Send className="h-4 w-4 mr-2" />
                    {sending ? `Sending... (${progress?.sent ?? 0}/${progress?.total ?? "?"})` : "Send Tickets to Participants"}
                  </Button>
                </CardContent>
              </>
            )}

            {/* Navigation */}
            <div className="flex justify-between px-6 pb-6 pt-2">
              <Button variant="outline" onClick={() => setCurrentStep((s) => s - 1)} disabled={currentStep === 1}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              {currentStep < totalSteps && (
                <Button onClick={() => setCurrentStep((s) => s + 1)} disabled={!canProceed()}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>

          </Card>
        </main>
      </div>
    </div>
  );
}
