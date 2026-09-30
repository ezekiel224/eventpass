import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return <main className="grid min-h-dvh place-items-center bg-[#100d0b] p-6 text-center text-white"><div><WifiOff className="mx-auto h-10 w-10 text-primary" /><h1 className="mt-5 text-2xl font-bold">Scanner is offline</h1><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/65">Reconnect to venue Wi-Fi or cellular data, then reopen the scanner. Live connectivity is required to prevent duplicate admissions and keep raffle balances accurate.</p></div></main>;
}
