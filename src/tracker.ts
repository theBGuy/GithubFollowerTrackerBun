import prisma from "./db";
import type { Follower, FollowerChange } from "./types";

export class FollowerTracker {
  private username: string;

  constructor(username: string) {
    this.username = username;
  }

  async loadPreviousData(): Promise<Follower[] | null> {
    try {
      // Get the latest snapshot for this username
      const config = await prisma.monitorConfig.findUnique({
        where: { username: this.username },
      });

      if (!config) {
        return null;
      }

      // Get all followers from the latest snapshot
      const snapshots = await prisma.followerSnapshot.findMany({
        where: {
          username: this.username,
          snapshotDate: config.lastChecked,
        },
        include: {
          follower: true,
        },
      });

      return snapshots.map((snapshot) => ({
        login: snapshot.follower.login,
        id: snapshot.follower.githubId,
        avatar_url: snapshot.follower.avatarUrl,
        html_url: snapshot.follower.htmlUrl,
      }));
    } catch (error) {
      console.error("Error loading previous follower data:", error);
      return null;
    }
  }

  async saveCurrentData(followers: Follower[]): Promise<void> {
    try {
      const now = new Date();

      // Upsert all followers
      for (const follower of followers) {
        await prisma.follower.upsert({
          where: { githubId: follower.id },
          update: {
            login: follower.login,
            avatarUrl: follower.avatar_url,
            htmlUrl: follower.html_url,
          },
          create: {
            githubId: follower.id,
            login: follower.login,
            avatarUrl: follower.avatar_url,
            htmlUrl: follower.html_url,
          },
        });
      }

      // Create snapshots for all current followers
      const followerRecords = await prisma.follower.findMany({
        where: {
          githubId: { in: followers.map((f) => f.id) },
        },
      });

      await prisma.followerSnapshot.createMany({
        data: followerRecords.map((follower) => ({
          username: this.username,
          followerId: follower.id,
          snapshotDate: now,
        })),
      });

      // Update or create monitor config
      await prisma.monitorConfig.upsert({
        where: { username: this.username },
        update: {
          lastChecked: now,
          followerCount: followers.length,
        },
        create: {
          username: this.username,
          lastChecked: now,
          followerCount: followers.length,
        },
      });

      console.log(`✓ Saved ${followers.length} followers to database`);
    } catch (error) {
      console.error("Error saving follower data:", error);
      throw error;
    }
  }

  detectChanges(
    previousFollowers: Follower[],
    currentFollowers: Follower[]
  ): FollowerChange {
    const previousIds = new Set(previousFollowers.map((f) => f.id));
    const currentIds = new Set(currentFollowers.map((f) => f.id));

    // Find new followers
    const newFollowers = currentFollowers.filter(
      (follower) => !previousIds.has(follower.id)
    );

    // Find unfollowers
    const unfollowers = previousFollowers.filter(
      (follower) => !currentIds.has(follower.id)
    );

    return {
      newFollowers,
      unfollowers,
    };
  }

  printChangeSummary(changes: FollowerChange): void {
    console.log("\n" + "=".repeat(50));
    console.log("FOLLOWER CHANGES DETECTED");
    console.log("=".repeat(50));

    if (changes.newFollowers.length > 0) {
      console.log(`\n🎉 New Followers (${changes.newFollowers.length}):`);
      changes.newFollowers.forEach((follower) => {
        console.log(`  • @${follower.login} (${follower.html_url})`);
      });
    }

    if (changes.unfollowers.length > 0) {
      console.log(`\n👋 Unfollowers (${changes.unfollowers.length}):`);
      changes.unfollowers.forEach((follower) => {
        console.log(`  • @${follower.login} (${follower.html_url})`);
      });
    }

    if (changes.newFollowers.length === 0 && changes.unfollowers.length === 0) {
      console.log("\n✓ No changes detected");
    }

    console.log("=".repeat(50) + "\n");
  }
}
