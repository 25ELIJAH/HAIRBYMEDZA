// Runs during the Vercel build. On production deployments it creates any new
// tables/columns with `prisma db push` (which refuses to drop data). Preview
// deployments are skipped: they must never change the live database, and
// they often have no database variables at all.
import { execSync } from "node:child_process";

const env = process.env.VERCEL_ENV;
const hasDb = !!process.env.DATABASE_URL && !!process.env.DIRECT_URL;

if (env && env !== "production") {
  console.log(`[db-sync] Skipping schema sync on a ${env} deployment.`);
} else if (!hasDb) {
  console.log("[db-sync] DATABASE_URL / DIRECT_URL not set, skipping schema sync.");
} else {
  console.log("[db-sync] Syncing database schema (prisma db push)...");
  execSync("npx prisma db push --skip-generate", { stdio: "inherit" });
}
