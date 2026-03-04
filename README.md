# YouTube Researcher MCP Server

**v1.1.0** · MIT License

An MCP (Model Context Protocol) server for researching YouTube niches. Wraps the YouTube Data API v3 to search for videos, fetch metadata, calculate engagement metrics, download thumbnails, and produce aggregate niche statistics.

Built for Claude Code — define your niche, and the server returns structured data on what's working: title patterns, engagement rates, video lengths, top tags, channel sizes, and thumbnail images for visual analysis.

## Recommended Workflow

For the leanest context usage, query 10 videos and delegate analysis to a subagent:

1. **User provides topic** — never assume or infer
2. **`youtube_analyse_niche(query, maxResults=10)`** — top 10 by view count with full metrics
3. **`youtube_get_thumbnails(videoIds)`** — download all 10 thumbnails
4. **Spawn a single agent** that reads the raw data + thumbnail images, analyses everything, and writes a research report to disk
5. **Main context receives only** the file path and a brief summary

This keeps the main conversation window clean. The `analyse_niche` tool returns large JSON (100KB+ at 30 videos) — always save to disk rather than processing in the primary context.

### Companion Skill

A ready-made Claude Code skill is included in `skill/SKILL.md`. To install:

```bash
mkdir -p .claude/skills/researching-youtube-niche
cp skill/SKILL.md .claude/skills/researching-youtube-niche/SKILL.md
```

The skill handles the full workflow — topic prompt, niche analysis, thumbnail download, agent delegation, and report generation. Customise the output path and report structure to suit your workspace.

## Prerequisites

- Node.js >= 18
- A YouTube Data API v3 key (free tier — see setup below)

## Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services > Library**
4. Search for **YouTube Data API v3** and click **Enable**
5. Navigate to **APIs & Services > Credentials**
6. Click **Create Credentials > API Key**
7. (Recommended) Restrict the key:
   - Click the key name to edit
   - Under **API restrictions**, select **Restrict key** and choose **YouTube Data API v3**
   - Under **Application restrictions**, optionally restrict by IP
8. Copy the API key

## Installation

```bash
git clone https://github.com/larrygmaguire-hash/youtube-researcher-mcp.git
cd youtube-researcher-mcp
npm install
```

Pre-built JavaScript is included in `build/` — no TypeScript compilation needed. To rebuild from source: `npm run build`.

## Configuration

### Environment Variable

Create a `.env` file or pass the key directly:

```
YOUTUBE_API_KEY=your_key_here
```

The server validates this at startup and exits if the key is missing.

### Claude Code Registration

**Global** — add to `~/.claude.json`:

```json
{
  "mcpServers": {
    "youtube-researcher": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/youtube-researcher-mcp/build/index.js"],
      "env": {
        "YOUTUBE_API_KEY": "your_key_here"
      }
    }
  }
}
```

**Workspace-scoped** — add to `.mcp.json` in the workspace root (same structure). This keeps the server available only within that workspace.

## Tools

### youtube_search_niche

Search YouTube for videos by keyword. Returns video IDs sorted by view count, date, relevance, or rating.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| query | string | Yes | — | Search keyword(s) |
| maxResults | number | No | 25 | 1–50 |
| order | string | No | viewCount | `viewCount`, `date`, `relevance`, `rating` |
| publishedAfter | string | No | — | ISO 8601 date filter (e.g. `2025-01-01T00:00:00Z`) |
| regionCode | string | No | — | ISO 3166-1 alpha-2 code (e.g. `IE`, `GB`, `US`) |

**Returns:** `{ videoIds: string[], count: number, quotaUsed: number }`

**Note:** This is the only tool that supports the `rating` sort order and the `regionCode` filter.

---

### youtube_get_video_details

Fetch full metadata for video IDs. Returns title, description, tags, thumbnails, duration, view/like/comment counts, and calculated engagement metrics. Batches up to 50 per API call.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| videoIds | string[] | Yes | Video IDs (max 50) |

**Returns per video:**

| Field | Type | Description |
|-------|------|-------------|
| videoId | string | YouTube video ID |
| title | string | Video title |
| description | string | Full description text |
| tags | string[] | Video tags |
| publishedAt | string | ISO 8601 publish date |
| durationSeconds | number | Duration in seconds |
| durationFormatted | string | Human-readable duration (e.g. `12:34`) |
| viewCount | number | Total views |
| likeCount | number | Total likes |
| commentCount | number | Total comments |
| channelId | string | Channel ID |
| channelTitle | string | Channel name |
| categoryId | string | YouTube category ID |
| thumbnailUrls | object | URLs at default/medium/high/standard/maxres sizes |
| engagementRate | number | (likes + comments) / views |
| likeToViewRatio | number | likes / views |
| commentDensity | number | comments / views |
| daysSincePublish | number | Days since publish (minimum 1) |
| viewVelocity | number | views / daysSincePublish |

