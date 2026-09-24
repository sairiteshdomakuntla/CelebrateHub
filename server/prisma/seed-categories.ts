/**
 * Seed default service categories.
 * Run: npm run seed:categories
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  { name: "Venue",            slug: "venue",            icon: "map-pin" },
  { name: "Catering",         slug: "catering",         icon: "coffee" },
  { name: "Photography",      slug: "photography",      icon: "camera" },
  { name: "Videography",      slug: "videography",      icon: "video" },
  { name: "Decoration",       slug: "decoration",       icon: "star" },
  { name: "Sound & Lights",   slug: "sound-lights",     icon: "music" },
  { name: "Mehendi",          slug: "mehendi",          icon: "edit-3" },
  { name: "Makeup & Beauty",  slug: "makeup-beauty",    icon: "smile" },
  { name: "DJ",               slug: "dj",               icon: "disc" },
  { name: "Invitation Cards", slug: "invitation-cards", icon: "mail" },
  { name: "Transportation",   slug: "transportation",   icon: "truck" },
  { name: "Tent & Furniture", slug: "tent-furniture",   icon: "home" },
  { name: "Cake & Desserts",  slug: "cake-desserts",    icon: "gift" },
  { name: "Event Management", slug: "event-management", icon: "clipboard" },
  { name: "Other",            slug: "other",            icon: "more-horizontal" },
];

async function main() {
  console.log("Seeding service categories...");
  for (const cat of CATEGORIES) {
    await prisma.serviceCategory.upsert({
      where: { slug: cat.slug },
      update: { icon: cat.icon },
      create: { ...cat, isActive: true },
    });
    console.log(`  ✓ ${cat.name} (${cat.icon})`);
  }
  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
