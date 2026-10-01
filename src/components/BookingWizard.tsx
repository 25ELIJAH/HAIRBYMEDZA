"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ServiceCard, { ServiceCardData } from "./ServiceCard";
import MonthCalendar from "./MonthCalendar";
import MpesaPayPanel from "./MpesaPayPanel";
import { SlotGridSkeleton } from "./Skeleton";
import {
  addDaysStr,
  dayOfWeek,
  durationLabel,
  formatKes,
  minutesToLabel,
  prettyDate,
  todayStr,
} from "@/lib/time";

type Service = ServiceCardData & { durationMin: number; category: string };

const CATEGORY_ORDER = ["Kids", "Teen", "Package"];
const CATEGORY_LABEL: Record<string, string> = {
  Kids: "Kids",
  Teen: "Teens",
  Package: "Packages",
};

// Price for the chosen visit type.
function priceFor(service: Service, type: "INCALL" | "OUTCALL") {
  return type === "OUTCALL" ? service.outCallPriceKes : service.priceKes;
}

interface AvailabilityResponse {
  open: boolean;
  reason?: string;
  grid: { startMin: number; endMin: number; label: string; status: string }[];
  bookableStarts: number[];
  dayFull: boolean;
  durationMin: number;
}

const STEPS = ["Style", "Where", "Date & time", "Your details", "Confirm", "Done"];

// Time slots are grouped by part of the day.
const SLOT_GROUPS: { label: string; from: number; to: number }[] = [
  { label: "Morning", from: 0, to: 12 * 60 },
  { label: "Afternoon", from: 12 * 60, to: 17 * 60 },
  { label: "Evening", from: 17 * 60, to: 24 * 60 },
];

