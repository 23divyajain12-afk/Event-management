"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, QrCode, BarChart2, LogOut, Menu, X, FileJson, Upload, File, Award, Ticket, BookOpen, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
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

export default function ConvertDataPage() {
  const router = useRouter();
  const { logout, loading: authLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setUploadedFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setUploadedFile(file);
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getFileIcon = (fileName) => {
    const ext = fileName.split(".").pop().toLowerCase();
    return ext === "csv" ? "CSV" : ext === "xlsx" || ext === "xls" ? "XLS" : "DOC";
  };

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
                item.href === "/convert-data" && "bg-accent"
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

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="flex items-center gap-4 px-6 py-4 border-b border-border bg-card">
          <button className="md:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <span className="font-semibold text-sm">Convert Data to JSON</span>
        </header>

        <main className="flex-1 p-6 space-y-6">
          {/* Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upload File</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload a CSV or Excel file to convert it to JSON format.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Drag & Drop Zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
                  dragOver ? "border-primary bg-accent" : "border-border hover:border-primary hover:bg-accent/50"
                )}
              >
                <Upload className={cn("h-8 w-8", dragOver ? "text-primary" : "text-muted-foreground")} />
                <div className="text-center">
                  <p className="text-sm font-medium">
                    {dragOver ? "Drop your file here" : "Drag & drop your file here"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    or click to browse
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Supported formats: .csv, .xlsx, .xls
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Uploaded File Preview */}
              {uploadedFile && (
                <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-accent/40">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                      {getFileIcon(uploadedFile.name)}
                    </div>
                    <div>
                      <p className="text-sm font-medium truncate max-w-[200px]">{uploadedFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button onClick={handleRemoveFile} className="text-muted-foreground hover:text-destructive transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <Button className="w-full" disabled={!uploadedFile}>
                Convert to JSON
              </Button>
            </CardContent>
          </Card>

          {/* Output Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">JSON Output</CardTitle>
              <p className="text-sm text-muted-foreground">
                Converted JSON will appear here.
              </p>
            </CardHeader>
            <CardContent>
              <div className="w-full min-h-[200px] rounded-md border border-input bg-muted/30 px-3 py-3 text-sm font-mono text-muted-foreground flex items-center justify-center">
                No output yet. Upload a file and click Convert to JSON.
              </div>
              <Button variant="outline" className="w-full mt-4" disabled>
                Copy JSON
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
