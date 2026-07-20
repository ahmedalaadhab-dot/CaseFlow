import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Bootstraps a single real Owner account on a clean database — no demo
// customers/cases/service templates. Everything else (staff, service
// templates) gets created afterward through the app itself (Settings ->
// Users / Settings -> Services), now that those admin panels exist.
//
// Reads credentials from env vars rather than hardcoding them, so this
// script is safe to commit: OWNER_FIRST_NAME, OWNER_LAST_NAME, OWNER_EMAIL,
// OWNER_PASSWORD.
async function main() {
  const firstName = process.env.OWNER_FIRST_NAME;
  const lastName = process.env.OWNER_LAST_NAME;
  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;

  if (!firstName || !lastName || !email || !password) {
    console.error(
      "Missing required env vars. Set OWNER_FIRST_NAME, OWNER_LAST_NAME, OWNER_EMAIL, OWNER_PASSWORD and re-run."
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("OWNER_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  console.log(`Creating owner account for ${email}...`);
  const passwordHash = await bcrypt.hash(password, 12);

  const owner = await prisma.user.upsert({
    where: { email },
    update: { firstName, lastName, role: "OWNER", isActive: true, passwordHash },
    create: { email, passwordHash, firstName, lastName, role: "OWNER" },
  });

  console.log(`✅ Owner ready: ${owner.email} (${owner.id})`);
  console.log("   Log in, then use Settings -> Users to add staff and Settings -> Services to add workflows.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