/** "Thu 8 Oct" style label for a YYYY-MM-DD date. */
function shortDate(d: string) {
  const [y, m, day] = d.split("-").map((n) => parseInt(n, 10));
  return new Date(y, m - 1, day).toLocaleDateString("en-KE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function BookingWizard({
  services,
  initialServiceId,
  salonName,
  salonPhone,
  location,
  openDays,
  blockedDates,
  mpesaNumber,
  stkEnabled = false,
}: {
  services: Service[];
  initialServiceId?: string;
  salonName: string;
  salonPhone: string;
  location: string;
  openDays: number[];
  blockedDates: string[];
  mpesaNumber: string;
  stkEnabled?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string | undefined>(initialServiceId);
  const [serviceType, setServiceType] = useState<"INCALL" | "OUTCALL">("INCALL");
  const [date, setDate] = useState<string>(() => {
    // Start on the first upcoming day the salon is actually open.
    let d = todayStr();
    for (let i = 0; i < 60; i++) {
      if (openDays.includes(dayOfWeek(d)) && !blockedDates.includes(d)) return d;
      const [y, m, day] = d.split("-").map((n) => parseInt(n, 10));
      const next = new Date(y, m - 1, day + 1);
      d = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
    }
    return todayStr();
  });
  const [startMin, setStartMin] = useState<number | null>(null);

  const [loc, setLoc] = useState({
    estate: "",
    houseNumber: "",
    mapsPin: "",
    landmark: "",
    travelNotes: "",
  });
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", notes: "" });
  // Optional M-Pesa payment details the client can paste after sending money.
  const [mpesa, setMpesa] = useState({ number: "", message: "", amount: "" });
  // Message shown when a client taps a time Magdalene is already booked for.
  const [slotNotice, setSlotNotice] = useState<string | null>(null);
  // Honeypot: hidden from real users; bots tend to auto-fill it.
  const [company, setCompany] = useState("");
  // Online payment via Paystack (M-Pesa prompt or card) right after booking.
  const [payNow, setPayNow] = useState(true);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  const [avail, setAvail] = useState<AvailabilityResponse | null>(null);
  // When the chosen day has no free time, the next day that does.
  const [nextFree, setNextFree] = useState<string | null>(null);
  const [findingNext, setFindingNext] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = useMemo(
    () => services.find((s) => s.id === serviceId),
    [services, serviceId]
  );

  // If linked with ?service=, jump to step 2.
  useEffect(() => {
    if (initialServiceId && services.some((s) => s.id === initialServiceId)) {
      setStep(1);
    }
  }, [initialServiceId, services]);

  // Fetch availability whenever service + date are known and we're on the date step.
  useEffect(() => {
    if (step !== 2 || !serviceId) return;
    let cancelled = false;
    setLoadingAvail(true);
    setAvail(null);
    setStartMin(null);
    setSlotNotice(null);
    fetch(`/api/availability?serviceId=${serviceId}&date=${date}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setAvail(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load availability.");
      })
      .finally(() => {
        if (!cancelled) setLoadingAvail(false);
      });
    return () => {
      cancelled = true;
    };
  }, [step, serviceId, date]);

  // If the chosen day has nothing free, look ahead (up to 3 weeks) for the
  // next day that does, so the client can jump straight to it.
  useEffect(() => {
    setNextFree(null);
    if (step !== 2 || !serviceId || loadingAvail || !avail) return;
    if (avail.open && !avail.dayFull && avail.bookableStarts.length > 0) return;
    let cancelled = false;
    (async () => {
      setFindingNext(true);
      let d = date;
      for (let i = 0; i < 21 && !cancelled; i++) {
        d = addDaysStr(d, 1);
        if (dayDisabled(d)) continue;
        try {
          const r = await fetch(`/api/availability?serviceId=${serviceId}&date=${d}`);
          const data: AvailabilityResponse = await r.json();
          if (data.open && !data.dayFull && data.bookableStarts?.length) {
            if (!cancelled) setNextFree(d);
            break;
          }
        } catch {
          break;
        }
      }
      if (!cancelled) setFindingNext(false);
    })();
    return () => {
      cancelled = true;
      setFindingNext(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avail, loadingAvail, step, serviceId]);

  const dayDisabled = (d: string) =>
    d < todayStr() || !openDays.includes(dayOfWeek(d)) || blockedDates.includes(d);

  const bookable = new Set(avail?.bookableStarts ?? []);
  // Clients pay the full price (no deposit).
  const amountDue = service ? priceFor(service, serviceType) : 0;
  // Where clients send money manually (the salon's M-Pesa number).
  const payNumber = mpesaNumber || "0701508259";

  // Out-call location is only complete when every required field is filled.
  const outcallReady =
    loc.estate.trim().length > 1 &&
    loc.houseNumber.trim().length > 0 &&
    loc.landmark.trim().length > 1 &&
    loc.travelNotes.trim().length > 2;

  // Sends the booking alert to the owner's inbox via Web3Forms (client side,
  // as required by their free plan). Never throws.
  async function emailOwnerOfBooking() {
    const key = process.env.NEXT_PUBLIC_WEB3FORMS_KEY;
    if (!key || !service || startMin == null) return;
    const typeLabel = serviceType === "OUTCALL" ? "I travel to the client" : "At the studio";
    const lines = [
      "You have a new booking from your website. Please open your admin portal to review and confirm it.",
      "",
      `Service: ${service.name}`,
      `Visit type: ${typeLabel}`,
      `When: ${prettyDate(date)} at ${minutesToLabel(startMin)}`,
      `Service price: ${formatKes(priceFor(service, serviceType))}`,
      "",
      `Client: ${customer.name}`,
      `Phone: ${customer.phone}`,
      customer.email ? `Email: ${customer.email}` : "",
      customer.notes ? `Notes: ${customer.notes}` : "",
      stkEnabled
        ? payNow
          ? "\nThe client is paying online (Paystack). The receipt shows on the booking in your dashboard."
          : "\nThe client chose to pay later. You can send them an M-Pesa prompt from the dashboard."
        : Number(mpesa.amount) > 0
          ? `\nPaid: ${formatKes(Number(mpesa.amount))} (M-Pesa ${mpesa.number})\nM-Pesa message: ${mpesa.message}`
          : "\nNot paid yet. Please call the client to confirm.",
    ];
    if (serviceType === "OUTCALL") {
      lines.push(
        "",
        "Where to reach the client:",
        `  Area: ${loc.estate}`,
        `  House/Apartment: ${loc.houseNumber}`,
        `  Landmark: ${loc.landmark}`,
        `  Directions: ${loc.travelNotes}`,
        loc.mapsPin ? `  Maps pin: ${loc.mapsPin}` : "",
        "",
        "Remember to send the client the transport fare when you confirm."
      );
    }
    try {
      await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: key,
          subject: `New booking: ${customer.name} booked ${service.name}`,
          from_name: "Magdalene Medza Bookings",
          email: process.env.NEXT_PUBLIC_OWNER_EMAIL || undefined,
          message: lines.filter((l) => l !== "").join("\n"),
        }),
      });
    } catch {
      // Ignore: the booking is already saved; email is a best-effort alert.
    }
  }

  async function submit() {
    if (!service || startMin == null) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          date,
          startMin,
          serviceType,
          customer: {
            name: customer.name,
            phone: customer.phone,
            email: customer.email,
          },
          location: serviceType === "OUTCALL" ? loc : undefined,
          notes: customer.notes,
          // With online payments the payment is confirmed by Paystack, never self-reported.
          deposit: stkEnabled
            ? undefined
            : {
                mpesaNumber: mpesa.number,
                mpesaMessage: mpesa.message,
                amountPaid: Number(mpesa.amount) || 0,
              },
          company, // honeypot
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Booking failed. Please try again.");
        // If the slot was taken, refresh availability.
        if (res.status === 409) {
          fetch(`/api/availability?serviceId=${service.id}&date=${date}`)
            .then((r) => r.json())
            .then(setAvail);
          setStartMin(null);
        }
        return;
      }
      // Email the owner so she knows to check the admin portal. Best effort:
      // a failed email never blocks the confirmed booking.
      await emailOwnerOfBooking();
      setAppointmentId(data.appointmentId || null);
      setStep(5);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Known groups first, then any other categories, so every service shows.
  const categories = [
    ...CATEGORY_ORDER.filter((c) => services.some((s) => s.category === c)),
    ...Array.from(new Set(services.map((s) => s.category)))
      .filter((c) => !CATEGORY_ORDER.includes(c))
      .sort(),
  ];

  return (
    <div className="mx-auto max-w-6xl">
      {/* Progress */}
      <Stepper step={step} />

      <div className={`mt-8 grid gap-8 ${step < 4 ? "lg:grid-cols-[minmax(0,1fr)_300px]" : ""}`}>
      <div className="min-w-0">
        {/* ── Step 0: Service ─────────────────────────────── */}
        {step === 0 && (
          <Section title="Choose a style">
            <div className="space-y-10">
              {categories.map(
                (cat) => (
                  <div key={cat}>
                    <h3 className="mb-4 font-display text-lg font-semibold text-charcoal">
                      {CATEGORY_LABEL[cat] || cat}
                    </h3>
                    <div className="grid gap-5 sm:grid-cols-2">
                      {services
                        .filter((s) => s.category === cat)
                        .map((s) => (
                          <ServiceCard
                            key={s.id}
                            service={s}
                            selected={serviceId === s.id}
                            footer={
                              <button
                                className={
                                  serviceId === s.id ? "btn-primary w-full" : "btn-outline w-full"
                                }
                                onClick={() => {
                                  setServiceId(s.id);
                                  setStep(1);
                                }}
                              >
                                {serviceId === s.id ? "Selected" : "Choose"}
                              </button>
                            }
                          />
                        ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </Section>
        )}

        {/* ── Step 1: Where ───────────────────────────────── */}
        {step === 1 && service && (
          <Section
            title="Studio or home?"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TypeCard
                active={serviceType === "INCALL"}
                onClick={() => setServiceType("INCALL")}
                title="Studio"
                desc={location || "At the studio"}
                price={formatKes(service.priceKes)}
              />
              <TypeCard
                active={serviceType === "OUTCALL"}
                onClick={() => setServiceType("OUTCALL")}
                title="Home visit"
                desc="Your home or office"
                price={formatKes(service.outCallPriceKes)}
              />
            </div>

            {serviceType === "OUTCALL" && (
              <div className="mt-6 animate-fade-up rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
                <h4 className="font-display text-lg font-semibold text-charcoal">Your address</h4>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Area *">
                    <input
                      className="input"
                      value={loc.estate}
                      onChange={(e) => setLoc({ ...loc, estate: e.target.value })}
                      placeholder="e.g. Kilimani, Nairobi"
                    />
                  </Field>
                  <Field label="House / apartment *">
                    <input
                      className="input"
                      value={loc.houseNumber}
                      onChange={(e) => setLoc({ ...loc, houseNumber: e.target.value })}
                      placeholder="e.g. Sunrise Apartments, Block C, House 4"
                    />
                  </Field>
                  <Field label="Nearest landmark *">
                    <input
                      className="input"
                      value={loc.landmark}
                      onChange={(e) => setLoc({ ...loc, landmark: e.target.value })}
                      placeholder="e.g. opposite Yaya Centre"
                    />
                  </Field>
                  <Field label="Maps link" hint="Optional">
                    <input
                      className="input"
                      value={loc.mapsPin}
                      onChange={(e) => setLoc({ ...loc, mapsPin: e.target.value })}
                      placeholder="Paste a maps link if you have one"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Directions *">
                      <textarea
                        className="input min-h-[80px]"
                        value={loc.travelNotes}
                        onChange={(e) => setLoc({ ...loc, travelNotes: e.target.value })}
                        placeholder="Gate, floor, who to ask for"
                      />
                    </Field>
                  </div>
                </div>
              </div>
            )}

            <NavRow
              onBack={() => setStep(0)}
              onNext={() => setStep(2)}
              nextDisabled={serviceType === "OUTCALL" && !outcallReady}
            />
          </Section>
        )}

        {/* ── Step 2: Date & Time ─────────────────────────── */}
        {step === 2 && service && (
          <Section
            title="Pick a time"
            subtitle={`${service.name} · ${durationLabel(service.durationMin)}`}
          >
            <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
              <div>
                <MonthCalendar value={date} onChange={setDate} isDisabled={dayDisabled} />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-display text-base font-semibold text-charcoal">{prettyDate(date)}</p>
                  {!loadingAvail && avail?.open && bookable.size > 0 && (
                    <span className="rounded-full bg-royal-50 px-2.5 py-0.5 text-xs font-medium text-royal-700">
                      {bookable.size} {bookable.size === 1 ? "time" : "times"} free
                    </span>
                  )}
                </div>

                <div className="mt-4 min-h-[140px]">
                  {loadingAvail && <SlotGridSkeleton />}

                  {!loadingAvail && avail && (!avail.open || avail.dayFull || bookable.size === 0) && (
                    <div className="grid place-items-center rounded-xl bg-cream-soft px-4 py-8 text-center">
                      <p className="font-medium text-charcoal">
                        {!avail.open
                          ? avail.reason || "Closed on this day"
                          : date === todayStr()
                            ? "No times left today"
                            : "Fully booked on this day"}
                      </p>
                      {findingNext ? (
                        <p className="mt-1 text-sm text-charcoal-muted">Finding the next free day…</p>
                      ) : nextFree ? (
                        <button
                          onClick={() => setDate(nextFree)}
                          className="btn-primary mt-4 !px-4 !py-2 text-sm"
                        >
                          Next free day: {shortDate(nextFree)}
                        </button>
                      ) : (
                        <p className="mt-1 text-sm text-charcoal-muted">Pick another day.</p>
                      )}
                    </div>
                  )}

                  {!loadingAvail && avail && avail.open && !avail.dayFull && bookable.size > 0 && (
                    <div className="space-y-5">
                      {SLOT_GROUPS.map((g) => {
                        const slots = avail.grid.filter((s) => s.startMin >= g.from && s.startMin < g.to);
                        if (slots.length === 0) return null;
                        return (
                          <div key={g.label}>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-muted">
                              {g.label}
                            </p>
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                              {slots.map((slot) => {
                                const canBook = bookable.has(slot.startMin);
                                const taken = !canBook && (slot.status === "OCCUPIED" || slot.status === "PENDING");
                                const selected = startMin === slot.startMin;
                                return (
                                  <button
                                    key={slot.startMin}
                                    disabled={!canBook && !taken}
                                    onClick={() => {
                                      if (canBook) {
                                        setStartMin(slot.startMin);
                                        setSlotNotice(null);
                                      } else if (taken) {
                                        setSlotNotice(`${slot.label} is taken.`);
                                      }
                                    }}
                                    className={`rounded-lg px-2 py-2.5 text-sm font-medium ring-1 transition-all duration-200 ${
                                      selected
                                        ? "scale-[1.04] bg-royal-600 text-white shadow-soft ring-royal-600"
                                        : canBook
                                          ? "bg-white text-charcoal ring-gray-300 hover:-translate-y-0.5 hover:ring-royal-500 hover:text-royal-700"
                                          : taken
                                            ? "cursor-pointer bg-gray-50 text-gray-400 line-through ring-gray-100"
                                            : "cursor-not-allowed bg-gray-50 text-gray-300 ring-gray-100"
                                    }`}
                                  >
                                    {slot.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {slotNotice && (
                        <p className="rounded-lg border border-gray-200 bg-cream-soft px-3 py-2 text-sm text-charcoal">
                          {slotNotice}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {startMin != null && (
                  <div className="mt-5 flex animate-fade-up items-center gap-3 rounded-xl bg-royal-50 px-4 py-3 text-sm text-charcoal">
                    <span>
                      <strong>{shortDate(date)}</strong>, {minutesToLabel(startMin)} to{" "}
                      {minutesToLabel(startMin + service.durationMin)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <NavRow onBack={() => setStep(1)} onNext={() => setStep(3)} nextDisabled={startMin == null} />
          </Section>
        )}

        {/* ── Step 3: Details ─────────────────────────────── */}
        {step === 3 && service && startMin != null && (
          <Section title="Your details">
            <div className="rounded-2xl border border-gray-200 bg-white">
              <div className="p-5 sm:p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name">
                    <input
                      className="input"
                      autoComplete="name"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      placeholder="e.g. Jane Wanjiku"
                    />
                  </Field>
                  <Field label="Phone (WhatsApp)">
                    <input
                      className="input"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      placeholder="07XX XXX XXX"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Email" hint="Optional">
                      <input
                        className="input"
                        type="email"
                        autoComplete="email"
                        value={customer.email}
                        onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                        placeholder="you@email.com"
                      />
                    </Field>
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-200 p-5 sm:p-6">
                <div>
                  <Field label="Notes" hint="Optional">
                    <textarea
                      className="input min-h-[88px]"
                      value={customer.notes}
                      onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                      placeholder="Hair length, colour, allergies"
                    />
                  </Field>
                </div>
                {/* Honeypot: hidden from people, off-screen, not announced. */}
                <input
                  type="text"
                  name="mm_ref_code"
                  tabIndex={-1}
                  autoComplete="off"
                  data-lpignore="true"
                  data-1p-ignore
                  aria-hidden="true"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="absolute left-[-9999px] h-0 w-0 opacity-0"
                />
              </div>
            </div>

            <NavRow
              onBack={() => setStep(2)}
              nextLabel="Continue"
              onNext={() => setStep(4)}
              nextDisabled={
                customer.name.trim().length < 2 ||
                customer.phone.replace(/[^0-9]/g, "").length < 9
              }
            />
          </Section>
        )}

        {/* ── Step 4: Confirm ─────────────────────────────── */}
        {step === 4 && service && startMin != null && (
          <Section title="Confirm">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
              {/* Appointment summary */}
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="flex items-center gap-4 border-b border-gray-200 p-5">
                  <ServiceThumb service={service} />
                  <div className="min-w-0">
                    <p className="font-display text-lg font-bold text-charcoal">{service.name}</p>
                    <p className="text-sm text-charcoal-muted">{durationLabel(service.durationMin)}</p>
                  </div>
                </div>
                <dl className="divide-y divide-gray-100 px-5">
                  <ConfirmRow k="Date" v={prettyDate(date)} onEdit={() => setStep(2)} />
                  <ConfirmRow
                    k="Time"
                    v={`${minutesToLabel(startMin)} to ${minutesToLabel(startMin + service.durationMin)}`}
                    onEdit={() => setStep(2)}
                  />
                  <ConfirmRow
                    k="Where"
                    v={
                      serviceType === "OUTCALL"
                        ? `Home visit · ${[loc.estate, loc.houseNumber].filter(Boolean).join(", ")}`
                        : `Studio${location ? ` · ${location}` : ""}`
                    }
                    onEdit={() => setStep(1)}
                  />
                  <ConfirmRow
                    k="Contact"
                    v={[customer.name, customer.phone, customer.email].filter(Boolean).join(" · ")}
                    onEdit={() => setStep(3)}
                  />
                  {customer.notes && <ConfirmRow k="Notes" v={customer.notes} onEdit={() => setStep(3)} />}
                </dl>
              </div>

              {/* Payment */}
              <div className="h-fit rounded-2xl border border-gray-200 bg-white p-5">
                <h4 className="font-display text-base font-bold text-charcoal">Payment</h4>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-charcoal-muted">Total to pay</dt>
                    <dd className="font-display text-lg font-bold text-charcoal">{formatKes(amountDue)}</dd>
                  </div>
                </dl>
                {serviceType === "OUTCALL" && (
                  <p className="mt-3 text-xs text-charcoal-muted">
                    Transport fare is extra.
                  </p>
                )}

                <div className="mt-5 border-t border-gray-200 pt-5">
                  {stkEnabled ? (
                    <div className="space-y-2 text-sm">
                      <PayOption
                        active={payNow}
                        onClick={() => setPayNow(true)}
                        title={`Pay ${formatKes(amountDue)} now`}
                        text="M-Pesa or card"
                      />
                      <PayOption
                        active={!payNow}
                        onClick={() => setPayNow(false)}
                        title="Pay later"
                        text="Arranged on WhatsApp"
                      />
                      <p className="pt-2 text-xs text-charcoal-muted">Secured by Paystack.</p>
                    </div>
                  ) : (
                    <div className="text-sm">
                      <p className="text-charcoal">
                        Send {formatKes(amountDue)} by M-Pesa to:
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-cream-soft px-4 py-3">
                        <div>
                          <p className="font-display text-xl font-bold tracking-wide text-charcoal">{payNumber}</p>
                          <p className="text-xs text-charcoal-muted">Magdalene Medza</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(payNumber.replace(/\s/g, "")).catch(() => undefined);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 1800);
                          }}
                          className="btn-outline !px-3 !py-2 text-xs"
                        >
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="mt-4 text-xs text-charcoal-muted">
                        Already paid? Add the code (optional).
                      </p>
                      <div className="mt-2 grid gap-3">
                        <input
                          className="input"
                          value={mpesa.message}
                          onChange={(e) => setMpesa({ ...mpesa, message: e.target.value })}
                          placeholder="M-Pesa code"
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <input
                            className="input"
                            value={mpesa.number}
                            onChange={(e) => setMpesa({ ...mpesa, number: e.target.value })}
                            placeholder="Paid from"
                          />
                          <input
                            className="input"
                            type="number"
                            min={0}
                            value={mpesa.amount}
                            onChange={(e) => setMpesa({ ...mpesa, amount: e.target.value })}
                            placeholder="Amount"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {error && (
                  <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>
                )}

                <button onClick={submit} disabled={submitting} className="btn-primary mt-5 w-full !py-3.5 text-base">
                  {submitting
                    ? "Booking…"
                    : stkEnabled && payNow
                      ? `Confirm & pay ${formatKes(amountDue)}`
                      : "Confirm booking"}
                </button>
                <button onClick={() => setStep(3)} className="btn-ghost mt-2 w-full">
                  ← Back
                </button>
              </div>
            </div>
          </Section>
        )}

        {/* ── Step 5: Done ────────────────────────────────── */}
        {step === 5 && service && startMin != null && (
          <div className="mx-auto max-w-lg animate-fade-up">
            <div className="card p-6 sm:p-8">
              <h2 className="font-display text-2xl font-bold text-charcoal">
                Thank you, {customer.name.split(" ")[0]}
              </h2>
              <p className="mt-2 text-charcoal-muted">
                {stkEnabled && payNow && !paid
                  ? "Booking received. Complete the payment below."
                  : "Booking received. You'll get a WhatsApp confirmation."}
              </p>

              {stkEnabled && appointmentId && appointmentId !== "skipped" && (
                <div className="mt-6">
                  <MpesaPayPanel
                    appointmentId={appointmentId}
                    defaultPhone={customer.phone}
                    amount={amountDue}
                    autoStart={payNow}
                    manualNumber={payNumber}
                    onPaid={() => setPaid(true)}
                  />
                </div>
              )}

              {!stkEnabled && !(Number(mpesa.amount) > 0) && (
                <div className="mt-6 rounded-xl bg-cream-soft px-4 py-3 text-sm">
                  <p className="text-charcoal">
                    Send <strong>{formatKes(amountDue)}</strong> by M-Pesa to
                  </p>
                  <p className="mt-1 font-display text-xl font-bold tracking-wide text-charcoal">{payNumber}</p>
                  <p className="text-xs text-charcoal-muted">Magdalene Medza</p>
                </div>
              )}

              <dl className="mt-6 divide-y divide-gray-100 border-y border-gray-100 text-sm">
                <ReviewRow k="Service" v={service.name} />
                <ReviewRow k="When" v={`${prettyDate(date)}, ${minutesToLabel(startMin)}`} />
                <ReviewRow k="Where" v={serviceType === "OUTCALL" ? "Home visit" : "Studio"} />
                <ReviewRow k="Price" v={formatKes(priceFor(service, serviceType))} />
                {Number(mpesa.amount) > 0 && (
                  <ReviewRow k="Paid" v={formatKes(Number(mpesa.amount))} />
                )}
              </dl>

              <a
                href={`https://wa.me/${salonPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                  `Hi Magdalene, I just booked ${service.name} for ${prettyDate(date)} at ${minutesToLabel(startMin)}.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="btn-outline mt-6 w-full"
              >
                WhatsApp Magdalene
              </a>

              <div className="mt-3 flex justify-between gap-3">
                <Link href="/" className="btn-ghost">
                  Back to home
                </Link>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setStep(0);
                    setServiceId(undefined);
                    setStartMin(null);
                    setCustomer({ name: "", phone: "", email: "", notes: "" });
                    setMpesa({ number: "", message: "", amount: "" });
                    setAppointmentId(null);
                    setPaid(false);
                  }}
                >
                  Book another
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary panel: always visible on desktop while booking */}
      {step < 4 && (
        <BookingSummary
          service={service}
          serviceType={serviceType}
          date={step >= 2 ? date : null}
          startMin={startMin}
        />
      )}
      </div>
    </div>
  );
}

