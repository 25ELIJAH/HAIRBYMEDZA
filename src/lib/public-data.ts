// Cached, lightweight reads for the public pages (home + booking).
//
// Service photos uploaded in the admin are stored in the database as data
// URLs (100–200 KB each). Sending those inside every page made the home page
// over 10 MB. Here photos are replaced by a short link to /api/img/service/<id>,
// which the browser downloads once and caches. Results are cached for a few
// minutes and refreshed immediately when the admin changes something
// (see the revalidateTag calls in admin-actions.ts).

import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { getSettings } from "./booking";
import { todayStr } from "./time";

export const PUBLIC_TAG = "public-data";
const TTL = 300; // seconds

export interface PublicService {
  id: string;
  name: string;
  description: string;
  category: string;
  priceKes: number;
  outCallPriceKes: number;
  durationMin: number;
  includes: string | null;
  imageUrl: string | null; // small URL, never a data URL
}

export const getPublicServices = unstable_cache(
  async (): Promise<PublicService[]> => {
    const [rows, images] = await Promise.all([
      prisma.service.findMany({
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          priceKes: true,
          outCallPriceKes: true,
          durationMin: true,
          includes: true,
        },
      }),
      // Only a fingerprint of each embedded photo leaves the database.
      prisma.$queryRaw<{ id: string; url: string | null; v: string | null }[]>`
        SELECT id,
               CASE WHEN "imageUrl" LIKE 'data:%' THEN NULL ELSE "imageUrl" END AS url,
               CASE WHEN "imageUrl" LIKE 'data:%' THEN md5("imageUrl") ELSE NULL END AS v
        FROM "Service" WHERE active = true`,
    ]);
    const img = new Map(images.map((i) => [i.id, i]));
    return rows.map((s) => {
      const i = img.get(s.id);
      const imageUrl = i?.v ? `/api/img/service/${s.id}?v=${i.v.slice(0, 12)}` : i?.url || null;
      return { ...s, imageUrl };
    });
  },
  ["public-services"],
  { tags: [PUBLIC_TAG], revalidate: TTL }
);

export const getPublicSettings = unstable_cache(async () => getSettings(), ["public-settings"], {
  tags: [PUBLIC_TAG],
  revalidate: TTL,
});

export const getPublicHours = unstable_cache(
  async () => prisma.workingHours.findMany({ orderBy: { dayOfWeek: "asc" } }),
  ["public-hours"],
  { tags: [PUBLIC_TAG], revalidate: TTL }
);

export const getUpcomingBlockedDates = unstable_cache(
  async () =>
    (
      await prisma.blockedDate.findMany({
        where: { date: { gte: todayStr() } },
        select: { date: true },
      })
    ).map((b) => b.date),
  ["public-blocked"],
  { tags: [PUBLIC_TAG], revalidate: TTL }
);
