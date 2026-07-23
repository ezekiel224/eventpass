import { redirect } from "next/navigation";

export default function EmailLogsPage() {
  redirect("/dashboard?tab=email-logs");
}
