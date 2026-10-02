import { redirect } from "next/navigation";

export default function SendTicketsPage() {
  redirect("/events?operation=ticket");
}
