"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, QrCode, BarChart2, LogOut, Menu, X, FileJson, Award, Upload, Send, Ticket, Mail, ChevronRight, ChevronLeft, Check, Type, BookOpen } from "lucide-react";
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
const FONT_SIZES = [16, 20, 24, 28, 32, 36, 40, 48];
const FONT_COLORS = [
  { label: "Black", value: "#000000" },
  { label: "White", value: "#FFFFFF" },
  { label: "Gold", value: "#B8860B" },
  { label: "Navy", value: "#1a237e" },
  { label: "Dark Gray", value: "#333333" },
];
const FONT_STYLES = [
  { label: "Normal", fontWeight: "normal", fontStyle: "normal" },
  { label: "Bold", fontWeight: "bold", fontStyle: "normal" },
  { label: "Italic", fontWeight: "normal", fontStyle: "italic" },
  { label: "Bold Italic", fontWeight: "bold", fontStyle: "italic" },
];
const FONT_FAMILIES = [
  "Arial",
  "Times New Roman",
  "Georgia",
  "Verdana",
  "Trebuchet MS",
  "Courier New",
  "Palatino",
  "Garamond",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Oswald",
  "Raleway",
  "Playfair Display",
  "Merriweather",
  "Ubuntu",
  "Nunito",
  "Poppins",
  "Source Sans Pro",
  "PT Serif",
  "Libre Baskerville",
  "Crimson Text",
  "EB Garamond",
  "Cormorant Garamond",
  "Dancing Script",
  "Pacifico",
  "Great Vibes",
  "Satisfy",
  "Lobster",
];

const steps = [
  { id: 1, label: "Recipients" },
  { id: 2, label: "Certificate" },
  { id: 3, label: "Name Position" },
  { id: 4, label: "Email Content" },
  { id: 5, label: "Review & Send" },
];

// Default name position
const DEFAULT_NAME_X = 200;
const DEFAULT_NAME_Y = 300;
const DEFAULT_FONT_SIZE = 32;

