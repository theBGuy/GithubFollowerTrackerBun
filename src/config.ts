import type { Config } from "./types";

export function loadConfig(): Config {
  const config: Config = {
    // GitHub settings
    githubToken: process.env.GITHUB_TOKEN || "",
    githubUsername: process.env.GITHUB_USERNAME || "",
    isOrganization: process.env.GITHUB_IS_ORG === "true",

    // Notification channels
    notifications: {
      email: process.env.ENABLE_EMAIL === "true",
      slack: process.env.ENABLE_SLACK === "true",
      discord: process.env.ENABLE_DISCORD === "true",
    },

    // Email settings
    emailHost: process.env.EMAIL_HOST,
    emailPort: process.env.EMAIL_PORT ? parseInt(process.env.EMAIL_PORT) : 587,
    emailSecure: process.env.EMAIL_SECURE === "true",
    emailUser: process.env.EMAIL_USER,
    emailPassword: process.env.EMAIL_PASSWORD,
    emailFrom: process.env.EMAIL_FROM,
    emailTo: process.env.EMAIL_TO,

    // Slack settings
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,

    // Discord settings
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,

    // Scheduling
    checkInterval: process.env.CHECK_INTERVAL || "0 * * * *", // Default: every hour

    // Database
    databaseUrl: process.env.DATABASE_URL,
  };

  // Validation
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }
  if (!config.githubToken) {
    throw new Error("GITHUB_TOKEN is required");
  }
  if (!config.githubUsername) {
    throw new Error("GITHUB_USERNAME is required");
  }

  const hasAnyNotification =
    config.notifications.email ||
    config.notifications.slack ||
    config.notifications.discord;

  if (!hasAnyNotification) {
    throw new Error("At least one notification channel must be enabled");
  }

  // Validate email settings
  if (config.notifications.email) {
    if (!config.emailHost || !config.emailUser || !config.emailPassword || !config.emailTo) {
      throw new Error("Email notifications enabled but email settings are incomplete");
    }
  }

  // Validate Slack settings
  if (config.notifications.slack && !config.slackWebhookUrl) {
    throw new Error("Slack notifications enabled but SLACK_WEBHOOK_URL is not set");
  }

  // Validate Discord settings
  if (config.notifications.discord && !config.discordWebhookUrl) {
    throw new Error("Discord notifications enabled but DISCORD_WEBHOOK_URL is not set");
  }

  return config;
}
