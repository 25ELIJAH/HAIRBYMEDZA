"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ServiceCard, { ServiceCardData } from "./ServiceCard";
import Icon, { IconName } from "./Icon";
import MonthCalendar from "./MonthCalendar";
import MpesaPayPanel from "./MpesaPayPanel";
import { SlotGridSkeleton } from "./Skeleton";
import {
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
  Kids: "Kids Braiding",
  Teen: "Teen Braiding",
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

const STEPS = ["Service", "Type", "Date & Time", "Details", "Review", "Done"];

// Time slot looks: free slots are outlined, everything else is muted grey.
const STATUS_STYLE: Record<string, string> = {
  AVAILABLE: "bg-white text-charcoal ring-gray-300",
  OCCUPIED: "bg-gray-50 text-gray-400 ring-gray-100 line-through",
  PENDING: "bg-gray-50 text-gray-400 ring-gray-100 line-through",
  LUNCH: "bg-gray-50 text-gray-300 ring-gray-100",
  CLOSED: "bg-gray-50 text-gray-300 ring-gray-100",
  BLOCKED: "bg-gray-50 text-gray-300 ring-gray-100",
};

export default function BookingWizard({
  services,
  initialServiceId,
  salonName,
  salonPhone,
  location,
  openDays,
  blockedDates,
  mpesaNumber,
  depositPercent,
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
  depositPercent: number;
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
  // Optional M-Pesa deposit details the client can paste to secure the booking.
  const [mpesa, setMpesa] = useState({ number: "", message: "", amount: "" });
  // Message shown when a client taps a time Magdalene is already booked for.
  const [slotNotice, setSlotNotice] = useState<string | null>(null);
  // Honeypot: hidden from real users; bots tend to auto-fill it.
  const [company, setCompany] = useState("");
  // Online deposit via Paystack (M-Pesa prompt or card) right after booking.
  const [payNow, setPayNow] = useState(true);
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  const [depositPaid, setDepositPaid] = useState(false);

  const [avail, setAvail] = useState<AvailabilityResponse | null>(null);
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

  const dayDisabled = (d: string) =>
    d < todayStr() || !openDays.includes(dayOfWeek(d)) || blockedDates.includes(d);

  const bookable = new Set(avail?.bookableStarts ?? []);

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
          ? "\nThe client is paying the deposit by M-Pesa prompt. The receipt shows on the booking in your dashboard."
          : "\nThe client chose to pay later. You can send them an M-Pesa prompt from the dashboard."
        : Number(mpesa.amount) > 0
          ? `\nDeposit paid: ${formatKes(Number(mpesa.amount))} (M-Pesa ${mpesa.number})\nM-Pesa message: ${mpesa.message}`
          : "\nNo deposit paid yet. Please call the client to confirm.",
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
          // With online payments the deposit is confirmed by Paystack, never self-reported.
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

      <div className={`mt-8 grid gap-8 ${step < 5 ? "lg:grid-cols-[minmax(0,1fr)_300px]" : ""}`}>
      <div className="min-w-0">
        {/* ── Step 0: Service ─────────────────────────────── */}
        {step === 0 && (
          <Section title="Choose your style" subtitle="Pick the service you'd like to book.">
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
                                {serviceId === s.id ? "Selected" : "Choose this style"}
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

        {/* ── Step 1: Type ────────────────────────────────── */}
        {step === 1 && service && (
          <Section
            title="Where would you like your braids?"
            subtitle="Studio prices are a little lower. When I travel to you the price is slightly higher. Pick what suits you."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <TypeCard
                active={serviceType === "INCALL"}
                onClick={() => setServiceType("INCALL")}
                icon="home"
                title="Come to my studio"
                desc={location ? `At my studio in ${location}.` : "At my studio."}
                price={formatKes(service.priceKes)}
              />
              <TypeCard
                active={serviceType === "OUTCALL"}
                onClick={() => setServiceType("OUTCALL")}
                icon="car"
                title="I come to you"
                desc="I travel to your home or office."
                price={formatKes(service.outCallPriceKes)}
              />
            </div>

            {serviceType === "OUTCALL" && (
              <div className="mt-6 card p-5">
                <p className="mb-4 rounded-lg bg-cream-soft px-4 py-3 text-sm text-charcoal-soft">
                  Please fill in your location clearly so I can reach you. I will share
                  the exact transport fare once I confirm your booking.
                </p>
                <h4 className="mb-1 font-display text-lg font-semibold">Where should I come?</h4>
                <p className="mb-4 text-xs text-charcoal-muted">All fields below are required.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Town / Estate / Area *">
                    <input
                      className="input"
                      value={loc.estate}
                      onChange={(e) => setLoc({ ...loc, estate: e.target.value })}
                      placeholder="e.g. Kilimani, Nairobi"
                    />
                  </Field>
                  <Field label="House / Apartment number *">
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
                  <Field label="Google Maps pin link (optional)">
                    <input
                      className="input"
                      value={loc.mapsPin}
                      onChange={(e) => setLoc({ ...loc, mapsPin: e.target.value })}
                      placeholder="Paste a maps link if you have one"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Directions to your door *">
                      <textarea
                        className="input min-h-[80px]"
                        value={loc.travelNotes}
                        onChange={(e) => setLoc({ ...loc, travelNotes: e.target.value })}
                        placeholder="Gate colour, gate code, floor, parking, who to ask for…"
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
            title="Pick a date & time"
            subtitle={`${service.name} takes about ${durationLabel(service.durationMin).toLowerCase()}. Choose a day, then a free time.`}
          >
            <div className="grid gap-6 md:grid-cols-[280px_minmax(0,1fr)]">
              {/* Calendar */}
              <div>
                <MonthCalendar value={date} onChange={setDate} isDisabled={dayDisabled} />
                <p className="mt-3 text-xs text-charcoal-muted">Greyed out days are closed.</p>
              </div>

              {/* Times */}
              <div>
                <div className="text-sm font-semibold text-charcoal-soft">{prettyDate(date)}</div>

                {/* Legend */}
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-charcoal-muted">
                  <Legend dot="bg-white ring-1 ring-gray-400" label="Free" />
                  <Legend dot="bg-royal-600" label="Your choice" />
                  <Legend dot="bg-gray-200" label="Taken or closed" />
                </div>

                {/* Slots */}
                <div className="mt-4 min-h-[120px]">
              {loadingAvail && <SlotGridSkeleton />}

              {!loadingAvail && avail && !avail.open && (
                <div className="card border-dashed p-6 text-center text-charcoal-muted">
                  <p className="font-medium text-charcoal">
                    {avail.reason || "Not available"}
                  </p>
                  <p className="mt-1 text-sm">Please choose another date.</p>
                </div>
              )}

              {!loadingAvail && avail && avail.open && avail.dayFull && (
                <div className="card border-dashed p-6 text-center text-charcoal-muted">
                  Fully booked for this day. Please try another date.
                </div>
              )}

              {!loadingAvail && avail && avail.open && !avail.dayFull && (
                <>
                  {avail.bookableStarts.length === 0 ? (
                    <div className="rounded-lg bg-cream-soft px-4 py-3 text-sm text-charcoal-soft">
                      Magdalene is fully booked on {prettyDate(date)}. Please choose
                      another day on the calendar.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {avail.grid.map((slot) => {
                        const canBook = bookable.has(slot.startMin);
                        const taken = !canBook && (slot.status === "OCCUPIED" || slot.status === "PENDING");
                        const status = canBook ? "AVAILABLE" : slot.status;
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
                                setSlotNotice(
                                  `Magdalene is already booked at ${slot.label} on ${prettyDate(date)}. Please pick a free (green) time below, or choose another day.`
                                );
                              }
                            }}
                            className={`rounded-lg px-2 py-2.5 text-sm font-medium ring-1 transition-colors ${
                              selected
                                ? "bg-royal-600 text-white ring-royal-600"
                                : STATUS_STYLE[status] || STATUS_STYLE.CLOSED
                            } ${canBook ? "cursor-pointer hover:ring-royal-500 hover:text-royal-700" : taken ? "cursor-pointer" : "cursor-not-allowed"}`}
                          >
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {slotNotice && (
                    <div className="mt-4 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-charcoal-soft">
                      {slotNotice}
                      {avail.bookableStarts.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="text-charcoal-muted">Free times:</span>
                          {avail.bookableStarts.slice(0, 6).map((m) => (
                            <button
                              key={m}
                              onClick={() => {
                                setStartMin(m);
                                setSlotNotice(null);
                              }}
                              className="rounded-md border border-gray-300 px-2 py-0.5 text-xs font-medium text-charcoal hover:border-royal-500 hover:text-royal-700"
                            >
                              {minutesToLabel(m)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {startMin != null && (
                    <p className="mt-4 rounded-lg bg-royal-50 px-4 py-3 text-sm text-royal-800">
                      Selected: <strong>{minutesToLabel(startMin)}</strong> to{" "}
                      {minutesToLabel(startMin + service.durationMin)} (
                      {durationLabel(service.durationMin)})
                    </p>
                  )}
                </>
              )}
                </div>
              </div>
            </div>

            <NavRow
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
              nextDisabled={startMin == null}
            />
          </Section>
        )}

        {/* ── Step 3: Details ─────────────────────────────── */}
        {step === 3 && service && startMin != null && (
          <Section title="Your details" subtitle="So I can confirm your booking with you.">
            <div>
              <div className="card p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name *">
                    <input
                      className="input"
                      value={customer.name}
                      onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                      placeholder="Jane Wanjiku"
                    />
                  </Field>
                  <Field label="Phone (WhatsApp) *">
                    <input
                      className="input"
                      value={customer.phone}
                      onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                      placeholder="07XX XXX XXX"
                    />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field label="Email (optional)">
                      <input
                        className="input"
                        type="email"
                        value={customer.email}
                        onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                        placeholder="you@email.com"
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field label="Notes (optional)">
                      <textarea
                        className="input min-h-[72px]"
                        value={customer.notes}
                        onChange={(e) => setCustomer({ ...customer, notes: e.target.value })}
                        placeholder="Hair length, colour preference, allergies…"
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

            </div>

            <NavRow
              onBack={() => setStep(2)}
              nextLabel="Review booking"
              onNext={() => setStep(4)}
              nextDisabled={
                customer.name.trim().length < 2 ||
                customer.phone.replace(/[^0-9]/g, "").length < 9
              }
            />
          </Section>
        )}

        {/* ── Step 4: Review & confirm ────────────────────── */}
        {step === 4 && service && startMin != null && (
          <Section
            title="Check your booking"
            subtitle="Make sure everything is right, then book."
          >
            <div className="max-w-xl">
              <div className="card overflow-hidden">
                <div className="border-b border-gray-200 px-5 py-4">
                  <p className="text-sm text-charcoal-muted">Your booking</p>
                  <p className="font-display text-lg font-bold text-charcoal">{service.name}</p>
                </div>
                <dl className="divide-y divide-gray-100 px-5">
                  <ReviewRow k="Where" v={serviceType === "OUTCALL" ? "I come to you" : "At my studio"} />
                  <ReviewRow k="Date" v={prettyDate(date)} />
                  <ReviewRow k="Time" v={`${minutesToLabel(startMin)} to ${minutesToLabel(startMin + service.durationMin)}`} />
                  <ReviewRow k="Duration" v={durationLabel(service.durationMin)} />
                  <ReviewRow k="Name" v={customer.name} />
                  <ReviewRow k="Phone" v={customer.phone} />
                  {customer.email && <ReviewRow k="Email" v={customer.email} />}
                  {customer.notes && <ReviewRow k="Notes" v={customer.notes} />}
                  {serviceType === "OUTCALL" && (
                    <>
                      <ReviewRow k="Area" v={loc.estate} />
                      <ReviewRow k="House / Apartment" v={loc.houseNumber} />
                      <ReviewRow k="Landmark" v={loc.landmark} />
                      <ReviewRow k="Directions" v={loc.travelNotes} />
                      {loc.mapsPin && <ReviewRow k="Maps pin" v={loc.mapsPin} />}
                    </>
                  )}
                </dl>
                <div className="flex items-center justify-between border-t border-gray-200 bg-cream-soft px-5 py-4">
                  <span className="font-medium text-charcoal">Service price</span>
                  <span className="font-display text-xl font-bold text-charcoal">
                    {formatKes(priceFor(service, serviceType))}
                  </span>
                </div>
              </div>

              {serviceType === "OUTCALL" && (
                <p className="mt-3 rounded-lg bg-cream-soft px-4 py-3 text-sm text-charcoal-soft">
                  This is the service price. I will send you the transport fare once I
                  confirm your booking.
                </p>
              )}

              {/* Deposit / M-Pesa — recommended, optional */}
              {stkEnabled ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
                  <div className="border-b border-gray-200 px-5 py-3">
                    <div>
                      <p className="text-sm text-charcoal-muted">
                        Secure your slot
                      </p>
                      <p className="font-display text-base font-bold text-charcoal">
                        {depositPercent}% deposit ·{" "}
                        {formatKes(Math.round((priceFor(service, serviceType) * depositPercent) / 100))}
                      </p>
                    </div>
                    
                  </div>
                  <div className="space-y-2 p-5 text-sm">
                    <label className={`flex cursor-pointer items-start gap-3 rounded-lg p-3 ring-1 transition ${payNow ? "bg-royal-50 ring-royal-500" : "ring-gray-200"}`}>
                      <input type="radio" className="mt-1" checked={payNow} onChange={() => setPayNow(true)} />
                      <span>
                        <span className="block font-semibold text-charcoal">Pay deposit now with M-Pesa (recommended)</span>
                        <span className="text-charcoal-muted">
                          After you press book, an M-Pesa prompt pops up on your phone. Enter your PIN and you are done.
                        </span>
                      </span>
                    </label>
                    <label className={`flex cursor-pointer items-start gap-3 rounded-lg p-3 ring-1 transition ${!payNow ? "bg-royal-50 ring-royal-500" : "ring-gray-200"}`}>
                      <input type="radio" className="mt-1" checked={!payNow} onChange={() => setPayNow(false)} />
                      <span>
                        <span className="block font-semibold text-charcoal">Book now, pay later</span>
                        <span className="text-charcoal-muted">Magdalene will call or message you to confirm.</span>
                      </span>
                    </label>
                  </div>
                </div>
              ) : (
              <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
                <div className="border-b border-gray-200 px-5 py-3">
                  <div>
                    <p className="text-sm text-charcoal-muted">
                      Secure your slot
                    </p>
                    <p className="font-display text-base font-bold text-charcoal">
                      Pay {depositPercent}% deposit ·{" "}
                      {formatKes(Math.round((priceFor(service, serviceType) * depositPercent) / 100))}
                    </p>
                  </div>
                  
                </div>
                <div className="p-5">
                  <p className="text-sm text-charcoal-soft">
                    To hold your appointment, send the deposit to{" "}
                    <strong className="text-royal-700">M-Pesa {mpesaNumber || salonPhone}</strong>{" "}
                    then paste your confirmation below. This is recommended but optional.
                    Magdalene will still call or message you to confirm.
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field label="Your M-Pesa number">
                      <input
                        className="input"
                        value={mpesa.number}
                        onChange={(e) => setMpesa({ ...mpesa, number: e.target.value })}
                        placeholder="07XX XXX XXX"
                      />
                    </Field>
                    <Field label="Amount paid (KES)">
                      <input
                        className="input"
                        type="number"
                        min={0}
                        value={mpesa.amount}
                        onChange={(e) => setMpesa({ ...mpesa, amount: e.target.value })}
                        placeholder="e.g. 500"
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Paste the M-Pesa confirmation message">
                        <textarea
                          className="input min-h-[70px]"
                          value={mpesa.message}
                          onChange={(e) => setMpesa({ ...mpesa, message: e.target.value })}
                          placeholder="e.g. TAB1234XYZ Confirmed. Ksh500.00 sent to..."
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              </div>

              )}

              {error && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {error}
                </p>
              )}

              <NavRow
                onBack={() => setStep(3)}
                nextLabel={
                  submitting
                    ? "Booking…"
                    : stkEnabled && payNow
                      ? "Book & pay deposit"
                      : "Proceed and book"
                }
                onNext={submit}
                nextDisabled={submitting}
              />
            </div>
          </Section>
        )}

        {/* ── Step 5: Done ────────────────────────────────── */}
        {step === 5 && service && startMin != null && (
          <div className="mx-auto max-w-lg animate-fade-up">
            <div className="card p-6 sm:p-8">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-royal-50 text-royal-600">
                <Icon name="check" size={24} />
              </div>
              <h2 className="mt-4 font-display text-2xl font-bold text-charcoal">
                Thank you, {customer.name.split(" ")[0]}
              </h2>
              <p className="mt-2 text-charcoal-muted">
                {depositPaid || Number(mpesa.amount) > 0
                  ? "Your booking request is in. Magdalene will message you on WhatsApp to confirm your appointment and deposit."
                  : stkEnabled && payNow
                    ? "Your booking request is in. Complete the M-Pesa payment below to secure your slot."
                    : "Your booking request is in. Magdalene will call or message you on WhatsApp to confirm and talk you through the deposit."}
              </p>

              {stkEnabled && appointmentId && appointmentId !== "skipped" && (
                <div className="mt-6">
                  <MpesaPayPanel
                    appointmentId={appointmentId}
                    defaultPhone={customer.phone}
                    amount={Math.round((priceFor(service, serviceType) * depositPercent) / 100)}
                    autoStart={payNow}
                    manualNumber={mpesaNumber}
                    onPaid={() => setDepositPaid(true)}
                  />
                </div>
              )}

              <dl className="mt-6 divide-y divide-gray-100 border-y border-gray-100 text-sm">
                <ReviewRow k="Service" v={service.name} />
                <ReviewRow k="When" v={`${prettyDate(date)}, ${minutesToLabel(startMin)}`} />
                <ReviewRow k="Where" v={serviceType === "OUTCALL" ? "I come to you" : "At my studio"} />
                <ReviewRow k="Price" v={formatKes(priceFor(service, serviceType))} />
                {Number(mpesa.amount) > 0 && (
                  <ReviewRow k="Deposit paid" v={formatKes(Number(mpesa.amount))} />
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
                <Icon name="whatsapp" size={18} /> Message Magdalene on WhatsApp
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
                    setDepositPaid(false);
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
      {step < 5 && (
        <BookingSummary
          service={service}
          serviceType={serviceType}
          date={step >= 2 ? date : null}
          startMin={startMin}
          depositPercent={depositPercent}
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
  icon,
  title,
  desc,
  price,
}: {
  active: boolean;
  onClick: () => void;
  icon: IconName;
  title: string;
  desc: string;
  price: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-start gap-4 rounded-xl border bg-white p-5 text-left transition-colors ${
        active ? "border-royal-600 ring-1 ring-royal-600" : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <span className={`mt-0.5 ${active ? "text-royal-600" : "text-charcoal-muted"}`}>
        <Icon name={icon} size={22} />
      </span>
      <span className="flex-1">
        <span className="block font-semibold text-charcoal">{title}</span>
        <span className="mt-0.5 block text-sm text-charcoal-muted">{desc}</span>
        <span className="mt-2 inline-block font-semibold text-charcoal">{price}</span>
      </span>
      <span
        className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
          active ? "border-royal-600 bg-royal-600 shadow-[inset_0_0_0_2px_white]" : "border-gray-300"
        }`}
      />
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function Legend({ dot, label }: { dot: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-3 w-3 rounded ${dot}`} />
      {label}
    </span>
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
  depositPercent,
}: {
  service?: Service;
  serviceType: "INCALL" | "OUTCALL";
  date: string | null;
  startMin: number | null;
  depositPercent: number;
}) {
  const price = service ? priceFor(service, serviceType) : null;
  return (
    <aside className="hidden lg:block">
      <div className="card sticky top-24 p-5">
        <h3 className="font-display text-base font-bold text-charcoal">Your booking</h3>
        <dl className="mt-3 divide-y divide-gray-100 text-sm">
          <SummaryRow k="Style" v={service?.name} />
          <SummaryRow k="Where" v={service ? (serviceType === "OUTCALL" ? "I come to you" : "At my studio") : undefined} />
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
        {price != null && depositPercent > 0 && (
          <p className="mt-1 text-right text-xs text-charcoal-muted">
            Deposit {formatKes(Math.round((price * depositPercent) / 100))} to secure
          </p>
        )}
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
