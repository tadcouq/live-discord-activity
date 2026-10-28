![Discord Activity](https://github.com/IgorKowalczyk/discord-activity/assets/49127376/b90fdb11-ede2-4155-a56c-fdded6699d0e)

<div align="center">
 <a aria-label="Powered by" href="https://deno.com">
  <img src="https://img.shields.io/static/v1?label=Powered%20by&message=Deno&color=blue&logo=deno"/>
 </a>
 <a aria-label="Github License" href="https://github.com/igorkowalczyk/discord-activity/blob/main/license.md">
  <img src="https://img.shields.io/github/license/igorkowalczyk/discord-activity?color=blue&logo=github&label=License"/>
 </a>
 <a aria-label="Version" href="https://github.com/igorkowalczyk/discord-activity/releases">
  <img src="https://img.shields.io/github/v/release/igorkowalczyk/discord-activity?color=blue&logo=github&label=Version"/>
 </a>
 <br/>
 <b>🦕 This is a <a href="https://deno.com">Deno runtime</a> application that generates Discord profile cards, presenting users' activity and presence. Using the Discord API via the <a href="https://deno.land/x/discordeno">Discordeno</a> library, the app serves user cards in SVG format.</b>
</div>

---

## 📷 How it looks

![Example image](https://github.com/IgorKowalczyk/discord-activity/assets/49127376/d617abbb-aa2d-4e72-aa80-01c8b9e0c3a3)

> [!IMPORTANT]
> Current Nitro & Boosting badges do not work due to Discord API limitations, unless you currently have an animated avatar then the Nitro badge will be displayed correctly.

## ✨ Features

- ✅ Generate user cards with user presence and activities.
- 🎨 Customize user card appearance by providing query parameters.
- 🌐 RESTful API to fetch user data and generate user cards.
- 🚀 Error handling for various scenarios.
- 🔒 No data tracking and no database required.

## 🚀 Getting Started

**Join our [Discord Server](https://igorkowalczyk.dev/discord)**, without this you will not be able to use the website, Discord bot have to watch your profile and activities for this to work.

> [!IMPORTANT]
> If you leave the Discord server, the bot will no longer be able to watch your profile and activities, so the user card will not be generated.

Then, in your browser, **go to `https://activity.igorkowalczyk.dev/api/:userId` and replace `:userId` with your Discord user ID**.

**You will be shown a user card with your presence and activities.** If you want to customize the appearance of the user card, you can do so by providing query parameters to the URL which are described in the [Customizations](#-customizations) section.

> [!NOTE]
> If you don't know your Discord user ID, go to your Discord settings, then to the "Advanced" tab, scroll down and enable "Developer Mode". Then right-click on your profile and click "Copy ID".
>
> You can also get raw user data in JSON format by going to `https://activity.igorkowalczyk.dev/api/raw/:userId` and replacing `:userId` with your Discord user ID.

## 📚 API Endpoints

- `/api/:userId`: Generate a user card image with customizable appearance.
- `/api/raw/:userId`: Get raw user data in JSON format.
- `/badges/:badge`: Get a Discord badge image by name.

## 🎨 Customizations

> [!NOTE]
> You can customize the appearance of the user card by providing query parameters to the `/api/:userId` endpoint.

| Parameter          | Description                               | Default                           |
| ------------------ | ----------------------------------------- | --------------------------------- |
| `bgColor`          | Background color of the user card.        | `#161a23`                         |
| `borderRadius`     | Border radius of the user card.           | `10`                              |
| `idleMessage`      | Message to display when the user is idle. | `There is nothing going on here!` |
| `hideStatus`       | Hide the status of the user.              | `false`                           |
| `hideCustomStatus` | Hide the custom status of the user.       | `false`                           |
| `hideBadges`       | Hide the badges of the user.              | `false`                           |

> [!WARNING]
> The `bgColor` parameter must be a hexadecimal color code without the `#` symbol. For example, `#161a23` should be `161a23`.

#### 🚀 Example

The existing Deno/Fresh deployment, commands, and environment variables are unchanged. No database or additional service is required. The homepage editor exposes all the options below, updates the preview automatically, and exports Markdown, HTML (an image embed pointing to SVG), or a direct SVG URL. The raw JSON API remains available.

| Parameter                          | Values / purpose                                                             | Default          |
| ---------------------------------- | ---------------------------------------------------------------------------- | ---------------- |
| `theme`                            | `dark` or `light`                                                            | `dark`           |
| `backgroundColor`, `bgColor`, `bg` | Hex background; precedence follows this order, overriding the theme          | Theme background |
| `hideProfile`                      | Hide avatar, name, badges and custom status                                  | `false`          |
| `hideActivity`                     | `true`, `false`, or `whenNotUsed` (hide when no activity survives filtering) | `false`          |
| `hideSpotify`                      | Hide Spotify activities                                                      | `false`          |
| `ignoreAppId`                      | Comma-separated Discord application IDs to hide                              | Empty            |
| `maxActivities`                    | Number of activities, from `1` to `5`                                        | `1`              |
| `hideTimestamp`                    | Hide activity elapsed time                                                   | `false`          |
| `animated`                         | Use animated avatars when available; `false` requests PNG                    | `true`           |

`borderRadius` accepts an integer with an optional `px` suffix and is capped at 100px. Boolean options accept `true` or `false`. Invalid options return HTTP 400. Card height adjusts to the visible sections. Elapsed time is a snapshot at request time, not a live timer.

Example: `/api/YOUR_DISCORD_ID?theme=light&maxActivities=3&hideSpotify=true`

**URL**

```http
GET https://activity.igorkowalczyk.dev/api/544164729354977282?bgColor=1b1c1e&borderRadius=0&idleMessage=I'm not doing anything&hideStatus=true
```

**Query Parameters**

```yaml
bgColor: "1b1c1e"
borderRadius: 0
idleMessage: "I'm not doing anything"
hideStatus: true
```

**Result**

![Generated Image](https://github.com/IgorKowalczyk/discord-activity/assets/49127376/b2dda27f-24fe-4641-99d6-bff3f53bb2f5)

## 🔩 Self Hosting

1. Clone [this repository](https://github.com/igorkowalczyk/discord-activity) `git clone https://github.com/IgorKowalczyk/discord-activity`
2. Fill environment variables in the `.env` file (see [Environment Variables](#-environment-variables))
3. Run `deno task dev` to start the project in development mode or `deno task start` to run the project in production mode.
4. Visit `http://localhost:8080` in your browser

> [!NOTE]
> Deno will automatically install all the project packages on the first run

## 🔩 Hosting with Deno Deploy

1. Fork [this repository](https://github.com/igorkowalczyk/discord-activity)
2. Create a new project on [Deno Deploy](https://deno.com/deploy)
3. Connect your forked repository to the project
4. Click on the `Deploy` button
5. Fill environment variables in the project settings (see [Environment Variables](#-environment-variables))
6. Visit the generated URL in your browser

## 📝 Environment Variables

| Variable      | Description                                                                                         | Default | Required |
| ------------- | --------------------------------------------------------------------------------------------------- | ------- | -------- |
| `TOKEN`       | Discord Bot Token from the [Discord Developer Portal](https://discord.com/developers/applications). |         | ✅       |
| `GUILD_ID`    | Discord Guild ID where the bot will watch the users.                                                |         | ✅       |
| `INVITE_LINK` | Discord server invite link where the bot is located.                                                |         | ✅       |
| `PORT`        | Port on which the application will be running.                                                      | `3000`  | ❌       |

> [!NOTE]
> You can see the `.env.example` file for an example of how to fill in the environment variables.

> [!WARNING]
> In Deno Deploy, the `PORT` variable is not required, because the port is assigned automatically!

## ⁉️ Issues

If you come across any errors or have suggestions for improvements, please create a [new issue here](https://github.com/igorkowalczyk/discord-activity/issues) and describe it clearly.

## 📥 Pull Requests

When submitting a pull request, please follow these steps:

- Clone [this repository](https://github.com/igorkowalczyk/discord-activity) `https://github.com/IgorKowalczyk/discord-activity.git`
- Create a branch from `main` and give it a meaningful name (e.g. `my-awesome-new-feature`).
- Open a [pull request](https://github.com/igorkowalczyk/discord-activity/pulls) on [GitHub](https://github.com/) and clearly describe the feature or fix you are proposing.

## 📋 License

This project is licensed under the MIT. See the [LICENSE](https://github.com/igorkowalczyk/discord-activity/blob/main/license.md) file for details

## Editor and performance

Enter your Discord ID on the homepage, adjust the appearance and visibility controls, then select **Markdown**, **HTML (SVG)**, or **URL** and copy the generated code. HTML exports an `<img>` pointing to the SVG endpoint, not a frozen inline SVG. Preview requests are debounced by 300ms; generated code updates immediately. Invalid input is reported before sending a preview request, and copy failures leave selectable code for manual copying.

Performance improvements require no extra service or environment variable:

- Independent avatar, emoji, badge and activity images load concurrently.
- Image requests share in-flight work and reuse a process-local cache for 5 minutes, capped at 128 entries / approximately 16 MiB of string data. Each image has a 4-second download timeout and a 2 MiB limit; unavailable or oversized images are omitted without blocking the card indefinitely. Failed downloads are retried on subsequent requests.
- Local badge images are cached for one hour (up to 64 entries).
- Discord profile metadata is cached for 30 seconds (up to 512 users), while activity and status still read the gateway presence cache for every render. Avatar/name changes can take up to 30 seconds to appear; bytes served at an unchanged image URL can remain cached for 5 minutes.
- Rendered cards are not cached by this implementation, so changing theme/filters does not reuse another card configuration or freeze activity timestamps. Caches are per process and reset on restart; cold starts still depend on Discord/CDN response times.

Run the isolated regression tests without a Discord token:

```sh
deno test --allow-env --allow-read lib/card_test.ts lib/cardBuilder_test.ts lib/performance_test.ts lib/offlineUser_test.ts
```

## Offline members

Membership is verified with Discord's Get Guild Member endpoint for the configured `GUILD_ID`; a missing presence is no longer treated as a missing member. Offline members receive a normal profile card and idle message, and the JSON endpoint returns empty activities with an offline status when no presence is available. During gateway startup, an online member may briefly use this fallback until their presence arrives.

Verified member profiles are cached for up to 30 seconds. Member add/update/remove events invalidate that entry; removal also clears presence. Only Discord's `Unknown Member` response becomes a not-found result. Permission, guild configuration and network failures remain server errors rather than misleading not-found responses. Presence updates from other guilds are ignored.

This uses the existing bot token, guild ID and Guild Members / Guild Presences intents; deployment settings are unchanged. The voice-activity filter is deferred.
