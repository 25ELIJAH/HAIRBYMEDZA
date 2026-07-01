import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// All personal/business details come from environment variables so they are
// never hard coded in the source. See .env (git-ignored) for the values.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "owner@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-me";
const SALON_NAME = process.env.SALON_NAME || "Magdalene Medza";
const SALON_PHONE = process.env.WHATSAPP_NUMBER || "";
const MPESA_NUMBER = process.env.MPESA_NUMBER || (process.env.WHATSAPP_NUMBER || "").replace(/^\+?254/, "0").replace(/\s/g, "");
const SALON_EMAIL = process.env.OWNER_EMAIL || "";
const SALON_LOCATION = process.env.SALON_LOCATION || "";

// Durations are sensible braiding estimates — fully editable in the admin
// "Services" screen. The smart calendar uses these to block the right amount
// of time, so adjust them to match real working times.
const IMG = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=70`;

// Out-call price always lands between 3,000 and 4,000, scaled with the in-call
// price so cheaper styles sit near 3,000 and the priciest reach 4,000. The
// actual transport fare is shared with the client after the admin confirms.
const OUTCALL_MIN = 3000;
const OUTCALL_MAX = 4000;
const outCallPrice = (inCall: number) => {
  const lo = 800;
  const hi = 2000;
  const t = Math.max(0, Math.min(1, (inCall - lo) / (hi - lo)));
  const raw = OUTCALL_MIN + t * (OUTCALL_MAX - OUTCALL_MIN);
  return Math.round(raw / 100) * 100; // nearest 100
};
const STD_INCLUDES = "Wash\nBlow Dry\nBraiding\nStyling";
const mk = (
  name: string,
  category: string,
  priceKes: number,
  durationMin: number,
  bufferMin: number,
  imageId: string,
  description: string,
  sortOrder: number
) => ({
  name,
  slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
  description,
  category,
  priceKes,
  outCallPriceKes: outCallPrice(priceKes),
  durationMin,
  bufferMin,
  includes: STD_INCLUDES,
  imageUrl: IMG(imageId),
  sortOrder,
});

const services = [
  // ── Kids ──────────────────────────────────────────────
  mk("Kids French Braids", "Kids", 1200, 45, 15, "1757866332992-723bf8d6169c",
    "Neat French braids for little ones. Gentle, quick and tidy.", 1),
  mk("Kids Dutch Braids", "Kids", 1300, 50, 15, "1757866331952-8d6c8adc4dbe",
    "Raised Dutch braids that look bold and stay neat all week.", 2),
  mk("Kids Cornrows", "Kids", 1500, 60, 20, "1757866332825-42368c1105e8",
    "Clean, even cornrows in any pattern your child loves.", 3),
  mk("Kids Ghana Braids", "Kids", 1800, 90, 20, "1757866332840-230be07b786e",
    "Feed in Ghana braids that are light and comfortable for kids.", 4),
  mk("Kids Fulani Braids", "Kids", 1900, 90, 20, "1757866332818-781f8d7817e8",
    "Pretty Fulani braids with a stylish centre part.", 5),
  mk("Kids Stitch Braids", "Kids", 2000, 120, 20, "1757866332394-a2581b937482",
    "Crisp stitch braids with clean, defined lines.", 6),
  mk("Kids Lemonade Braids", "Kids", 2200, 120, 20, "1658497730270-b5f4fef00ae1",
    "Side swept lemonade braids that frame the face beautifully.", 7),
  mk("Kids Box Braids", "Kids", 2500, 150, 30, "1648010035195-6b0a56e14667",
    "Classic box braids, often finished with cute beads.", 8),
  mk("Kids Knotless Box Braids", "Kids", 2800, 180, 30, "1572954889228-2b12a55144d1",
    "Soft knotless box braids that are gentle on young edges.", 9),
  mk("Kids Passion Twists", "Kids", 2600, 150, 30, "1614173968962-0e61c5ed196f",
    "Bouncy passion twists with a soft, full finish.", 10),
  mk("Kids Marley Twists", "Kids", 2400, 120, 20, "1614173968962-0e61c5ed196f",
    "Natural looking Marley twists, light and playful.", 11),
  mk("Kids Goddess Braids", "Kids", 2300, 90, 20, "1572955304332-bf714bd49add",
    "Elegant goddess braids with a smooth, flowing look.", 12),
  // ── Teens ─────────────────────────────────────────────
  mk("Teen Box Braids", "Teen", 3000, 180, 30, "1572955304332-bf714bd49add",
    "Long lasting box braids styled the way you like.", 13),
  mk("Teen Knotless Box Braids", "Teen", 3500, 210, 30, "1572954889228-2b12a55144d1",
    "Lightweight knotless box braids, tension free and neat.", 14),
  mk("Teen Passion Twists", "Teen", 3200, 180, 30, "1614173968962-0e61c5ed196f",
    "Trendy passion twists with a soft, romantic finish.", 15),
  mk("Teen Lemonade Braids", "Teen", 2800, 150, 20, "1658497730270-b5f4fef00ae1",
    "Bold lemonade braids swept neatly to the side.", 16),
  // ── Packages ──────────────────────────────────────────
  mk("Full Braiding Package", "Package", 4500, 240, 30, "1572955304332-bf714bd49add",
    "The complete treatment: wash, treatment, braiding and styling all in one.", 17),
];

// Comrade-friendly in-call prices. None exceed 2,000. Out-call stays in-call
// plus 500, capped at 4,000.
const IN_CALL_PRICE: Record<string, number> = {
  "kids-french-braids": 800,
  "kids-dutch-braids": 900,
  "kids-cornrows": 1000,
  "kids-ghana-braids": 1100,
  "kids-fulani-braids": 1200,
  "kids-stitch-braids": 1300,
  "kids-lemonade-braids": 1400,
  "kids-goddess-braids": 1400,
  "kids-marley-twists": 1500,
  "kids-box-braids": 1500,
  "kids-passion-twists": 1600,
  "kids-knotless-box-braids": 1700,
  "teen-lemonade-braids": 1600,
  "teen-box-braids": 1700,
  "teen-passion-twists": 1800,
  "teen-knotless-box-braids": 1900,
  "full-braiding-package": 2000,
};
for (const s of services) {
  const p = IN_CALL_PRICE[s.slug];
  if (p != null) {
    s.priceKes = p;
    s.outCallPriceKes = outCallPrice(p);
  }
}

// 0 = Sunday ... 6 = Saturday
const workingHours = [
  { dayOfWeek: 0, isOpen: false, startMin: 480, endMin: 960, lunchStartMin: null, lunchEndMin: null },
  { dayOfWeek: 1, isOpen: true, startMin: 480, endMin: 1080, lunchStartMin: 720, lunchEndMin: 780 },
  { dayOfWeek: 2, isOpen: true, startMin: 480, endMin: 1080, lunchStartMin: 720, lunchEndMin: 780 },
  { dayOfWeek: 3, isOpen: true, startMin: 480, endMin: 1080, lunchStartMin: 720, lunchEndMin: 780 },
  { dayOfWeek: 4, isOpen: true, startMin: 480, endMin: 1080, lunchStartMin: 720, lunchEndMin: 780 },
  { dayOfWeek: 5, isOpen: true, startMin: 480, endMin: 1080, lunchStartMin: 720, lunchEndMin: 780 },
  { dayOfWeek: 6, isOpen: true, startMin: 480, endMin: 960, lunchStartMin: 720, lunchEndMin: 780 },
];

async function main() {
  console.log("🌱 Seeding Magdalene Medza database…");

  // Settings (singleton). Keep contact details in sync on every seed.
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      salonName: SALON_NAME,
      phone: SALON_PHONE,
      email: SALON_EMAIL,
      location: SALON_LOCATION,
      mpesaNumber: MPESA_NUMBER,
    },
    create: {
      id: 1,
      slotIntervalMin: 30,
      maxPerDay: 0,
      salonName: SALON_NAME,
      phone: SALON_PHONE,
      email: SALON_EMAIL,
      location: SALON_LOCATION,
      outcallFeeKes: 0,
      mpesaNumber: MPESA_NUMBER,
      depositPercent: 50,
    },
  });

  // Services
  for (const s of services) {
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: s,
      create: s,
    });
  }

  // Working hours
  for (const w of workingHours) {
    await prisma.workingHours.upsert({
      where: { dayOfWeek: w.dayOfWeek },
      update: w,
      create: w,
    });
  }

  // Admin user. Remove any other admin accounts so only this login works.
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await prisma.adminUser.upsert({
    where: { email: ADMIN_EMAIL },
    update: { passwordHash, name: "Magdalene" },
    create: {
      email: ADMIN_EMAIL,
      name: "Magdalene",
      passwordHash,
      role: "OWNER",
    },
  });
  await prisma.adminUser.deleteMany({ where: { email: { not: ADMIN_EMAIL } } });

  console.log("✅ Seed complete.");
  console.log(`   Admin login → ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
