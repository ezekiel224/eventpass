"use client";

import { BatteryMedium, Check, Expand, FlaskConical, Gift, Minus, Plus, Search, ShieldAlert, Ticket, Wifi, WifiOff, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button, H2, Input, Paragraph, Sheet, SizableText, Switch, Tabs, Theme, View, XStack, YStack } from "tamagui";
import { QrCameraScanner } from "@/components/scanner/qr-camera-scanner";
import { OperationSelect } from "@/components/ui/operation-select";
import type { CheckInResult } from "@/types/domain";
import { queueCheckIn, readQueuedCheckIns, removeQueuedCheckIn, scannerDeviceKey } from "@/lib/offline-checkin";
import { scannerRequestHeaders } from "@/lib/scanner-client";

type EventOption = { id: string; name: string; startsAt: string };
type Prize = { id: string; name: string; value: string | null };
type SearchResult = { id: string; name: string; location: string | null; status: string; fallbackCode: string | null };
type RaffleAttendee = { id: string; name: string; raffleTickets: number; assignedTickets: number; remainingTickets: number; entries: Array<{ prizeId: string; ticketCount: number }> };
type Feedback = { tone: "success" | "warning" | "error"; title: string; detail: string } | null;
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
type BatteryManager = EventTarget & { level: number; charging: boolean };

