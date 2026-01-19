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

async function main() {
  const users = await prisma.user.findMany();

  for (const user of users) {
    console.log(`Fetching followers for User: ${user.githubUsername}`);
    const existingFollowers = await prisma.follower.findMany({
      where: { userId: user.id }
    });
    console.log(`Existing followers for ${user.githubUsername}: ${existingFollowers.length}`);
    const isFirstRun = existingFollowers.length === 0;
    const response = await fetch(`https://api.github.com/users/${user.githubUsername}/followers`, {
      headers: {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Bun",
        "X-GitHub-Api-Version": "2022-11-28"
      }
    });
    const followers = await response.json() as GithubFollower[];
    console.log(`Fetched ${followers.length} followers for ${user.githubUsername}`);
    // now check if we've gained or lost followers since the last time we checked
    const existingFollowerIds = new Set(existingFollowers.map(f => f.githubId));
    const newFollowers = followers.filter(f => !existingFollowerIds.has(String(f.id)));
    const lostFollowers = existingFollowers.filter(f => !followers.some(g => String(g.id) === f.githubId));

    console.log(`New followers for ${user.githubUsername}: ${newFollowers.length}`);
    console.log(`Lost followers for ${user.githubUsername}: ${lostFollowers.length}`);

    for (const follower of newFollowers) {
      await prisma.follower.create({
        data: {
          githubId: String(follower.id),
          username: follower.login,
          avatar_url: follower.avatar_url,
          userId: user.id
        }
      });
    }

    for (const lostFollower of lostFollowers) {
      await prisma.follower.delete({
        where: {
          id: lostFollower.id
        }
      });
    }

    if (newFollowers.length > 0 || lostFollowers.length > 0) {
      console.log(`Updated followers for ${user.githubUsername}: ${newFollowers.length} new, ${lostFollowers.length} lost`);

      if (isFirstRun) {
        console.log(`First run for ${user.githubUsername}, skipping webhook notification`);
      } else if (user.webhook_url) {
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
              color: 0x57f287 // green
            });
          }

          if (lostNames.length > 0) {
            embeds.push({
              title: "👋 Lost Followers",
              description: lostNames.map(name => `• [${name}](https://github.com/${name})`).join("\n"),
              color: 0xed4245 // red
            });
          }

          payload = {
            username: "GitHub Follower Tracker",
            embeds
          };
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
          // Generic webhook payload
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
          console.error(`Failed to send webhook for ${user.githubUsername}:`, error);
        }
      }
    }
  }
}

main().then(() => {
  console.log("Done!");
}).catch((error) => {
  console.error("Error in main function:", error);
}).finally(() => {
  prisma.$disconnect();
});