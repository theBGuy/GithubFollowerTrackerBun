# GitHub Follower Tracker

A powerful GitHub follower monitoring application built with Bun that tracks follower changes and sends notifications via Email, Slack, and/or Discord.

## Features

- 📊 **Monitor GitHub Followers**: Track followers for any GitHub user or organization
- 🔔 **Multi-Channel Notifications**: Send alerts via Email, Slack, Discord, or any combination
- ⏰ **Scheduled Checks**: Configurable cron schedule for automatic monitoring
- 📈 **Change Detection**: Identifies new followers and unfollowers
- 💾 **Persistent Storage**: Saves follower data locally for change comparison
- 🚀 **Built with Bun**: Fast and efficient JavaScript runtime

## Installation

1. Clone this repository
2. Install dependencies:

```bash
bun install
```

3. Copy the example environment file and configure it:

```bash
cp .env.example .env
```

4. Edit `.env` with your configuration (see Configuration section below)

## Configuration

### GitHub Settings

- `GITHUB_TOKEN`: Your GitHub personal access token ([Create one here](https://github.com/settings/tokens))
- `GITHUB_USERNAME`: The GitHub username or organization to monitor
- `GITHUB_IS_ORG`: Set to `true` if monitoring an organization (default: `false`)

### Notification Channels

Enable at least one notification channel by setting it to `true`:

- `ENABLE_EMAIL`: Enable email notifications
- `ENABLE_SLACK`: Enable Slack notifications
- `ENABLE_DISCORD`: Enable Discord notifications

### Email Configuration (if enabled)

- `EMAIL_HOST`: SMTP server (e.g., `smtp.gmail.com`)
- `EMAIL_PORT`: SMTP port (default: `587`)
- `EMAIL_SECURE`: Use TLS (default: `false`)
- `EMAIL_USER`: Your email address
- `EMAIL_PASSWORD`: Your email password or app-specific password
- `EMAIL_FROM`: Sender email address
- `EMAIL_TO`: Recipient email address

**Gmail Users**: You'll need to create an [App Password](https://support.google.com/accounts/answer/185833) instead of using your regular password.

### Slack Configuration (if enabled)

- `SLACK_WEBHOOK_URL`: Your Slack webhook URL ([Create one here](https://api.slack.com/messaging/webhooks))

### Discord Configuration (if enabled)

- `DISCORD_WEBHOOK_URL`: Your Discord webhook URL ([Create one here](https://support.discord.com/hc/en-us/articles/228383668))

### Scheduling

- `CHECK_INTERVAL`: Cron expression for check frequency (default: `0 * * * *` - every hour)

Common cron patterns:
- `0 * * * *` - Every hour
- `0 */6 * * *` - Every 6 hours
- `0 0 * * *` - Every day at midnight
- `*/30 * * * *` - Every 30 minutes

### Storage

- `DATA_FILE`: Path to store follower data (default: `followers.json`)

## Usage

Run the tracker:

```bash
bun run index.ts
```

The application will:
1. Perform an initial follower check
2. Schedule periodic checks based on your `CHECK_INTERVAL`
3. Send notifications when changes are detected
4. Continue running until you stop it (Ctrl+C)

## Output

The tracker provides detailed console output including:
- Follower check timestamps
- Number of followers fetched
- New followers detected
- Unfollowers detected
- Notification status for each channel

Example output:
```
🚀 GitHub Follower Tracker Started
==================================================
📊 Monitoring: @yourusername
⏰ Schedule: 0 * * * *
📬 Notifications: Email, Slack, Discord
==================================================

[12/29/2025, 10:00:00 AM] Starting follower check...
✓ Fetched 150 followers for yourusername

==================================================
FOLLOWER CHANGES DETECTED
==================================================

🎉 New Followers (2):
  • @newuser1 (https://github.com/newuser1)
  • @newuser2 (https://github.com/newuser2)

👋 Unfollowers (1):
  • @olduser (https://github.com/olduser)
==================================================

✓ Email notification sent
✓ Slack notification sent
✓ Discord notification sent
✓ Saved follower data to followers.json
✓ Follower check completed successfully
```

## Project Structure

```
.
├── src/
│   ├── types.ts      # TypeScript type definitions
│   ├── config.ts     # Configuration loader and validator
│   ├── github.ts     # GitHub API integration
│   ├── notifier.ts   # Multi-channel notification service
│   └── tracker.ts    # Follower change detection and storage
├── index.ts          # Main application entry point
├── .env.example      # Example environment configuration
├── package.json      # Dependencies
└── README.md         # This file
```

## Troubleshooting

### GitHub API Rate Limits

GitHub's API has rate limits. With authentication:
- 5,000 requests per hour for authenticated requests

The tracker uses pagination efficiently, but if you're monitoring very large accounts, be mindful of these limits.

### Email Issues

If email notifications aren't working:
- Verify your SMTP settings
- For Gmail, ensure you're using an App Password
- Check if your email provider requires additional security settings

### Webhook Issues

- Verify your webhook URLs are correct
- Check webhook permissions in Slack/Discord
- Ensure webhooks haven't been revoked

## License

This project was created using `bun init` in bun v1.3.5. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

