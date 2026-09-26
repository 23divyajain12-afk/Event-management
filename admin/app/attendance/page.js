"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, QrCode, BarChart2, LogOut, Menu, X, FileJson, RefreshCw, Download, Award, Ticket, BookOpen, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import Tooltip from "@/components/Tooltip";
import { useAuth } from "@/lib/hooks/useAuth";
import dynamic from "next/dynamic";

const DownloadPDFButton = dynamic(() => import("@/components/DownloadPDFButton"), { ssr: false });

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

export default function AttendancePage() {
  const router = useRouter();
  const { logout, loading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ticketType, setTicketType] = useState("ALL");
  const [event, setEvent] = useState("ALL");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/get-attendance?ticketType=${ticketType}&event=${event}`);
      const result = await res.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching attendance:", err);
    }
    setLoading(false);
  }, [ticketType, event]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleLogout = () => { logout(); };

  if (authLoading) return null;

  const formatDate = (ts) => {
    if (!ts) return "-";
    const d = new Date(ts);
    return d.toLocaleString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  };

  const handleDownload = () => {
    if (!data || data.records.length === 0) return;

    const headers = ["#", "Name", "Email", "PRN", "Ticket Type", "Event", "Timestamp"];
    const rows = data.records.map((r, i) => [
      i + 1,
      r.name,
      r.email,
      r.prn,
      r.ticketType,
      r.registeredEvent,
      formatDate(r.timestamp),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const fileName = `attendance_${ticketType}_${event.replace(" ", "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

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
                item.href === "/attendance" && "bg-accent"
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
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-semibold text-sm">Total Attendance</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchAttendance} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
            <Tooltip text="Fetches the latest attendance data from the database." />
          </div>
        </header>

        <main className="flex-1 p-6 space-y-6 overflow-auto">

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total", value: data ? data.counts.DAY1 + data.counts.DAY2 + data.counts.COMBO : "-", color: "text-foreground" },
              { label: "DAY1", value: data ? data.counts.DAY1 : "-", color: "text-blue-500" },
              { label: "DAY2", value: data ? data.counts.DAY2 : "-", color: "text-purple-500" },
              { label: "COMBO", value: data ? data.counts.COMBO : "-", color: "text-green-500" },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="pb-1 pt-4 px-4">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{stat.label}</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <p className={cn("text-3xl font-bold", stat.color)}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">attendees</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium whitespace-nowrap">Ticket Type:</label>
                    <div className="flex gap-1">
                      {TICKET_TYPES.map((t) => (
                        <button key={t} onClick={() => setTicketType(t)}
                          className={cn("px-3 py-1 rounded-md text-xs font-medium border transition-colors",
                            ticketType === t ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-input hover:bg-accent"
                          )}>{t}</button>
                      ))}
                    </div>
                    <Tooltip text="Filter records by ticket type. DAY1, DAY2, or COMBO." />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium whitespace-nowrap">Event:</label>
                    <div className="flex gap-1">
                      {EVENTS.map((e) => (
                        <button key={e} onClick={() => setEvent(e)}
                          className={cn("px-3 py-1 rounded-md text-xs font-medium border transition-colors",
                            event === e ? "bg-primary text-primary-foreground border-primary" : "bg-transparent border-input hover:bg-accent"
                          )}>{e}</button>
                      ))}
                    </div>
                    <Tooltip text="Filter records by event name." />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownload} disabled={!data || data.records.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Excel
                  </Button>
                  <Tooltip text="Downloads the currently filtered attendance records as a CSV file that opens in Excel." />
                  <DownloadPDFButton
                    data={data}
                    ticketType={ticketType}
                    event={event}
                    formatDate={formatDate}
                    disabled={!data || data.records.length === 0}
                  />
                  <Tooltip text="Downloads a styled PDF attendance summary report with event details, counts, and full attendee list." />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                Records
                {data && (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    ({data.total} {data.total === 1 ? "entry" : "entries"})
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                  Loading...
                </div>
              ) : !data || data.records.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                  No attendance records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">#</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Name</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Email</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">PRN</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Ticket</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Event</th>
                        <th className="text-left py-3 px-3 font-medium text-muted-foreground">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.records.map((record, index) => (
                        <tr key={index} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
                          <td className="py-3 px-3 text-muted-foreground">{index + 1}</td>
                          <td className="py-3 px-3 font-medium capitalize">{record.name}</td>
                          <td className="py-3 px-3 text-muted-foreground">{record.email}</td>
                          <td className="py-3 px-3 text-muted-foreground">{record.prn}</td>
                          <td className="py-3 px-3">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-medium",
                              record.ticketType === "DAY1" && "bg-blue-100 text-blue-700",
                              record.ticketType === "DAY2" && "bg-purple-100 text-purple-700",
                              record.ticketType === "COMBO" && "bg-green-100 text-green-700",
                            )}>
                              {record.ticketType}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">{record.registeredEvent}</td>
                          <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">{formatDate(record.timestamp)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

        </main>
      </div>
    </div>
  );
}
