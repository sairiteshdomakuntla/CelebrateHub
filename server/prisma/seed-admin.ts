/**
 * Seed script — creates the first platform admin
 * Run once: npx tsx prisma/seed-admin.ts
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = "superadmin@celebratehub.com";
  const password = "Admin@Secure99";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email} (role: ${existing.role})`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await prisma.user.create({
    data: {
      name: "Super Admin",
      email,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("✅ Admin created:");
  console.log(`   Email   : ${admin.email}`);
  console.log(`   Password: ${password}`);
  console.log(`   Role    : ${admin.role}`);
  console.log(`   ID      : ${admin.id}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
