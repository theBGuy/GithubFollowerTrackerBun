import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const MAX_FOLLOWERS = parseInt(process.env.MAX_FOLLOWERS ?? "1000", 10);
const GITHUB_HEADERS: Record<string, string> = {
  Accept: "application/vnd.github.v3+json",
  "User-Agent": "Bun",
  "X-GitHub-Api-Version": "2022-11-28",
};

if (process.env.GITHUB_TOKEN) {
  GITHUB_HEADERS.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

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

function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match?.at(1) ?? null;
}

async function fetchUserProfile(
  username: string,
): Promise<{ followers: number }> {
  const response = await fetch(`https://api.github.com/users/${username}`, {
    headers: GITHUB_HEADERS,
  });
  return response.json() as Promise<{ followers: number }>;
}

async function fetchLastPageFollowers(
  username: string,
  totalCount: number,
): Promise<GithubFollower[]> {
  const lastPage = Math.ceil(totalCount / 100) || 1;
  const response = await fetch(
    `https://api.github.com/users/${username}/followers?per_page=100&page=${lastPage}`,
    { headers: GITHUB_HEADERS },
  );
  return response.json() as Promise<GithubFollower[]>;
}

async function fetchAllFollowers(username: string): Promise<GithubFollower[]> {
  const followers: GithubFollower[] = [];
  let url: string | null =
    `https://api.github.com/users/${username}/followers?per_page=100`;

  while (url && followers.length < MAX_FOLLOWERS) {
    const response = await fetch(url, { headers: GITHUB_HEADERS });
    const page = (await response.json()) as GithubFollower[];
    followers.push(...page);
    url = parseNextLink(response.headers.get("link") ?? null);
  }

  if (followers.length >= MAX_FOLLOWERS) {
    console.log(
      `${username}: hit MAX_FOLLOWERS limit (${MAX_FOLLOWERS}), results may be incomplete`,
    );
    return followers.slice(0, MAX_FOLLOWERS);
  }

  return followers;
}

async function processUser(user: {
  id: string;
  githubUsername: string;
  webhook_url: string;
}) {
  console.log(`Processing user: ${user.githubUsername}`);

  const [existingCount, profile] = await Promise.all([
    prisma.follower.count({ where: { userId: user.id } }),
    fetchUserProfile(user.githubUsername),
  ]);

  const githubCount = profile.followers;
  console.log(
    `${user.githubUsername}: ${existingCount} stored, ${githubCount} on GitHub`,
  );

  const isFirstRun = existingCount === 0;

  // Quick check: if counts match, check last page for new followers
  if (existingCount === githubCount && !isFirstRun) {
    const lastPage = await fetchLastPageFollowers(
      user.githubUsername,
      githubCount,
    );
    const existingIds = await prisma.follower.findMany({
      where: { userId: user.id },
      select: { githubId: true },
    });
    const existingIdSet = new Set(existingIds.map((f) => f.githubId));
    const hasNewFollowers = lastPage.some(
      (f) => !existingIdSet.has(String(f.id)),
    );

    if (!hasNewFollowers) {
      console.log(`${user.githubUsername}: no change, skipping`);
      return;
    }
    console.log(
      `${user.githubUsername}: count unchanged but detected new followers, checking for unfollows`,
    );
  }

  const [existingFollowers, followers] = await Promise.all([
    prisma.follower.findMany({ where: { userId: user.id } }),
    fetchAllFollowers(user.githubUsername),
  ]);

  console.log(`${user.githubUsername}: fetched ${followers.length} followers`);

  const existingFollowerIds = new Set(existingFollowers.map((f) => f.githubId));
  const currentFollowerIds = new Set(followers.map((f) => String(f.id)));
  const newFollowers = followers.filter(
    (f) => !existingFollowerIds.has(String(f.id)),
  );
  const lostFollowers = existingFollowers.filter(
    (f) => !currentFollowerIds.has(f.githubId),
  );

  if (newFollowers.length === 0 && lostFollowers.length === 0) {
    return;
  }

  console.log(
    `${user.githubUsername}: +${newFollowers.length} new, -${lostFollowers.length} lost`,
  );

  const dbOps: Promise<unknown>[] = [];
  if (newFollowers.length > 0) {
    dbOps.push(
      prisma.follower.createMany({
        data: newFollowers.map((follower) => ({
          githubId: String(follower.id),
          username: follower.login,
          avatar_url: follower.avatar_url,
          userId: user.id,
        })),
      }),
    );
  }
  if (lostFollowers.length > 0) {
    dbOps.push(
      prisma.follower.deleteMany({
        where: { id: { in: lostFollowers.map((f) => f.id) } },
      }),
    );
  }
  await Promise.all(dbOps);

  if (isFirstRun) {
    console.log(`First run for ${user.githubUsername}, skipping webhook`);
    return;
  }

  if (!user.webhook_url) return;

  const isDiscord = user.webhook_url.includes("discord.com/api/webhooks");
  const isSlack = user.webhook_url.includes("hooks.slack.com");
  const gainedNames = newFollowers.map((f) => f.login);
  const lostNames = lostFollowers.map((f) => f.username);

  let payload: object;

  if (isDiscord) {
    const embeds = [];
    if (gainedNames.length > 0) {
      embeds.push({
        title: "🎉 New Followers",
        description: gainedNames
          .map((name) => `• [${name}](https://github.com/${name})`)
          .join("\n"),
        color: 0x57f287,
      });
    }
    if (lostNames.length > 0) {
      embeds.push({
        title: "👋 Lost Followers",
        description: lostNames
          .map((name) => `• [${name}](https://github.com/${name})`)
          .join("\n"),
        color: 0xed4245,
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
          text: `*🎉 New Followers*\n${gainedNames.map((name) => `• <https://github.com/${name}|${name}>`).join("\n")}`,
        },
      });
    }
    if (lostNames.length > 0) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*👋 Lost Followers*\n${lostNames.map((name) => `• <https://github.com/${name}|${name}>`).join("\n")}`,
        },
      });
    }
    payload = { blocks };
  } else {
    payload = {
      text: `GitHub Follower Update for ${user.githubUsername}`,
      gained: gainedNames,
      lost: lostNames,
    };
  }

  try {
    await fetch(user.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    console.log(`Webhook sent for ${user.githubUsername}`);
  } catch (error) {
    console.error(`Webhook failed for ${user.githubUsername}:`, error);
  }
}

async function main() {
  console.time("Total Processing Time");
  const users = await prisma.user.findMany();
  await Promise.all(users.map(processUser));
}

main()
  .then(() => {
    console.log("Done!");
  })
  .catch((error) => {
    console.error("Error in main function:", error);
  })
  .finally(() => {
    prisma.$disconnect();
    console.timeEnd("Total Processing Time");
    console.log("Run complete at ", new Date().toISOString());
  });
