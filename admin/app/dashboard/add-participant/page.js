"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, QrCode, BarChart2, LogOut, Menu, X, FileJson, Award, Ticket, Mail } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Scan Attendance", icon: QrCode, href: "/scanner" },
  { label: "Convert to JSON", icon: FileJson, href: "/dashboard/convert-data" },
  { label: "Add Participant", icon: Users, href: "/dashboard/add-participant" },
  { label: "Send Tickets", icon: Ticket, href: "/dashboard/send-tickets" },
  { label: "Send Email", icon: Mail, href: "/send-email" },
  { label: "Total Attendance", icon: BarChart2, href: "/dashboard/attendance" },
  { label: "Send Certificates", icon: Award, href: "/dashboard/certificates" },
];

const collections = [
  { value: "users", label: "Users" },
  { value: "attendanceday1s", label: "Attendance DAY1" },
  { value: "attendanceday2s", label: "Attendance DAY2" },
  { value: "attendancecombos", label: "Attendance COMBO" },
];

export default function AddParticipantPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [alert, setAlert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("isLoggedIn") !== "true") {
      router.push("/login");
    }
  }, [router]);

  const handleInsert = async () => {
    setAlert(null);
    setLoading(true);
    let users;
    try {
      users = JSON.parse(jsonInput);
      if (!Array.isArray(users)) throw new Error("JSON must be an array");
    } catch (err) {
      setAlert({ type: "error", message: "Invalid JSON format. Please check your input." });
      setLoading(false);
      return;
    }
    try {
      const response = await fetch("/api/bulk-add-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ users }),
      });
      const result = await response.json();
      setAlert({ type: response.ok ? "success" : "error", message: result.message });
      if (response.ok) setJsonInput("");
    } catch (error) {
      setAlert({ type: "error", message: "Error inserting participants." });
    }
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleteLoading(true);
    setAlert(null);
    try {
      const response = await fetch("/api/delete-collection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collection: selectedCollection }),
      });
      const result = await response.json();
      setAlert({ type: response.ok ? "success" : "error", message: result.message });
    } catch (error) {
      setAlert({ type: "error", message: "Error deleting collection." });
    }
    setDeleteLoading(false);
    setConfirmDelete(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("isLoggedIn");
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex bg-background">
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
                item.href === "/dashboard/add-participant" && "bg-accent"
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

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card">
          <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-sm">Add Participants</span>
        </header>

        <main className="flex-1 p-6 space-y-6">
          {alert && (
            <Alert
              variant={alert.type === "success" ? "default" : "destructive"}
              className={cn("flex justify-between items-center", {
                "text-green-500 border-green-600": alert.type === "success",
              })}
            >
              <div>
                <AlertTitle>{alert.type === "success" ? "Success" : "Error"}</AlertTitle>
                <AlertDescription>{alert.message}</AlertDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setAlert(null)} className="ml-4">
                <X className="h-4 w-4" />
              </Button>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bulk Insert Participants</CardTitle>
              <p className="text-sm text-muted-foreground">
                Paste your JSON array below and click Insert to add all participants to the database.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={`Paste JSON array here...\n[\n  {\n    "id": "Name:VIKRANT THAKUR\\nPRN:12412111\\nEmail:vikrant@vit.edu\\nTicketType:COMBO",\n    "name": "VIKRANT THAKUR",\n    "prn": "12412111",\n    "email": "vikrant@vit.edu",\n    "ticketType": "COMBO",\n    "registeredEvent": ["Event A"]\n  }\n]`}
                rows={16}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring font-mono resize-y"
              />
              <Button onClick={handleInsert} disabled={loading || !jsonInput.trim()} className="w-full">
                {loading ? "Inserting..." : "Insert Participants"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-base text-destructive">Delete Collection</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select a collection and delete all its documents. This action cannot be undone.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <select
                value={selectedCollection}
                onChange={(e) => { setSelectedCollection(e.target.value); setConfirmDelete(false); }}
                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Select collection to delete</option>
                {collections.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
              {confirmDelete && (
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Are you sure? This will permanently delete ALL documents from <strong>{selectedCollection}</strong>. Click again to confirm.
                </p>
              )}
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteLoading || !selectedCollection}
                className="w-full"
              >
                {deleteLoading ? "Deleting..." : confirmDelete ? "Confirm Delete" : "Delete All Documents"}
              </Button>
              {confirmDelete && (
                <Button variant="outline" className="w-full" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
