import { Octokit } from "@octokit/rest";
import type { Follower } from "./types";

export class GitHubService {
  private octokit: Octokit;
  private username: string;
  private isOrganization: boolean;

  constructor(token: string, username: string, isOrganization: boolean = false) {
    this.octokit = new Octokit({ auth: token });
    this.username = username;
    this.isOrganization = isOrganization;
  }

  async getFollowers(): Promise<Follower[]> {
    const followers: Follower[] = [];
    let page = 1;
    const perPage = 100;

    try {
      while (true) {
        // const response = this.isOrganization
        //   ? await this.octokit.orgs.listMembers({
        //       org: this.username,
        //       per_page: perPage,
        //       page,
        //     })
        //   : await this.octokit.users.listFollowersForUser({
        //       username: this.username,
        //       per_page: perPage,
        //       page,
        //     });
        // For organizations, GitHub doesn't have a direct "followers" endpoint
        // You need to use the REST API's undocumented endpoint or GraphQL
        const response = await this.octokit.request(
          `GET /users/{username}/followers`,
          {
            username: this.username,
            per_page: perPage,
            page,
          }
        );

        if (response.data.length === 0) {
          break;
        }

        followers.push(
          ...response.data.map((user) => ({
            login: user.login,
            id: user.id,
            avatar_url: user.avatar_url,
            html_url: user.html_url,
          }))
        );

        if (response.data.length < perPage) {
          break;
        }

        page++;
      }

      console.log(`✓ Fetched ${followers.length} ${this.isOrganization ? 'members' : 'followers'} for ${this.username}`);
      return followers;
    } catch (error) {
      console.error("Error fetching followers from GitHub:", error);
      throw error;
    }
  }
}
