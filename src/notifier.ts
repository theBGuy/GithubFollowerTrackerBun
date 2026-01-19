import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { IncomingWebhook } from "@slack/webhook";
import type { Config, FollowerChange } from "./types";

export class Notifier {
  private config: Config;
  private emailTransporter?: Transporter;
  private slackWebhook?: IncomingWebhook;

  constructor(config: Config) {
    this.config = config;
    this.initializeNotifiers();
  }

  private initializeNotifiers() {
    // Initialize email
    if (this.config.notifications.email && this.config.emailHost) {
      this.emailTransporter = nodemailer.createTransport({
        host: this.config.emailHost,
        port: this.config.emailPort || 587,
        secure: this.config.emailSecure || false,
        auth: {
          user: this.config.emailUser,
          pass: this.config.emailPassword,
        },
      });
    }

    // Initialize Slack
    if (this.config.notifications.slack && this.config.slackWebhookUrl) {
      this.slackWebhook = new IncomingWebhook(this.config.slackWebhookUrl);
    }
  }

  async notify(changes: FollowerChange): Promise<void> {
    const hasChanges = changes.newFollowers.length > 0 || changes.unfollowers.length > 0;

    if (!hasChanges) {
      console.log("No changes detected, skipping notifications");
      return;
    }

    const promises: Promise<void>[] = [];

    if (this.config.notifications.email && this.emailTransporter) {
      promises.push(this.sendEmail(changes));
    }

    if (this.config.notifications.slack && this.slackWebhook) {
      promises.push(this.sendSlack(changes));
    }

    if (this.config.notifications.discord && this.config.discordWebhookUrl) {
      promises.push(this.sendDiscord(changes));
    }

    await Promise.all(promises);
  }

  private async sendEmail(changes: FollowerChange): Promise<void> {
    if (!this.emailTransporter) return;

    const subject = `GitHub Follower Update for ${this.config.githubUsername}`;
    const html = this.generateEmailHtml(changes);

    try {
      await this.emailTransporter.sendMail({
        from: this.config.emailFrom,
        to: this.config.emailTo,
        subject,
        html,
      });
      console.log("✓ Email notification sent");
    } catch (error) {
      console.error("✗ Failed to send email:", error);
    }
  }

  private generateEmailHtml(changes: FollowerChange): string {
    let html = `
      <h2>GitHub Follower Update for @${this.config.githubUsername}</h2>
      <p>Date: ${new Date().toLocaleString()}</p>
    `;

    if (changes.newFollowers.length > 0) {
      html += `
        <h3>🎉 New Followers (${changes.newFollowers.length})</h3>
        <ul>
      `;
      changes.newFollowers.forEach((follower) => {
        html += `
          <li>
            <img src="${follower.avatar_url}" width="32" height="32" style="vertical-align: middle; border-radius: 50%;">
            <a href="${follower.html_url}">@${follower.login}</a>
          </li>
        `;
      });
      html += `</ul>`;
    }

    if (changes.unfollowers.length > 0) {
      html += `
        <h3>👋 Unfollowers (${changes.unfollowers.length})</h3>
        <ul>
      `;
      changes.unfollowers.forEach((follower) => {
        html += `
          <li>
            <img src="${follower.avatar_url}" width="32" height="32" style="vertical-align: middle; border-radius: 50%;">
            <a href="${follower.html_url}">@${follower.login}</a>
          </li>
        `;
      });
      html += `</ul>`;
    }

    return html;
  }

  private async sendSlack(changes: FollowerChange): Promise<void> {
    if (!this.slackWebhook) return;

    try {
      const blocks: any[] = [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `GitHub Follower Update for @${this.config.githubUsername}`,
          },
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `_${new Date().toLocaleString()}_`,
            },
          ],
        },
      ];

      if (changes.newFollowers.length > 0) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*🎉 New Followers (${changes.newFollowers.length}):*\n${changes.newFollowers
              .map((f) => `• <${f.html_url}|@${f.login}>`)
              .join("\n")}`,
          },
        });
      }

      if (changes.unfollowers.length > 0) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*👋 Unfollowers (${changes.unfollowers.length}):*\n${changes.unfollowers
              .map((f) => `• <${f.html_url}|@${f.login}>`)
              .join("\n")}`,
          },
        });
      }

      await this.slackWebhook.send({
        blocks,
      });
      console.log("✓ Slack notification sent");
    } catch (error) {
      console.error("✗ Failed to send Slack notification:", error);
    }
  }

  private async sendDiscord(changes: FollowerChange): Promise<void> {
    if (!this.config.discordWebhookUrl) return;

    try {
      const embeds: any[] = [];

      if (changes.newFollowers.length > 0) {
        embeds.push({
          title: `🎉 New Followers (${changes.newFollowers.length})`,
          description: changes.newFollowers
            .map((f) => `• [${f.login}](${f.html_url})`)
            .join("\n"),
          color: 0x28a745, // Green
          timestamp: new Date().toISOString(),
        });
      }

      if (changes.unfollowers.length > 0) {
        embeds.push({
          title: `👋 Unfollowers (${changes.unfollowers.length})`,
          description: changes.unfollowers
            .map((f) => `• [${f.login}](${f.html_url})`)
            .join("\n"),
          color: 0xdc3545, // Red
          timestamp: new Date().toISOString(),
        });
      }

      const response = await fetch(this.config.discordWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "GitHub Follower Tracker",
          embeds,
        }),
      });

      if (!response.ok) {
        throw new Error(`Discord API returned ${response.status}`);
      }

      console.log("✓ Discord notification sent");
    } catch (error) {
      console.error("✗ Failed to send Discord notification:", error);
    }
  }
}