export function ImmersiveScanner() {
  const [mode, setMode] = useState<"checkin" | "raffle">("checkin");
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventId, setEventId] = useState("");
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [online, setOnline] = useState(true);
  const [connection, setConnection] = useState("");
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [scanCount, setScanCount] = useState(0);
  const [manualOpen, setManualOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [raffleAttendee, setRaffleAttendee] = useState<RaffleAttendee | null>(null);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [selectedPrizeId, setSelectedPrizeId] = useState("");
  const [saving, setSaving] = useState(false);
  const [stationId, setStationId] = useState("");
  const [stationName, setStationName] = useState("Front entrance");
  const [queuedCount, setQueuedCount] = useState(0);

  const usedTickets = useMemo(() => Object.values(allocations).reduce((sum, count) => sum + count, 0), [allocations]);
  const remainingTickets = Math.max(0, (raffleAttendee?.raffleTickets ?? 0) - usedTickets);

  async function loadContext(nextEventId = eventId, search = "") {
    const parameters = new URLSearchParams();
    if (nextEventId) parameters.set("eventId", nextEventId);
    if (search.trim().length >= 2) parameters.set("q", search.trim());
    const response = await fetch(`/api/scan?${parameters}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Scanner setup could not be loaded.");
    const data = await response.json();
    setEvents(data.events ?? []);
    const resolvedEventId = data.selectedEventId ?? "";
    setEventId(resolvedEventId);
    setPrizes(data.prizes ?? []);
    setSelectedPrizeId((current) => (data.prizes ?? []).some((prize: Prize) => prize.id === current) ? current : data.prizes?.[0]?.id ?? "");
    setSearchResults(data.attendees ?? []);
    if (resolvedEventId) localStorage.setItem("eventpass-scanner-event", resolvedEventId);
  }

  async function ensureStation(nextEventId = eventId, nextName = stationName) {
    if (!nextEventId || !navigator.onLine) return "";
    const deviceKey = scannerDeviceKey();
    const savedName = localStorage.getItem("eventpass-scanner-station-name") || nextName;
    const response = await fetch("/api/check-in/stations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: nextEventId, deviceKey, name: savedName }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error ?? "Station could not be registered.");
    setStationId(data.station.id);
    setStationName(data.station.name);
    return data.station.id as string;
  }

  async function flushQueued(nextStationId = stationId) {
    if (!navigator.onLine) return;
    const queued = readQueuedCheckIns();
    for (const item of queued) {
      const response = await fetch("/api/check-in", { method: "POST", headers: scannerRequestHeaders(), body: JSON.stringify({ ...item, stationId: item.stationId || nextStationId }) });
      if (response.ok || (response.status >= 400 && response.status < 500)) removeQueuedCheckIn(item.clientScanId);
      if (!response.ok && response.status < 500) {
        const data = await response.json().catch(() => ({}));
        setFeedback({ tone: "error", title: "Queued pass rejected", detail: data.error ?? "Review the reconciliation log." });
      }
    }
    setQueuedCount(readQueuedCheckIns().length);
  }

  async function searchAttendees(search: string) {
    const parameters = new URLSearchParams({ eventId, q: search.trim() });
    const response = await fetch(`/api/scan?${parameters}`, { cache: "no-store" });
    if (!response.ok) throw new Error("Guest search is unavailable.");
    const data = await response.json();
    setSearchResults(data.attendees ?? []);
  }

  useEffect(() => {
    const preferred = new URLSearchParams(window.location.search).get("eventId") || localStorage.getItem("eventpass-scanner-event") || "";
    const setupTimer = window.setTimeout(() => {
      void loadContext(preferred).catch((error) => setFeedback({ tone: "error", title: "Scanner unavailable", detail: error instanceof Error ? error.message : "Reload and try again." }));
    }, 0);
    const updateOnline = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) void ensureStation(localStorage.getItem("eventpass-scanner-event") || "").then((id) => flushQueued(id)).catch(() => undefined);
    };
    const connectionInfo = (navigator as Navigator & { connection?: { effectiveType?: string; addEventListener?: (name: string, listener: () => void) => void; removeEventListener?: (name: string, listener: () => void) => void } }).connection;
    const updateConnection = () => setConnection(connectionInfo?.effectiveType?.toUpperCase() ?? "");
    updateOnline();
    const localStateTimer = window.setTimeout(() => {
      setQueuedCount(readQueuedCheckIns().length);
      setStationName(localStorage.getItem("eventpass-scanner-station-name") || "Front entrance");
    }, 0);
    updateConnection();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    connectionInfo?.addEventListener?.("change", updateConnection);
    const installHandler = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", installHandler);
    const fullscreenHandler = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", fullscreenHandler);
    const batteryNavigator = navigator as Navigator & { getBattery?: () => Promise<BatteryManager> };
    let manager: BatteryManager | null = null;
    const updateBattery = () => manager && setBattery({ level: Math.round(manager.level * 100), charging: manager.charging });
    void batteryNavigator.getBattery?.().then((nextManager) => {
      manager = nextManager;
      updateBattery();
      manager.addEventListener("levelchange", updateBattery);
      manager.addEventListener("chargingchange", updateBattery);
    });
    return () => {
      window.clearTimeout(setupTimer);
      window.clearTimeout(localStateTimer);
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
      connectionInfo?.removeEventListener?.("change", updateConnection);
      window.removeEventListener("beforeinstallprompt", installHandler);
      document.removeEventListener("fullscreenchange", fullscreenHandler);
      manager?.removeEventListener("levelchange", updateBattery);
      manager?.removeEventListener("chargingchange", updateBattery);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!eventId || !online) return;
    const timer = window.setTimeout(() => void ensureStation(eventId).then((id) => flushQueued(id)).catch((error) => setFeedback({ tone: "error", title: "Station unavailable", detail: error instanceof Error ? error.message : "Try again." })), 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, online]);

  useEffect(() => {
    if (!manualOpen || query.trim().length < 2) return;
    const timer = window.setTimeout(() => {
      setSearching(true);
      void searchAttendees(query).catch(() => setSearchResults([])).finally(() => setSearching(false));
    }, 220);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, manualOpen, eventId]);

  function enterFullscreen() {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(() => undefined);
      const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
      void orientation.lock?.("portrait").catch(() => undefined);
    }
  }

  async function checkIn(payload: { qrPayload?: string; fallbackCode?: string; attendeeId?: string }) {
    if (!online) {
      if (!payload.qrPayload) {
        setFeedback({ tone: "error", title: "Live lookup required", detail: "Offline mode accepts signed QR payloads only. Manual lookup and fallback codes require a connection." });
        return false;
      }
      try {
        const decoded = JSON.parse(payload.qrPayload) as { eventId?: string };
        if (decoded.eventId !== eventId) throw new Error("This pass appears to belong to another event.");
        const count = queueCheckIn({ clientScanId: crypto.randomUUID(), eventId, qrPayload: payload.qrPayload, recordedAt: new Date().toISOString(), stationId: stationId || undefined });
        setQueuedCount(count);
        setFeedback({ tone: "warning", title: "Queued for verification", detail: "Not yet validated or admitted. Keep the guest with venue staff until this station reconnects." });
        return true;
      } catch (error) {
        setFeedback({ tone: "error", title: "Pass not queued", detail: error instanceof Error ? error.message : "The QR payload was not readable." });
        return false;
      }
    }
    const response = await fetch("/api/check-in", { method: "POST", headers: scannerRequestHeaders(), body: JSON.stringify({ ...payload, eventId, testMode, stationId: stationId || undefined }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setFeedback({ tone: "error", title: "Pass not accepted", detail: typeof data.error === "string" ? data.error : "Try the fallback code or attendee search." });
      navigator.vibrate?.([180, 90, 180]);
      return false;
    }
    const result = data as CheckInResult;
    const warning = result.duplicate || result.under21Alert;
    setFeedback({
      tone: warning ? "warning" : "success",
      title: testMode ? "Test passed" : result.duplicate ? "Already checked in" : result.under21Alert ? "Age check required" : "Checked in",
      detail: `${result.attendee.name} · ${testMode ? "No check-in was recorded." : result.under21Message ?? result.attendee.ticketTier}`
    });
    setScanCount((count) => count + 1);
    if (warning) navigator.vibrate?.([260, 120, 420]);
    return true;
  }

  async function raffleLookup(payload: { qrPayload?: string; fallbackCode?: string; attendeeId?: string }) {
    if (!online) {
      setFeedback({ tone: "error", title: "You’re offline", detail: "Raffle balances require a live connection." });
      return false;
    }
    const response = await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, eventId }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setFeedback({ tone: "error", title: "Pass not accepted", detail: data.error ?? "This guest could not be loaded." });
      return false;
    }
    const attendee = data.attendee as RaffleAttendee;
    setRaffleAttendee(attendee);
    setAllocations(Object.fromEntries(prizes.map((prize) => [prize.id, attendee.entries.find((entry) => entry.prizeId === prize.id)?.ticketCount ?? 0])));
    setFeedback({ tone: "success", title: "Guest loaded", detail: `${attendee.name} · ${attendee.raffleTickets} raffle tickets available.` });
    setScanCount((count) => count + 1);
    return true;
  }

  function handleScan(scannedValue: string) {
    const value = scannedValue.trim();
    if (!value) return false;
    const payload = value.startsWith("{") ? { qrPayload: value } : { fallbackCode: value };
    return mode === "checkin" ? checkIn(payload) : raffleLookup(payload);
  }

  function chooseManual(attendeeId?: string) {
    const raw = query.trim();
    setManualOpen(false);
    setQuery("");
    setSearchResults([]);
    return mode === "checkin" ? checkIn(attendeeId ? { attendeeId } : { fallbackCode: raw }) : raffleLookup(attendeeId ? { attendeeId } : { fallbackCode: raw });
  }

  async function saveRaffle() {
    if (!raffleAttendee || testMode) return;
    setSaving(true);
    const response = await fetch("/api/scan", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId, attendeeId: raffleAttendee.id, entries: prizes.map((prize) => ({ prizeId: prize.id, ticketCount: allocations[prize.id] ?? 0 })) }) });
    const data = await response.json().catch(() => ({}));
    setSaving(false);
    if (!response.ok) {
      setFeedback({ tone: "error", title: "Tickets not saved", detail: data.error ?? "Review the selections and retry." });
      return;
    }
    setFeedback({ tone: "success", title: "Raffle tickets saved", detail: `${data.attendee.name} has ${data.attendee.remainingTickets} unassigned tickets remaining.` });
    setRaffleAttendee(data.attendee);
  }

  const selectedPrize = prizes.find((prize) => prize.id === selectedPrizeId);
  const selectedCount = selectedPrizeId ? allocations[selectedPrizeId] ?? 0 : 0;

  return (
    <Theme name="dark">
    <View position="fixed" inset={0} z={300} overflow="hidden" backgroundColor="color-1" color="color-11">
      <QrCameraScanner immersive onScan={handleScan} disabled={!eventId || (mode === "raffle" && !online)} onStartRequest={enterFullscreen} onActiveChange={() => undefined} />
      <View pointerEvents="none" position="absolute" insetInline={0} t={0} h={144} backgroundColor="shadow-6" />
      <View pointerEvents="none" position="absolute" insetInline={0} b={0} h={260} backgroundColor="shadow-6" />

      <XStack pointerEvents="none" position="absolute" insetInline={0} t={0} z={50} items="center" gap="2" px="3" pb="2" paddingTop="calc(env(safe-area-inset-top) + 10px)">
        <View pointerEvents="auto" flex={1} minW={0}><OperationSelect value={eventId} onValueChange={(value) => { setFeedback(null); setRaffleAttendee(null); void loadContext(value); }} label="Selected event" options={events.length ? events.map((event) => ({ value: event.id, label: event.name })) : [{ value: "", label: "No published events" }]} inverse compact /></View>
        <Button pointerEvents="auto" size="md" circular backgroundColor="color-3" borderWidth={1} borderColor="color-6" onPress={() => setStatusOpen(true)} aria-label="Device and connection status" icon={online ? Wifi : WifiOff} />
        {!fullscreen ? <Button pointerEvents="auto" size="md" circular backgroundColor="color-3" borderWidth={1} borderColor="color-6" onPress={enterFullscreen} aria-label="Enter full screen" icon={Expand} /> : null}
      </XStack>

      <Tabs value={mode} onValueChange={(value) => { setMode(value as "checkin" | "raffle"); if (value === "checkin") setRaffleAttendee(null); setFeedback(null); }} orientation="horizontal" position="absolute" t="calc(env(safe-area-inset-top) + 66px)" l="50%" x="-50%" z={40} backgroundColor="color-2" borderWidth={1} borderColor="color-6" rounded="4" p="1">
        <Tabs.List aria-label="Scanner mode" backgroundColor="transparent">
          <Tabs.Tab value="checkin" rounded="3" minH={40} px="4" backgroundColor={mode === "checkin" ? "accent-background" : "transparent"}><SizableText fontSize={14} fontWeight="700" color={mode === "checkin" ? "accent-color" : "color-10"}>Check-in</SizableText></Tabs.Tab>
          <Tabs.Tab value="raffle" rounded="3" minH={40} px="4" backgroundColor={mode === "raffle" ? "accent-background" : "transparent"}><XStack items="center" gap="2"><Gift size={15} /><SizableText fontSize={14} fontWeight="700" color={mode === "raffle" ? "accent-color" : "color-10"}>Raffle</SizableText></XStack></Tabs.Tab>
        </Tabs.List>
      </Tabs>

      <YStack pointerEvents="none" position="absolute" insetInline="3" b="calc(env(safe-area-inset-bottom) + 12px)" z={50} gap="2">
        {feedback ? <Theme name={feedback.tone === "error" ? "dark_red" : feedback.tone === "warning" ? "dark_yellow" : "dark_green"}><XStack pointerEvents="auto" items="flex-start" gap="3" rounded="5" borderWidth={1} borderColor="color-7" backgroundColor="color-3" p="4" shadowColor="shadow-color" shadowOffset={{ width: 0, height: 14 }} shadowRadius={32} aria-live="assertive">
          <View w={44} h={44} rounded="3" items="center" justify="center" backgroundColor="color-5">{feedback.tone === "success" ? <Check size={24} /> : <ShieldAlert size={24} />}</View>
          <YStack flex={1} minW={0} gap="1"><SizableText fontSize={16} fontWeight="800" color="color-11">{feedback.title}</SizableText><Paragraph fontSize={14} color="color-10" numberOfLines={2}>{feedback.detail}</Paragraph></YStack>
          <Button size="sm" circular variant="quiet" onPress={() => setFeedback(null)} aria-label="Dismiss result" icon={X} />
        </XStack></Theme> : null}

        {mode === "raffle" && raffleAttendee ? <YStack pointerEvents="auto" rounded="5" borderWidth={1} borderColor="color-6" backgroundColor="color-2" p="3" gap="3" shadowColor="shadow-color" shadowOffset={{ width: 0, height: 14 }} shadowRadius={32}>
          <XStack items="center" justify="space-between" gap="3"><YStack flex={1} minW={0}><SizableText fontSize={16} fontWeight="800" numberOfLines={1}>{raffleAttendee.name}</SizableText><SizableText fontSize={12} color="color-9">{usedTickets} selected · {remainingTickets} remaining</SizableText></YStack><Button size="sm" variant="quiet" onPress={() => { setRaffleAttendee(null); setFeedback(null); }}>Next guest</Button></XStack>
          <XStack items="center" gap="2"><View flex={1} minW={0}><OperationSelect value={selectedPrizeId} onValueChange={setSelectedPrizeId} label="Raffle prize" options={prizes.map((prize) => ({ value: prize.id, label: prize.name }))} inverse compact /></View><Button size="md" circular backgroundColor="color-4" borderWidth={1} borderColor="color-6" onPress={() => selectedPrizeId && setAllocations((current) => ({ ...current, [selectedPrizeId]: Math.max(0, selectedCount - 1) }))} aria-label={`Remove ticket from ${selectedPrize?.name ?? "prize"}`} icon={Minus} /><Button size="md" circular theme="active" onPress={() => selectedPrizeId && remainingTickets > 0 && setAllocations((current) => ({ ...current, [selectedPrizeId]: selectedCount + 1 }))} aria-label={`Add ticket to ${selectedPrize?.name ?? "prize"}`} icon={Plus} /></XStack>
          <XStack items="center" justify="space-between" gap="3"><SizableText flex={1} size="xs" color="color-9" numberOfLines={1}>{selectedPrize?.value ?? "Selected prize"} · {selectedCount} ticket{selectedCount === 1 ? "" : "s"}</SizableText><Button size="md" theme="active" disabled={saving || testMode || usedTickets > raffleAttendee.raffleTickets} onPress={() => void saveRaffle()} icon={Ticket}>{testMode ? "Test mode" : saving ? "Saving…" : "Save tickets"}</Button></XStack>
        </YStack> : null}

        <XStack pointerEvents="auto" items="center" justify="space-between" gap="2" rounded="5" borderWidth={1} borderColor="color-6" backgroundColor="color-2" p="2">
          <Button size="md" variant="quiet" disabled={!online} onPress={() => { setQuery(""); setSearchResults([]); setManualOpen(true); }} icon={Search}>Find guest</Button>
          <SizableText fontSize={12} fontWeight="700" color="color-9" text="center" fontVariant={["tabular-nums"]}>{scanCount} scanned{queuedCount ? ` · ${queuedCount} queued` : ""}</SizableText>
          <XStack items="center" gap="2" px="2"><FlaskConical size={16} /><SizableText fontSize={12} fontWeight="700">Test</SizableText><Switch size="sm" checked={testMode} onCheckedChange={setTestMode} aria-label="Test mode"><Switch.Thumb transition="quick" /></Switch></XStack>
        </XStack>
      </YStack>

      <Sheet modal open={manualOpen} onOpenChange={(open: boolean) => { setManualOpen(open); if (!open) { setQuery(""); setSearchResults([]); } }} dismissOnSnapToBottom snapPoints={[72]} transition="medium" zIndex={400}>
        <Sheet.Overlay backgroundColor="shadow-6" opacity="enter:0 exit:0" />
        <Sheet.Handle backgroundColor="color-7" />
        <Sheet.Container backgroundColor="color-2" p="4">
          <Sheet.Background backgroundColor="color-2" />
          <YStack flex={1} w="100%" maxW={560} self="center" gap="4">
            <XStack items="flex-start" justify="space-between" gap="3"><YStack gap="1"><H2 size="6">Find a guest</H2><Paragraph fontSize={14} color="color-9">Search by name, location, email, or fallback code.</Paragraph></YStack><Button size="sm" circular variant="quiet" onPress={() => setManualOpen(false)} aria-label="Close guest search" icon={X} /></XStack>
            <XStack gap="2"><Input autoFocus flex={1} size="lg" value={query} onChange={(event) => { setQuery(event.target.value); if (event.target.value.trim().length < 2) setSearchResults([]); }} placeholder="Search or enter EP-code" onKeyPress={(event) => { if (("key" in event ? event.key : event.nativeEvent.key) === "Enter") void chooseManual(); }} /><Button size="lg" theme="active" onPress={() => void chooseManual()}>Use code</Button></XStack>
            <Sheet.ScrollView flex={1} showsVerticalScrollIndicator={false}><YStack gap="2" pb="6">{searching ? <Paragraph p="3" color="color-9">Searching…</Paragraph> : null}{searchResults.slice(0, 8).map((attendee) => <Button key={attendee.id} minH={64} borderWidth={1} borderColor="color-5" backgroundColor="color-3" rounded="4" p="3" onPress={() => void chooseManual(attendee.id)}><XStack w="100%" items="center" justify="space-between" gap="3"><YStack flex={1} minW={0} items="flex-start"><SizableText fontSize={16} fontWeight="700" numberOfLines={1}>{attendee.name}</SizableText><SizableText fontSize={12} color="color-9" numberOfLines={1}>{attendee.location ?? "No location"} · {attendee.fallbackCode ?? "No pass"}</SizableText></YStack><Plus size={18} /></XStack></Button>)}{query.length >= 2 && !searching && searchResults.length === 0 ? <Paragraph p="3" color="color-9">No matching guests. Check the spelling or use the fallback code.</Paragraph> : null}</YStack></Sheet.ScrollView>
          </YStack>
        </Sheet.Container>
      </Sheet>

      <Sheet modal open={statusOpen} onOpenChange={setStatusOpen} dismissOnSnapToBottom snapPoints={[76]} transition="medium" zIndex={400}>
        <Sheet.Overlay backgroundColor="shadow-6" opacity="enter:0 exit:0" />
        <Sheet.Handle backgroundColor="color-7" />
        <Sheet.Container backgroundColor="color-2" p="4">
          <Sheet.Background backgroundColor="color-2" />
          <Sheet.ScrollView><YStack w="100%" maxW={560} self="center" gap="4" pb="8">
            <XStack items="center" justify="space-between"><H2 size="6">Device readiness</H2><Button size="sm" circular variant="quiet" onPress={() => setStatusOpen(false)} aria-label="Close device readiness" icon={X} /></XStack>
            <YStack borderWidth={1} borderColor="color-5" rounded="5" overflow="hidden">
              <XStack minH={56} items="center" justify="space-between" px="4" borderBottomWidth={1} borderBottomColor="color-5"><XStack items="center" gap="2">{online ? <Wifi size={17} /> : <WifiOff size={17} />}<SizableText>Connection</SizableText></XStack><SizableText fontWeight="700">{online ? connection || "Online" : "Offline"}</SizableText></XStack>
              {battery ? <XStack minH={56} items="center" justify="space-between" px="4" borderBottomWidth={1} borderBottomColor="color-5"><XStack items="center" gap="2"><BatteryMedium size={17} /><SizableText>Battery</SizableText></XStack><SizableText fontWeight="700" fontVariant={["tabular-nums"]}>{battery.level}%{battery.charging ? " · charging" : ""}</SizableText></XStack> : null}
              <YStack p="4" gap="2" borderBottomWidth={1} borderBottomColor="color-5"><SizableText fontSize={12} fontWeight="700" color="color-9">Station name</SizableText><Input aria-label="Station name" value={stationName} onChange={(event) => setStationName(event.target.value)} onBlur={() => { localStorage.setItem("eventpass-scanner-station-name", stationName); if (online) void ensureStation(eventId, stationName); }} /></YStack>
              <XStack minH={56} items="center" justify="space-between" px="4"><SizableText>Pending sync</SizableText><SizableText fontWeight="700" fontVariant={["tabular-nums"]}>{queuedCount}</SizableText></XStack>
            </YStack>
            <Paragraph fontSize={14} color="color-9">Offline QR scans are queued, not accepted. Duplicate and signature checks run after reconnection; keep the guest with venue staff until verification completes.</Paragraph>
            {installPrompt ? <Button size="lg" theme="active" onPress={() => { void installPrompt.prompt(); setInstallPrompt(null); }}>Install scanner app</Button> : null}
          </YStack></Sheet.ScrollView>
        </Sheet.Container>
      </Sheet>
    </View>
    </Theme>
  );
}
