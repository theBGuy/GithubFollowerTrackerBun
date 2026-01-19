export interface Follower {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
}

export interface FollowerChange {
  newFollowers: Follower[];
  unfollowers: Follower[];
}

export interface NotificationChannel {
  email?: boolean;
  slack?: boolean;
  discord?: boolean;
}

export interface Config {
  // GitHub settings
  githubToken: string;
  githubUsername: string;
  isOrganization?: boolean;

  // Notification channels
  notifications: NotificationChannel;

  // Email settings
  emailHost?: string;
  emailPort?: number;
  emailSecure?: boolean;
  emailUser?: string;
  emailPassword?: string;
  emailFrom?: string;
  emailTo?: string;

  // Slack settings
  slackWebhookUrl?: string;

  // Discord settings
  discordWebhookUrl?: string;

  // Scheduling
  checkInterval: string; // cron expression, default: every hour
  
  // Database
  databaseUrl?: string;
}

export interface FollowerData {
  lastChecked: string;
  followers: Follower[];
}
