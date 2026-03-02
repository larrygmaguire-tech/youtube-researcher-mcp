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

### Claude Code Registration

Add to `~/.claude.json`:

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

## Tools

### youtube_search_niche

Search YouTube for videos by keyword. Returns video IDs sorted by view count, date, or relevance.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | Search keyword(s) |
| maxResults | number | No | 1-50, default 25 |
| order | string | No | viewCount, date, relevance, rating |
| publishedAfter | string | No | ISO 8601 date filter |
| regionCode | string | No | ISO 3166-1 alpha-2 code |

### youtube_get_video_details

Fetch full metadata for video IDs. Returns title, description, tags, thumbnails, duration, view/like/comment counts, and calculated engagement metrics. Batches up to 50 per API call.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| videoIds | string[] | Yes | Video IDs (max 50) |

### youtube_get_channel_details

Fetch channel metadata including subscriber count, total views, and video count.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| channelIds | string[] | Yes | Channel IDs (max 50) |

### youtube_analyse_niche

**Primary entry point.** Compound tool that searches, fetches video/channel details, calculates metrics, and returns aggregate statistics. Filters out Shorts (<60s) and active live streams.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | Niche keyword(s) |
| maxResults | number | No | 1-50, default 30. Recommend 10 for lean workflow |
| publishedAfter | string | No | ISO 8601 date filter |
| minViews | number | No | Minimum view count filter |
| order | string | No | viewCount, date, relevance |

**Returns:** Videos with metrics, channel data, and aggregates:
- Median/average view count, engagement rate, duration
- Top 20 tags by frequency
- Duration distribution (under 5min, 5-10, 10-20, 20+)
- Publish day distribution
- Channel size distribution (micro <10K, mid 10K-100K, large 100K-1M, mega 1M+)

### youtube_get_thumbnails

Download thumbnail images to a local directory. No API quota cost.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| videoIds | string[] | Yes | Video IDs (max 50) |
| outputDir | string | No | Save path (default: ~/Downloads/youtube-thumbnails/[date]/) |

### youtube_quota_status

Report estimated quota usage for the current session.

## Calculated Metrics

For each video, the server calculates:

| Metric | Formula |
|--------|---------|
| Engagement rate | (likes + comments) / views |
| Like-to-view ratio | likes / views |
| Comment density | comments / views |
| Days since publish | (now - publishedAt) / 86400000 |
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

## Licence

MIT
