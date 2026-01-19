import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

console.log("Hello via Bun!");

type GithubFollower = {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  user_view_type: string;
  site_admin: boolean;
};

async function processUser(user: { id: string; githubUsername: string; webhook_url: string }) {
  console.log(`Processing user: ${user.githubUsername}`);

  const [existingFollowers, response] = await Promise.all([
    prisma.follower.findMany({ where: { userId: user.id } }),
    fetch(`https://api.github.com/users/${user.githubUsername}/followers`, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Bun",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    })
  ]);

  const isFirstRun = existingFollowers.length === 0;
  const followers = await response.json() as GithubFollower[];
  console.log(`${user.githubUsername}: ${existingFollowers.length} existing, ${followers.length} current`);

  const existingFollowerIds = new Set(existingFollowers.map(f => f.githubId));
  const currentFollowerIds = new Set(followers.map(f => String(f.id)));
  const newFollowers = followers.filter(f => !existingFollowerIds.has(String(f.id)));
  const lostFollowers = existingFollowers.filter(f => !currentFollowerIds.has(f.githubId));

  if (newFollowers.length === 0 && lostFollowers.length === 0) {
    return;
  }

  console.log(`${user.githubUsername}: +${newFollowers.length} new, -${lostFollowers.length} lost`);

  const dbOps: Promise<unknown>[] = [];
  if (newFollowers.length > 0) {
    dbOps.push(prisma.follower.createMany({
      data: newFollowers.map(follower => ({
        githubId: String(follower.id),
        username: follower.login,
        avatar_url: follower.avatar_url,
        userId: user.id
      }))
    }));
  }
  if (lostFollowers.length > 0) {
    dbOps.push(prisma.follower.deleteMany({
      where: { id: { in: lostFollowers.map(f => f.id) } }
    }));
  }
  await Promise.all(dbOps);

  if (isFirstRun) {
    console.log(`First run for ${user.githubUsername}, skipping webhook`);
    return;
  }

  if (!user.webhook_url) return;

  const isDiscord = user.webhook_url.includes("discord.com/api/webhooks");
  const isSlack = user.webhook_url.includes("hooks.slack.com");
  const gainedNames = newFollowers.map(f => f.login);
  const lostNames = lostFollowers.map(f => f.username);

  let payload: object;

  if (isDiscord) {
    const embeds = [];
    if (gainedNames.length > 0) {
      embeds.push({
        title: "🎉 New Followers",
        description: gainedNames.map(name => `• [${name}](https://github.com/${name})`).join("\n"),
        color: 0x57f287
      });
    }
    if (lostNames.length > 0) {
      embeds.push({
        title: "👋 Lost Followers",
        description: lostNames.map(name => `• [${name}](https://github.com/${name})`).join("\n"),
        color: 0xed4245
      });
    }
    payload = { username: "GitHub Follower Tracker", embeds };
  } else if (isSlack) {
    const blocks = [];
    if (gainedNames.length > 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*🎉 New Followers*\n${gainedNames.map(name => `• <https://github.com/${name}|${name}>`).join("\n")}`
        }
      });
    }
    if (lostNames.length > 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*👋 Lost Followers*\n${lostNames.map(name => `• <https://github.com/${name}|${name}>`).join("\n")}`
        }
      });
    }
    payload = { blocks };
  } else {
    payload = {
      text: `GitHub Follower Update for ${user.githubUsername}`,
      gained: gainedNames,
      lost: lostNames
    };
  }

  try {
    await fetch(user.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    console.log(`Webhook sent for ${user.githubUsername}`);
  } catch (error) {
    console.error(`Webhook failed for ${user.githubUsername}:`, error);
  }
}

async function main() {
  const users = await prisma.user.findMany();
  await Promise.all(users.map(processUser));
}

main().then(() => {
  console.log("Done!");
}).catch((error) => {
  console.error("Error in main function:", error);
}).finally(() => {
  prisma.$disconnect();
});