import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  console.log("Seeding Gift Circle sample items & blessings...");

  // Find an event
  let event = await prisma.event.findFirst({
    include: { customer: true },
  });

  if (!event) {
    console.log("No existing event found, finding or creating customer...");
    let customer = await prisma.user.findFirst({ where: { role: "CUSTOMER" } });
    if (!customer) {
      customer = await prisma.user.create({
        data: {
          name: "Ananya Sharma",
          email: "ananya.sharma@example.com",
          role: "CUSTOMER",
          status: "ACTIVE",
        },
      });
    }

    event = await prisma.event.create({
      data: {
        customerId: customer.id,
        title: "Aarav & Ananya's Royal Wedding",
        type: "WEDDING",
        eventDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        location: "The Leela Palace, Udaipur",
        budgetMin: 500000,
        budgetMax: 1200000,
        requirements: "Looking for premium decor, candid photography and luxury catering.",
        status: "PUBLISHED",
      },
      include: { customer: true },
    });
    console.log("Created sample event:", event.title);
  } else {
    console.log("Using existing event:", event.title, "(ID:", event.id, ")");
  }

  // Check if items already seeded for this event
  const existingCount = await prisma.giftItem.count({ where: { eventId: event.id } });
  if (existingCount > 0) {
    console.log(`Event already has ${existingCount} gift items. Seeding complete!`);
    return;
  }

  // 1. Honeymoon Cash Fund (Group Gift)
  const honeymoon = await prisma.giftItem.create({
    data: {
      eventId: event.id,
      title: "Honeymoon & Romantic Getaway Fund",
      description: "Help us make unforgettable memories on our honeymoon trip to the Amalfi Coast! Any contribution warms our hearts.",
      category: "CASH_FUND",
      targetAmount: 75000,
      collectedAmount: 32000,
      isGroupGift: true,
      priority: "HIGH",
      status: "AVAILABLE",
    },
  });

  // 2. Kitchen Espresso Machine (Single Item - Claimed)
  await prisma.giftItem.create({
    data: {
      eventId: event.id,
      title: "De'Longhi Magnifica Espresso Machine",
      description: "For our morning coffees together! Color: Titanium Silver.",
      category: "KITCHEN",
      targetAmount: 34999,
      collectedAmount: 0,
      isGroupGift: false,
      priority: "HIGH",
      status: "CLAIMED",
      claimedBy: "Vikram & Sunita Mehra",
      claimedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      externalUrl: "https://amazon.in",
    },
  });

  // 3. Smart Home Audio (Available)
  await prisma.giftItem.create({
    data: {
      eventId: event.id,
      title: "Marshall Stanmore III Wireless Speaker",
      description: "Iconic sound for our new living room.",
      category: "GADGETS",
      targetAmount: 31999,
      collectedAmount: 0,
      isGroupGift: false,
      priority: "MEDIUM",
      status: "AVAILABLE",
      externalUrl: "https://amazon.in",
    },
  });

  // 4. Luxury Cookware Set (Group Gift)
  const cookware = await prisma.giftItem.create({
    data: {
      eventId: event.id,
      title: "Le Creuset Enameled Cast Iron Cookware Set",
      description: "Cerise Red 5-Piece Dutch oven & skillet set for a lifetime of cooking.",
      category: "HOME",
      targetAmount: 48000,
      collectedAmount: 18000,
      isGroupGift: true,
      priority: "MEDIUM",
      status: "AVAILABLE",
      externalUrl: "https://lecreuset.co.in",
    },
  });

  // 5. Couple's Spa Experience (Available)
  await prisma.giftItem.create({
    data: {
      eventId: event.id,
      title: "Luxury Couple Ayurvedic Spa Experience",
      description: "A calming day of traditional rejuvenation post-wedding festivities.",
      category: "EXPERIENCE",
      targetAmount: 12000,
      collectedAmount: 0,
      isGroupGift: false,
      priority: "LOW",
      status: "AVAILABLE",
    },
  });

  // Seed sample contributions & blessings
  await prisma.giftContribution.createMany({
    data: [
      {
        eventId: event.id,
        giftItemId: honeymoon.id,
        contributorName: "Rohan & Sneha Kapoor",
        contributorEmail: "rohan@example.com",
        amount: 15000,
        message: "Wishing you both endless sunsets and incredible adventures on your travels! Love you both lots! 🎉❤️",
        paymentStatus: "PAID",
        isAnonymous: false,
        thanked: true,
      },
      {
        eventId: event.id,
        giftItemId: honeymoon.id,
        contributorName: "Uncle Dev & Neena Aunty",
        amount: 12000,
        message: "May God bless this beautiful union with joy, peace, and abundance. Have a fantastic honeymoon!",
        paymentStatus: "PAID",
        isAnonymous: false,
        thanked: false,
      },
      {
        eventId: event.id,
        giftItemId: honeymoon.id,
        contributorName: "Well-Wisher",
        amount: 5000,
        message: "Heartiest congratulations! May your bond grow stronger with each passing day. 🌸",
        paymentStatus: "PAID",
        isAnonymous: true,
        thanked: true,
      },
      {
        eventId: event.id,
        giftItemId: cookware.id,
        contributorName: "Pooja & Siddharth",
        amount: 18000,
        message: "Can't wait to come over for Sunday dinners! Congratulations on building your new home! 🥂✨",
        paymentStatus: "PAID",
        isAnonymous: false,
        thanked: false,
      },
    ],
  });

  console.log("Successfully seeded Gift Circle items & blessings!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
