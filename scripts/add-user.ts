import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { parseArgs } from "util";

const { values } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    user: { type: "string", short: "u" },
    webhook: { type: "string", short: "w" }
  }
});

if (!values.user) {
  console.error("Usage: bun run scripts/add-user.ts --user <github-username> [--webhook <webhook-url>]");
  process.exit(1);
}

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

try {
  const user = await prisma.user.create({
    data: {
      githubUsername: values.user,
      webhook_url: values.webhook ?? ""
    }
  });
  console.log(`Created user: ${user.githubUsername} (${user.id})`);
} catch (error) {
  if ((error as any)?.code === "P2002") {
    console.error(`User "${values.user}" already exists`);
  } else {
    throw error;
  }
} finally {
  await prisma.$disconnect();
}
