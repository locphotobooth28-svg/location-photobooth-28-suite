const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL absente");
}

const pool =
  global.__lp28Pool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
  });

pool.on("error", (err) => {
  console.error("Erreur Pool PostgreSQL :", err.message);
});

const adapter = new PrismaPg(pool);

const prisma =
  global.__lp28Prisma ||
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  global.__lp28Pool = pool;
  global.__lp28Prisma = prisma;
}

module.exports = prisma;