---

### youtube_get_channel_details

Fetch channel metadata including subscriber count, total views, and video count. Deduplicates channel IDs automatically.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| channelIds | string[] | Yes | Channel IDs (max 50; duplicates removed) |

**Returns per channel:**

| Field | Type | Description |
|-------|------|-------------|
| channelId | string | Channel ID |
| title | string | Channel name |
| description | string | Channel description |
| subscriberCount | number | Subscriber count |
| videoCount | number | Total videos published |
| totalViewCount | number | Lifetime view count |
| publishedAt | string | Channel creation date |
| thumbnailUrl | string | Channel avatar URL |
| hiddenSubscriberCount | boolean | Whether the sub count is hidden |

---

### youtube_analyse_niche

**Primary entry point.** Compound tool that searches, fetches video/channel details, calculates metrics, and returns aggregate statistics in a single call.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| query | string | Yes | — | Niche keyword(s) |
| maxResults | number | No | 30 | 1–50. Recommend 10 for lean workflow |
| publishedAfter | string | No | — | ISO 8601 date filter |
| minViews | number | No | — | Minimum view count filter (post-fetch — see note) |
| order | string | No | viewCount | `viewCount`, `date`, `relevance` |

**Automatic filters (no parameter needed):**
- Videos under 60 seconds are excluded (Shorts detection by duration, not YouTube's Shorts flag)
- Active live streams are excluded

**`minViews` gotcha:** This is a post-fetch filter. The search and video detail API calls run first (consuming quota), then videos below the threshold are removed from results. A high `minViews` value can return very few or zero videos while still costing the full quota.

**Not available on this tool:** `regionCode` and `rating` sort order — use `youtube_search_niche` for those.

**Returns:**

```
{
  query: string,
  fetchedAt: string,              // ISO 8601 timestamp
  totalVideosAnalysed: number,
  videos: VideoMetrics[],         // Full per-video data (see youtube_get_video_details)
  channels: ChannelMetrics[],     // Deduplicated channel data
  aggregates: {
    medianViewCount: number,
    averageViewCount: number,
    medianEngagementRate: number,
    averageEngagementRate: number,
    medianDurationSeconds: number,
    medianLikeToViewRatio: number,
    topTags: [{ tag, count }],           // Top 20 by frequency
    durationDistribution: {              // Video count per bucket
      under5min, fiveToTen, tenToTwenty, overTwenty
    },
    publishDayDistribution: {            // Count by day of week (UTC)
      Monday, Tuesday, ...
    },
    channelSizeDistribution: {           // By subscriber count
      micro: <10K, mid: 10K-100K, large: 100K-1M, mega: 1M+
    }
  },
  quotaUsed: number
}
```

---

### youtube_get_thumbnails

Download thumbnail images to a local directory. No API quota cost — fetches directly from YouTube's image CDN.

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| videoIds | string[] | Yes | — | Video IDs (max 50) |
| outputDir | string | No | `~/Downloads/youtube-thumbnails/YYYY-MM-DD/` | Save path |

**Behaviour:** Tries `maxresdefault.jpg` first; falls back to `hqdefault.jpg` on 404. Files saved as `[videoId].jpg`.

**Returns:** `{ downloaded: number, outputDir: string, files: { [videoId]: "/absolute/path.jpg" } }`

---

### youtube_quota_status

Report estimated quota usage for the current server session. No parameters.

**Returns:**

```json
{
  "quotaUsed": 103,
  "dailyLimit": 10000,
  "remaining": 9897,
  "note": "Quota resets at midnight Pacific Time. Usage is estimated..."
}
```

**Note:** The counter tracks usage within the current server process. It resets when the server restarts, and does not reflect the actual Google-side daily total.

## Calculated Metrics

For each video, the server calculates:

| Metric | Formula |
|--------|---------|
| Engagement rate | (likes + comments) / views |
| Like-to-view ratio | likes / views |
| Comment density | comments / views |
| Days since publish | (now - publishedAt) / 86400000, minimum 1 |
| View velocity | views / days since publish |

## Quota

YouTube Data API v3 provides 10,000 free units per day.

| Operation | Cost |
|-----------|------|
| Search (search.list) | 100 units |
| Video details (videos.list, batch 50) | 1 unit |
| Channel details (channels.list, batch 50) | 1 unit |
| Thumbnail download | 0 (direct fetch) |

A typical full niche analysis: ~103 units. Daily budget allows ~48 analyses per day.

Quota resets at midnight Pacific Time.

## Development

```bash
npm run dev    # Watch mode — recompiles on changes
npm run build  # One-time build
npm start      # Run the server
```

**Tech stack:** TypeScript 5.3, ES2022 target, NodeNext modules, `@modelcontextprotocol/sdk ^1.0.0`. No runtime dependencies beyond the MCP SDK — uses Node 18+ native `fetch` for all HTTP calls.

## Licence

MIT