/* ── Small presentational helpers ───────────────────────────── */

function Stepper({ step }: { step: number }) {
  const shown = Math.min(step, STEPS.length - 1);
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-charcoal">
          Step {shown + 1} of {STEPS.length}: {STEPS[shown]}
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-royal-600 transition-all duration-300"
          style={{ width: `${((shown + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-up">
      <h2 className="font-display text-2xl font-bold text-charcoal">{title}</h2>
      {subtitle && <p className="mt-1 text-charcoal-muted">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function TypeCard({
  active,
  onClick,
  title,
  desc,
  price,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  price: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex h-full flex-col rounded-2xl border bg-white p-6 text-left transition-all duration-300 ${
        active
          ? "border-royal-600 shadow-soft ring-1 ring-royal-600"
          : "border-gray-200 hover:-translate-y-0.5 hover:border-royal-200 hover:shadow-soft"
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="font-display text-lg font-bold text-charcoal">{title}</span>
        <span
          className={`mt-1 h-5 w-5 shrink-0 rounded-full border-2 ${
            active ? "border-royal-600 bg-royal-600 shadow-[inset_0_0_0_3px_white]" : "border-gray-300"
          }`}
        />
      </span>
      <span className="mt-1 block text-sm text-charcoal-muted">{desc}</span>
      <span className="mt-auto pt-6 font-display text-2xl font-bold text-charcoal">{price}</span>
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-charcoal">{label}</span>
        {hint && <span className="text-xs text-charcoal-muted">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/** Small square photo of the chosen style. */
function ServiceThumb({ service, size = 64 }: { service: Service; size?: number }) {
  return (
    <span
      className="block shrink-0 overflow-hidden rounded-xl bg-gray-100"
      style={{ width: size, height: size }}
    >
      {service.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={service.imageUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center font-display text-lg text-gray-300">M</span>
      )}
    </span>
  );
}

function ConfirmRow({ k, v, onEdit }: { k: string; v: string; onEdit: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 text-sm">
      <div className="min-w-0">
        <dt className="text-xs text-charcoal-muted">{k}</dt>
        <dd className="mt-0.5 break-words font-medium text-charcoal">{v}</dd>
      </div>
      <button onClick={onEdit} className="shrink-0 text-xs font-semibold text-royal-700 hover:underline">
        Change
      </button>
    </div>
  );
}

function PayOption({
  active,
  onClick,
  title,
  text,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  text: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-start gap-3 rounded-xl p-3 text-left ring-1 transition-colors ${
        active ? "bg-royal-50 ring-royal-500" : "ring-gray-200 hover:ring-gray-300"
      }`}
    >
      <span
        className={`mt-0.5 h-4 w-4 shrink-0 rounded-full border-2 ${
          active ? "border-royal-600 bg-royal-600 shadow-[inset_0_0_0_2px_white]" : "border-gray-300"
        }`}
      />
      <span>
        <span className="block font-semibold text-charcoal">{title}</span>
        <span className="block text-xs text-charcoal-muted">{text}</span>
      </span>
    </button>
  );
}

