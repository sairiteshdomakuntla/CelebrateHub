import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEFAULT_PLANS = [
  // Provider Plans
  {
    name: "Starter Provider",
    slug: "provider-starter",
    description: "Standard directory listing, receive up to 5 qualified leads per month.",
    price: 0,
    currency: "INR",
    interval: "MONTHLY" as const,
    isActive: true,
  },
  {
    name: "Growth Pro Monthly",
    slug: "provider-pro-monthly",
    description: "Unlimited qualified leads, instant SMS/push alerts, verified pro badge, priority search ranking.",
    price: 999,
    currency: "INR",
    interval: "MONTHLY" as const,
    isActive: true,
  },
  {
    name: "Growth Pro Annual",
    slug: "provider-pro-yearly",
    description: "All Pro benefits with 2 months free, featured showcase banner, zero lead limits.",
    price: 9990,
    currency: "INR",
    interval: "YEARLY" as const,
    isActive: true,
  },

  // Customer Plans
  {
    name: "Standard Member",
    slug: "customer-standard",
    description: "Plan celebrations, receive quotes from verified local providers.",
    price: 0,
    currency: "INR",
    interval: "MONTHLY" as const,
    isActive: true,
  },
  {
    name: "Celebrate Club Monthly",
    slug: "customer-club-monthly",
    description: "Unlimited RSVP tracking, custom WhatsApp & SMS invitations, personal event concierge.",
    price: 399,
    currency: "INR",
    interval: "MONTHLY" as const,
    isActive: true,
  },
  {
    name: "Celebrate Club Annual",
    slug: "customer-club-yearly",
    description: "Annual VIP access for all family celebrations, premium invitation designer, priority provider matching.",
    price: 3499,
    currency: "INR",
    interval: "YEARLY" as const,
    isActive: true,
  },
];

async function main() {
  console.log("Seeding subscription plans...");
  for (const plan of DEFAULT_PLANS) {
    const p = await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        interval: plan.interval,
        isActive: plan.isActive,
      },
      create: plan,
    });
    console.log(`  ✓ ${p.name} (₹${p.price}/${p.interval.toLowerCase()})`);
  }
  console.log("Subscription plans seeded successfully.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
