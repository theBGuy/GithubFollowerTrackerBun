import cron from "node-cron";
import { loadConfig } from "./src/config";
import { GitHubService } from "./src/github";
import { FollowerTracker } from "./src/tracker";
import { Notifier } from "./src/notifier";

async function checkFollowers() {
  console.log(`\n[${new Date().toLocaleString()}] Starting follower check...`);

  try {
    const config = loadConfig();
    const github = new GitHubService(
      config.githubToken,
      config.githubUsername,
      config.isOrganization
    );
    const tracker = new FollowerTracker(config.githubUsername);
    const notifier = new Notifier(config);

    // Fetch current followers
    const currentFollowers = await github.getFollowers();

    // Load previous data
    const previousFollowers = await tracker.loadPreviousData();

    if (previousFollowers) {
      // Compare and detect changes
      const changes = tracker.detectChanges(
        previousFollowers,
        currentFollowers
      );

      tracker.printChangeSummary(changes);

      // Send notifications if there are changes
      if (changes.newFollowers.length > 0 || changes.unfollowers.length > 0) {
        await notifier.notify(changes);
      }
    } else {
      console.log("✓ First run - no previous data to compare");
      console.log(`  Current follower count: ${currentFollowers.length}`);
    }

    // Save current data for next check
    await tracker.saveCurrentData(currentFollowers);

    console.log(`✓ Follower check completed successfully\n`);
  } catch (error) {
    console.error("✗ Error during follower check:", error);
    throw error;
  }
}

async function main() {
  console.log("🚀 GitHub Follower Tracker Started");
  console.log("=" .repeat(50));

  try {
    const config = loadConfig();
    console.log(`📊 Monitoring: @${config.githubUsername}`);
    console.log(`⏰ Schedule: ${config.checkInterval}`);
    
    const enabledChannels = [];
    if (config.notifications.email) enabledChannels.push("Email");
    if (config.notifications.slack) enabledChannels.push("Slack");
    if (config.notifications.discord) enabledChannels.push("Discord");
    console.log(`📬 Notifications: ${enabledChannels.join(", ")}`);
    console.log("=" .repeat(50));

    // Run initial check
    await checkFollowers();

    // Schedule periodic checks
    console.log(`\n⏳ Waiting for next scheduled check...`);
    cron.schedule(config.checkInterval, async () => {
      try {
        await checkFollowers();
      } catch (error) {
        console.error("Error in scheduled check:", error);
      }
    });

    // Keep the process running
    process.on("SIGINT", () => {
      console.log("\n\n👋 Shutting down gracefully...");
      process.exit(0);
    });
  } catch (error) {
    console.error("✗ Fatal error:", error);
    process.exit(1);
  }
}

main();