function NavRow({
  onBack,
  onNext,
  nextLabel = "Continue",
  nextDisabled = false,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}) {
  return (
    <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-5">
      {onBack ? (
        <button onClick={onBack} className="btn-ghost">
          ← Back
        </button>
      ) : (
        <span />
      )}
      <button onClick={onNext} disabled={nextDisabled} className="btn-primary">
        {nextLabel}
      </button>
    </div>
  );
}

function BookingSummary({
  service,
  serviceType,
  date,
  startMin,
}: {
  service?: Service;
  serviceType: "INCALL" | "OUTCALL";
  date: string | null;
  startMin: number | null;
}) {
  const price = service ? priceFor(service, serviceType) : null;
  return (
    <aside className="hidden lg:block">
      <div className="card sticky top-24 p-5">
        <h3 className="font-display text-base font-bold text-charcoal">Your booking</h3>
        {service && (
          <div className="mt-3 flex items-center gap-3">
            <ServiceThumb service={service} size={52} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-charcoal">{service.name}</p>
              <p className="text-xs text-charcoal-muted">{durationLabel(service.durationMin)}</p>
            </div>
          </div>
        )}
        <dl className="mt-3 divide-y divide-gray-100 text-sm">
          {!service && <SummaryRow k="Style" v={undefined} />}
          <SummaryRow k="Where" v={service ? (serviceType === "OUTCALL" ? "Home visit" : "Studio") : undefined} />
          <SummaryRow k="Date" v={date ? prettyDate(date) : undefined} />
          <SummaryRow
            k="Time"
            v={
              service && startMin != null
                ? `${minutesToLabel(startMin)} to ${minutesToLabel(startMin + service.durationMin)}`
                : undefined
            }
          />
        </dl>
        <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
          <span className="text-sm font-medium text-charcoal">Total</span>
          <span className="font-display text-lg font-bold text-charcoal">
            {price != null ? formatKes(price) : "—"}
          </span>
        </div>
      </div>
    </aside>
  );
}

function SummaryRow({ k, v }: { k: string; v?: string }) {
  return (
    <div className="flex justify-between gap-3 py-2">
      <dt className="shrink-0 text-charcoal-muted">{k}</dt>
      <dd className={`text-right ${v ? "font-medium text-charcoal" : "text-gray-400"}`}>{v || "Not chosen"}</dd>
    </div>
  );
}

function ReviewRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-charcoal-muted">{k}</dt>
      <dd className="text-right font-medium text-charcoal">{v}</dd>
    </div>
  );
}
