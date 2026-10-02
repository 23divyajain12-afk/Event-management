import { redirect } from "next/navigation";

export default function CertificatesPage() {
  redirect("/events?operation=certificate");
}
