"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ServiceCard, { ServiceCardData } from "./ServiceCard";
import Icon, { IconName } from "./Icon";
import MonthCalendar from "./MonthCalendar";
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

const STATUS_STYLE: Record<string, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  OCCUPIED: "bg-red-50 text-red-400 ring-red-100 line-through",
  PENDING: "bg-amber-50 text-amber-500 ring-amber-100",
  LUNCH: "bg-charcoal/5 text-charcoal-muted ring-black/5",
  CLOSED: "bg-gray-50 text-gray-300 ring-gray-100",
  BLOCKED: "bg-gray-100 text-gray-400 ring-gray-200",
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
      Number(mpesa.amount) > 0
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
          deposit: {
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
      setStep(5);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Progress */}
      <Stepper step={step} />

      <div className="mt-8">
        {/* ── Step 0: Service ─────────────────────────────── */}
        {step === 0 && (
          <Section title="Choose your style" subtitle="Pick the service you'd like to book.">
            <div className="space-y-10">
              {CATEGORY_ORDER.filter((cat) => services.some((s) => s.category === cat)).map(
                (cat) => (
                  <div key={cat}>
                    <h3 className="mb-4 font-display text-lg font-semibold text-charcoal">
                      {CATEGORY_LABEL[cat] || cat}
                    </h3>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
                                {serviceId === s.id ? "Selected" : `Choose ${s.name}`}
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
                desc={`At ${location.split(",")[0]} along Ngong Road.`}
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
                <p className="mb-4 rounded-xl bg-gold/10 px-4 py-3 text-sm text-charcoal-soft ring-1 ring-gold/30">
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
            subtitle={`${service.name} · ${durationLabel(service.durationMin)} · only green slots are open.`}
          >
            <div className="grid gap-6 md:grid-cols-[300px_1fr]">
              {/* Calendar */}
              <div>
                <MonthCalendar value={date} onChange={setDate} isDisabled={dayDisabled} />
                <p className="mt-3 flex items-center gap-2 text-xs text-charcoal-muted">
                  <span className="h-2 w-2 rounded-full bg-royal-500" /> Today
                  <span className="ml-2 text-charcoal-muted/70">
                    Greyed dates are closed
                  </span>
                </p>
              </div>

              {/* Times */}
              <div>
                <div className="text-sm font-semibold text-charcoal-soft">{prettyDate(date)}</div>

                {/* Legend */}
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-charcoal-muted">
                  <Legend dot="bg-emerald-500" label="Available" />
                  <Legend dot="bg-red-400" label="Occupied" />
                  <Legend dot="bg-amber-400" label="Pending" />
                  <Legend dot="bg-charcoal/40" label="Lunch" />
                  <Legend dot="bg-gray-300" label="Closed / Past" />
                </div>

                {/* Slots */}
                <div className="mt-4 min-h-[120px]">
              {loadingAvail && <p className="text-sm text-charcoal-muted">Loading availability…</p>}

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
                    <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200">
                      Magdalene is fully booked on {prettyDate(date)}. Please choose
                      another day on the calendar.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
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
                            className={`rounded-xl px-2 py-2.5 text-xs font-semibold ring-1 transition ${
                              selected
                                ? "bg-royal-600 text-white ring-royal-600 shadow-soft"
                                : STATUS_STYLE[status] || STATUS_STYLE.CLOSED
                            } ${canBook ? "cursor-pointer hover:ring-2 hover:ring-royal-400" : taken ? "cursor-pointer" : "cursor-not-allowed"}`}
                          >
                            {slot.label}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {slotNotice && (
                    <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-red-200">
                      {slotNotice}
                      {avail.bookableStarts.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="text-red-700/80">Free times:</span>
                          {avail.bookableStarts.slice(0, 6).map((m) => (
                            <button
                              key={m}
                              onClick={() => {
                                setStartMin(m);
                                setSlotNotice(null);
                              }}
                              className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-200"
                            >
                              {minutesToLabel(m)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {startMin != null && (
                    <p className="mt-4 rounded-xl bg-royal-50 px-4 py-3 text-sm text-royal-700">
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
            <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
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
                    name="company"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="absolute left-[-9999px] h-0 w-0 opacity-0"
                  />
                </div>
              </div>

              <Summary
                service={service}
                serviceType={serviceType}
                date={date}
                startMin={startMin}
              />
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
            subtitle="Please look over everything below. Press proceed when it all looks right."
          >
            <div className="mx-auto max-w-xl">
              <div className="card overflow-hidden">
                <div className="bg-royal-gradient px-5 py-4 text-white">
                  <p className="text-xs uppercase tracking-widest text-lavender-100">
                    Booking summary
                  </p>
                  <p className="font-display text-xl font-bold">{service.name}</p>
                </div>
                <dl className="divide-y divide-black/5 px-5">
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
                <div className="flex items-center justify-between border-t border-black/5 bg-lavender-50 px-5 py-4">
                  <span className="font-medium text-charcoal">Service price</span>
                  <span className="font-display text-2xl font-bold text-royal-600">
                    {formatKes(priceFor(service, serviceType))}
                  </span>
                </div>
              </div>

              {serviceType === "OUTCALL" && (
                <p className="mt-3 rounded-xl bg-gold/10 px-4 py-3 text-sm text-charcoal-soft ring-1 ring-gold/30">
                  This is the service price. I will send you the transport fare once I
                  confirm your booking.
                </p>
              )}

              {/* Deposit / M-Pesa — recommended, optional */}
              <div className="mt-4 overflow-hidden rounded-2xl border border-gold/40 bg-white shadow-card">
                <div className="flex items-center justify-between gap-3 bg-gold-sheen px-5 py-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-royal-900/80">
                      Secure your slot
                    </p>
                    <p className="font-display text-lg font-bold text-royal-900">
                      Pay {depositPercent}% deposit ·{" "}
                      {formatKes(Math.round((priceFor(service, serviceType) * depositPercent) / 100))}
                    </p>
                  </div>
                  <Icon name="sparkle" size={26} className="text-royal-900/70" />
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

              {error && (
                <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                  {error}
                </p>
              )}

              <NavRow
                onBack={() => setStep(3)}
                nextLabel={submitting ? "Booking…" : "Proceed and book"}
                onNext={submit}
                nextDisabled={submitting}
              />
            </div>
          </Section>
        )}

        {/* ── Step 5: Done ────────────────────────────────── */}
        {step === 5 && service && startMin != null && (
          <div className="mx-auto max-w-lg overflow-hidden rounded-3xl border border-gold/30 bg-white shadow-soft">
            <div className="bg-royal-gradient px-8 py-10 text-center text-white">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/15 text-gold-light ring-2 ring-gold/50">
                <Icon name="checkCircle" size={36} />
              </div>
              <h2 className="mt-5 font-display text-3xl font-semibold">
                Thank you, {customer.name.split(" ")[0]}
              </h2>
              <p className="mt-2 text-sm text-lavender-100">
                Your booking request has been received.
              </p>
            </div>

            <div className="p-8 text-center">
              <p className="text-charcoal-soft">
                {Number(mpesa.amount) > 0
                  ? "Magdalene will personally call or message you on WhatsApp to confirm your appointment and your deposit."
                  : "Magdalene will personally call or message you on WhatsApp to confirm your appointment and talk you through the deposit."}
              </p>

              <div className="mt-6 rounded-2xl bg-lavender-50 p-5 text-left text-sm">
                <Row k="Service" v={service.name} />
                <Row k="When" v={`${prettyDate(date)}, ${minutesToLabel(startMin)}`} />
                <Row k="Where" v={serviceType === "OUTCALL" ? "I come to you" : "At my studio"} />
                <Row k="Price" v={formatKes(priceFor(service, serviceType))} />
                {Number(mpesa.amount) > 0 && (
                  <Row k="Deposit paid" v={formatKes(Number(mpesa.amount))} />
                )}
              </div>

              <a
                href={`https://wa.me/${salonPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                  `Hi Magdalene, I just booked ${service.name} for ${prettyDate(date)} at ${minutesToLabel(startMin)}.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary mt-6 w-full"
              >
                <Icon name="whatsapp" size={18} /> Message Magdalene now
              </a>

              <div className="mt-3 flex justify-center gap-3">
                <Link href="/" className="btn-ghost">
                  Back to home
                </Link>
                <button
                  className="btn-outline"
                  onClick={() => {
                    setStep(0);
                    setServiceId(undefined);
                    setStartMin(null);
                    setCustomer({ name: "", phone: "", email: "", notes: "" });
                    setMpesa({ number: "", message: "", amount: "" });
                  }}
                >
                  Book another
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Small presentational helpers ───────────────────────────── */

function Stepper({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-1 sm:gap-2">
      {STEPS.map((label, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li key={label} className="flex flex-1 items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold transition ${
                  done
                    ? "bg-royal-600 text-white"
                    : active
                      ? "bg-royal-600 text-white ring-4 ring-royal-100"
                      : "bg-white text-charcoal-muted ring-1 ring-black/10"
                }`}
              >
                {done ? <Icon name="check" size={14} /> : i + 1}
              </span>
              <span
                className={`hidden text-xs font-medium sm:block ${
                  active ? "text-royal-700" : "text-charcoal-muted"
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={`h-px flex-1 ${done ? "bg-royal-400" : "bg-black/10"}`} />
            )}
          </li>
        );
      })}
    </ol>
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
      {subtitle && <p className="mt-1 text-sm text-charcoal-muted">{subtitle}</p>}
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
      className={`flex items-start gap-4 rounded-2xl border p-5 text-left transition ${
        active
          ? "border-royal-500 bg-royal-50 shadow-glow ring-2 ring-royal-200"
          : "border-black/10 bg-white hover:border-royal-300"
      }`}
    >
      <span
        className={`inline-flex rounded-xl p-2.5 ${
          active ? "bg-royal-600 text-white" : "bg-royal-50 text-royal-600"
        }`}
      >
        <Icon name={icon} size={22} />
      </span>
      <span className="flex-1">
        <span className="block font-display text-lg font-semibold text-charcoal">{title}</span>
        <span className="block text-sm text-charcoal-muted">{desc}</span>
        <span className="mt-2 inline-block font-display text-lg font-bold text-royal-600">
          {price}
        </span>
      </span>
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
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
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
    <div className="mt-8 flex items-center justify-between">
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

function Summary({
  service,
  serviceType,
  date,
  startMin,
}: {
  service: Service;
  serviceType: "INCALL" | "OUTCALL";
  date: string;
  startMin: number;
}) {
  return (
    <aside className="card h-fit p-5">
      <h4 className="font-display text-lg font-semibold">Booking summary</h4>
      <div className="mt-4 space-y-2 text-sm">
        <Row k="Service" v={service.name} />
        <Row k="Duration" v={durationLabel(service.durationMin)} />
        <Row k="Where" v={serviceType === "OUTCALL" ? "I come to you" : "At my studio"} />
        <Row k="Date" v={prettyDate(date)} />
        <Row k="Time" v={`${minutesToLabel(startMin)} to ${minutesToLabel(startMin + service.durationMin)}`} />
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4">
        <span className="font-medium">Total</span>
        <span className="font-display text-xl font-bold text-royal-600">
          {formatKes(priceFor(service, serviceType))}
        </span>
      </div>
    </aside>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-charcoal-muted">{k}</span>
      <span className="text-right font-medium text-charcoal">{v}</span>
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