export default function CertificatesPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTicketType, setSelectedTicketType] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState("ALL");
  const [certificateFile, setCertificateFile] = useState(null);
  const [certPreviewUrl, setCertPreviewUrl] = useState(null);
  const [emailSubject, setEmailSubject] = useState("Your Certificate of Participation - Abhivriddhi");
  const [emailBody, setEmailBody] = useState(
    "Dear {name},\n\nCongratulations on attending {event}!\n\nPlease find attached your Certificate of Participation.\n\nThank you for being a part of Abhivriddhi.\n\nWarm regards,\nAbhivriddhi Team"
  );
  const fileInputRef = useRef(null);

  // Name position state
  const [nameX, setNameX] = useState(DEFAULT_NAME_X);
  const [nameY, setNameY] = useState(DEFAULT_NAME_Y);
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [fontColor, setFontColor] = useState("#000000");
  const [fontStyle, setFontStyle] = useState(FONT_STYLES[1]); // Default: Bold
  const [fontFamily, setFontFamily] = useState("Montserrat");

  // Image display refs
  const imgRef = useRef(null);
  const [imgNaturalSize, setImgNaturalSize] = useState({ w: 800, h: 600 });
  const [imgDisplaySize, setImgDisplaySize] = useState({ w: 800, h: 600 });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [progress, setProgress] = useState(null);
  const [failedList, setFailedList] = useState([]);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, nameX: 0, nameY: 0 });
  const resizeStart = useRef({ mouseX: 0, mouseY: 0, size: 0 });

  const { logout, loading: authLoading } = useAuth();

  // Load Google Font dynamically when fontFamily changes
  useEffect(() => {
    const systemFonts = ["Arial", "Times New Roman", "Georgia", "Verdana", "Trebuchet MS", "Courier New", "Palatino", "Garamond"];
    if (systemFonts.includes(fontFamily)) return;
    const id = `gfont-${fontFamily.replace(/\s+/g, "-")}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, "+")}:wght@400;700&display=swap`;
    document.head.appendChild(link);
  }, [fontFamily]);

  const handleLogout = () => { logout(); };

  const handleCertFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCertificateFile(file);
    const url = URL.createObjectURL(file);
    setCertPreviewUrl(url);
  };

  const handleImgLoad = () => {
    if (!imgRef.current) return;
    setImgNaturalSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
    setImgDisplaySize({ w: imgRef.current.offsetWidth, h: imgRef.current.offsetHeight });
  };

  // Scale factors
  const scaleX = imgNaturalSize.w / imgDisplaySize.w;
  const scaleY = imgNaturalSize.h / imgDisplaySize.h;

  // Name box in display px
  const dispNameX = nameX / scaleX;
  const dispNameY = nameY / scaleY;
  const dispFontSize = fontSize / scaleX;
  // Box width is approximate based on sample name length
  const boxWidth = Math.max(200, fontSize * 10) / scaleX;
  const boxHeight = (fontSize + 16) / scaleY;

  // Drag handlers
  const onMouseDownDrag = (e) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { mouseX: e.clientX, mouseY: e.clientY, nameX, nameY };
  };

  const onMouseMoveDrag = useCallback((e) => {
    if (!dragging) return;
    const dx = (e.clientX - dragStart.current.mouseX) * scaleX;
    const dy = (e.clientY - dragStart.current.mouseY) * scaleY;
    setNameX(Math.max(0, Math.round(dragStart.current.nameX + dx)));
    setNameY(Math.max(0, Math.round(dragStart.current.nameY + dy)));
  }, [dragging, scaleX, scaleY]);

  const onMouseUp = useCallback(() => {
    setDragging(false);
    setResizing(false);
  }, []);

  // Resize (font size) via right edge drag
  const onMouseDownResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);
    resizeStart.current = { mouseX: e.clientX, mouseY: e.clientY, size: fontSize };
  };

  const onMouseMoveResize = useCallback((e) => {
    if (!resizing) return;
    const dx = (e.clientX - resizeStart.current.mouseX) * scaleX;
    setFontSize(Math.max(12, Math.round(resizeStart.current.size + dx / 3)));
  }, [resizing, scaleX]);

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", onMouseMoveDrag);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMoveDrag);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging, onMouseMoveDrag, onMouseUp]);

  useEffect(() => {
    if (resizing) {
      window.addEventListener("mousemove", onMouseMoveResize);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMoveResize);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [resizing, onMouseMoveResize, onMouseUp]);

  const canProceed = () => {
    if (currentStep === 2 && !certificateFile) return false;
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
      formData.append("nameX", nameX);
      formData.append("nameY", nameY);
      formData.append("fontSize", fontSize);
      formData.append("fontColor", fontColor);
      formData.append("fontWeight", fontStyle.fontWeight);
      formData.append("fontStyle", fontStyle.fontStyle);
      formData.append("fontFamily", fontFamily);
      formData.append("emailSubject", emailSubject);
      formData.append("emailBody", emailBody);
      formData.append("certFile", certificateFile);

      const res = await fetch("/api/send-certificates-stream", { method: "POST", body: formData });
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
              setProgress({ sent: 0, failed: 0, skipped: 0, total: data.total });
            } else if (data.type === "progress") {
              setProgress({ sent: data.sent, failed: data.failed, skipped: data.skipped, total: data.total });
            } else if (data.type === "done") {
              setProgress({ sent: data.sent, failed: data.failed, skipped: data.skipped, total: data.total });
              setFailedList(data.failedList || []);
              setSendResult({
                type: data.failed === 0 ? "success" : "warning",
                message: `Done! Sent: ${data.sent}, Skipped: ${data.skipped}, Failed: ${data.failed} out of ${data.total}`,
              });
              setSending(false);
            }
          }
        }
      }
    } catch (err) {
      setSendResult({ type: "error", message: "Failed to send certificates." });
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
                item.href === "/certificates" && "bg-accent"
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
          <span className="font-semibold text-sm">Send Certificates</span>
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
                    "h-0.5 w-10 sm:w-16 mx-2 mb-5 transition-colors",
                    step.id < currentStep ? "bg-primary" : "bg-border"
                  )} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <Card className={cn("mx-auto", currentStep === 3 ? "max-w-4xl" : "max-w-2xl")}>

            {/* Step 1 - Recipients */}
            {currentStep === 1 && (
              <>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Select Recipients</CardTitle>
                  <p className="text-sm text-muted-foreground">Choose which attendees will receive the certificate.</p>
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
                    Certificates will be sent to all attendees matching the selected filters.
                  </div>
                </CardContent>
              </>
            )}

            {/* Step 2 - Upload Certificate */}
            {currentStep === 2 && (
              <>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Upload Certificate</CardTitle>
                  <p className="text-sm text-muted-foreground">Upload the certificate template. The attendee's name will be placed on it in the next step.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={cn(
                      "border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
                      certificateFile ? "border-primary bg-accent/30" : "border-border hover:border-primary hover:bg-accent/50"
                    )}
                  >
                    {certificateFile ? (
                      <>
                        <div className="h-12 w-12 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {certificateFile.name.split(".").pop().toUpperCase()}
                        </div>
                        <p className="text-sm font-medium">{certificateFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(certificateFile.size / 1024).toFixed(1)} KB · Click to change</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-muted-foreground" />
                        <div className="text-center">
                          <p className="text-sm font-medium">Click to upload certificate template</p>
                          <p className="text-xs text-muted-foreground mt-1">Supported: PNG, JPG</p>
                        </div>
                      </>
                    )}
                  </div>
                  <input ref={fileInputRef} type="file" accept=".png,.jpg,.jpeg" className="hidden"
                    onChange={handleCertFileChange} />
                  {certificateFile && (
                    <button onClick={() => { setCertificateFile(null); setCertPreviewUrl(null); fileInputRef.current.value = ""; }}
                      className="text-xs text-destructive hover:underline">Remove file</button>
                  )}
                </CardContent>
              </>
            )}

            {/* Step 3 - Name Position */}
            {currentStep === 3 && (
              <>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Set Name Position</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Drag the <span className="text-blue-600 font-medium">blue box</span> to position the attendee's name on the certificate. Drag the <span className="text-blue-600 font-medium">right edge</span> to resize the font.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Font style controls */}
                  <div className="flex flex-wrap gap-4 items-start">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium whitespace-nowrap">Font Size:</label>
                      <div className="flex gap-1 flex-wrap">
                        {FONT_SIZES.map((s) => (
                          <button key={s} onClick={() => setFontSize(s)}
                            className={cn("px-2 py-1 rounded text-xs font-medium border transition-colors",
                              fontSize === s ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-input hover:bg-accent"
                            )}>{s}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium whitespace-nowrap">Color:</label>
                      <div className="flex gap-1">
                        {FONT_COLORS.map((c) => (
                          <button key={c.value} onClick={() => setFontColor(c.value)}
                            title={c.label}
                            className={cn("h-7 w-7 rounded-full border-2 transition-all",
                              fontColor === c.value ? "border-primary scale-110" : "border-border"
                            )}
                            style={{ backgroundColor: c.value }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-medium whitespace-nowrap">Style:</label>
                      <div className="flex gap-1 flex-wrap">
                        {FONT_STYLES.map((s) => (
                          <button key={s.label} onClick={() => setFontStyle(s)}
                            className={cn("px-3 py-1 rounded text-xs border transition-colors",
                              fontStyle.label === s.label ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-input hover:bg-accent"
                            )}
                            style={{ fontWeight: s.fontWeight, fontStyle: s.fontStyle }}
                          >{s.label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full">
                      <label className="text-sm font-medium whitespace-nowrap">Font Family:</label>
                      <select
                        value={fontFamily}
                        onChange={(e) => setFontFamily(e.target.value)}
                        style={{ fontFamily: fontFamily }}
                        className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        {FONT_FAMILIES.map((f) => (
                          <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
                        ))}
                      </select>
                      <Tooltip text="Choose the font for the attendee's name on the certificate. Preview updates live on the image below." />
                    </div>
                  </div>

                  {/* Certificate preview with draggable name box */}
                  <div className="relative w-full overflow-hidden rounded-lg border border-border select-none">
                    {certPreviewUrl ? (
                      <>
                        <img
                          ref={imgRef}
                          src={certPreviewUrl}
                          alt="Certificate"
                          className="w-full h-auto block"
                          onLoad={handleImgLoad}
                          draggable={false}
                        />
                        {/* Blue name overlay box */}
                        <div
                          onMouseDown={onMouseDownDrag}
                          style={{
                            position: "absolute",
                            left: `${dispNameX}px`,
                            top: `${dispNameY}px`,
                            width: `${boxWidth}px`,
                            height: `${boxHeight}px`,
                            border: "2px solid #2563eb",
                            backgroundColor: "rgba(37,99,235,0.10)",
                            cursor: dragging ? "grabbing" : "grab",
                            boxSizing: "border-box",
                            display: "flex",
                            alignItems: "center",
                            paddingLeft: 6,
                          }}
                        >
                          {/* Sample name preview */}
                          <span
                            style={{
                              fontSize: `${dispFontSize}px`,
                              color: fontColor,
                              fontWeight: fontStyle.fontWeight,
                              fontStyle: fontStyle.fontStyle,
                              fontFamily: fontFamily,
                              pointerEvents: "none",
                              whiteSpace: "nowrap",
                              textShadow: fontColor === "#FFFFFF" ? "0 0 3px #000" : "none",
                            }}
                          >
                            Attendee Name
                          </span>
                          {/* Resize handle - right edge */}
                          <div
                            onMouseDown={onMouseDownResize}
                            style={{
                              position: "absolute",
                              right: -5,
                              top: "50%",
                              transform: "translateY(-50%)",
                              width: 10,
                              height: 24,
                              backgroundColor: "#2563eb",
                              borderRadius: 3,
                              cursor: "ew-resize",
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                        No certificate image uploaded.
                      </div>
                    )}
                  </div>

                  {/* Coordinates display */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border border-border px-4 py-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">NAME_X</p>
                      <p className="text-lg font-bold text-blue-600">{nameX}</p>
                    </div>
                    <div className="rounded-lg border border-border px-4 py-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">NAME_Y</p>
                      <p className="text-lg font-bold text-blue-600">{nameY}</p>
                    </div>
                    <div className="rounded-lg border border-border px-4 py-3 text-center">
                      <p className="text-xs text-muted-foreground mb-1">FONT_SIZE</p>
                      <p className="text-lg font-bold text-blue-600">{fontSize}</p>
                    </div>
                  </div>

                  {/* Python code snippet */}
                  <div className="rounded-lg bg-muted/50 border border-border px-4 py-3">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-xs text-muted-foreground font-medium">Python values (auto-updated):</p>
                      <Tooltip text="These values are used in the Python script to place the attendee's name on the certificate image." />
                    </div>
                    <pre className="text-xs font-mono text-foreground leading-relaxed">
{`NAME_X       = ${nameX}
NAME_Y       = ${nameY}
FONT_SIZE    = ${fontSize}
FONT_COLOR   = "${fontColor}"
FONT_WEIGHT  = "${fontStyle.fontWeight}"
FONT_STYLE   = "${fontStyle.fontStyle}"
FONT_FAMILY  = "${fontFamily}"`}
                    </pre>
                  </div>

                  <Button variant="outline" size="sm"
                    onClick={() => { setNameX(DEFAULT_NAME_X); setNameY(DEFAULT_NAME_Y); setFontSize(DEFAULT_FONT_SIZE); setFontColor("#000000"); setFontStyle(FONT_STYLES[1]); setFontFamily("Montserrat"); }}>
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
                    <code className="bg-accent px-1 rounded text-xs">{"{event}"}</code>{" "}
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
                  <p className="text-sm text-muted-foreground">Review your settings before sending certificates to attendees.</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg border border-border divide-y divide-border text-sm">
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-muted-foreground flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Recipients</span>
                      <span className="font-medium">
                        {selectedTicketType === "ALL" ? "All Ticket Types" : selectedTicketType} · {selectedEvent === "ALL" ? "All Events" : selectedEvent}
                      </span>
                    </div>
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-muted-foreground flex items-center gap-2"><Award className="h-3.5 w-3.5" /> Certificate File</span>
                      <span className={cn("font-medium", !certificateFile && "text-destructive")}>
                        {certificateFile ? certificateFile.name : "Not uploaded"}
                      </span>
                    </div>
                    <div className="flex justify-between px-4 py-3">
                      <span className="text-muted-foreground flex items-center gap-2"><Type className="h-3.5 w-3.5" /> Name Position</span>
                      <span className="font-medium font-mono text-xs">X:{nameX} Y:{nameY} Size:{fontSize}</span>
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
                        <span>Sending certificates...</span>
                        <span>{progress.sent + progress.failed + progress.skipped} / {progress.total}</span>
                      </div>
                      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300 rounded-full"
                          style={{ width: `${progress.total > 0 ? ((progress.sent + progress.failed + progress.skipped) / progress.total) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex gap-4 text-xs">
                        <span className="text-green-600">✓ Sent: {progress.sent}</span>
                        {progress.skipped > 0 && <span className="text-muted-foreground">↻ Skipped: {progress.skipped}</span>}
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

                  <div className="flex items-center gap-2">
                    <Button className="w-full" onClick={handleSend} disabled={sending || !certificateFile}>
                      <Send className="h-4 w-4 mr-2" />
                      {sending ? `Sending... (${progress?.sent ?? 0}/${progress?.total ?? "?"})` : "Send Certificates to Attendees"}
                    </Button>
                    <Tooltip text="Sends a personalized certificate to each attendee. Each person receives it only once per event — duplicates are automatically skipped." />
                  </div>
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
