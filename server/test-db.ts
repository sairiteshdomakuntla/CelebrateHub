import "dotenv/config";
import { prisma } from "./src/config/db.js";

async function testConnection() {
  console.log("🔍 Connecting to Neon Database...\n");

  const startTime = Date.now();

  // Execute query to test database connection and retrieve metadata
  const result = await prisma.$queryRaw<
    Array<{
      now: Date;
      current_database: string;
      version: string;
    }>
  >`SELECT NOW() as now, current_database(), version();`;

  const latencyMs = Date.now() - startTime;

  console.log("✅ SUCCESS: Database connected successfully!");
  console.log("=========================================");
  console.log("📁 Database Name :", result[0]?.current_database);
  console.log("⏱️ DB Server Time:", result[0]?.now?.toISOString());
  console.log("⚡ Query Latency  :", `${latencyMs}ms`);
  console.log("🐘 Server Version :", result[0]?.version?.split(" on ")[0]);
  console.log("=========================================\n");
}

testConnection()
  .catch((error) => {
    console.error("❌ Connection failed!");
    console.error(error.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
