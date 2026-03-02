/**
 * MCP Tool Definitions for YouTube Researcher
 *
 * Each tool defines its name, description, and input schema.
 * These are exposed to Claude for YouTube niche research.
 */

export const TOOLS = [
  {
    name: "youtube_search_niche",
    description:
      "Search YouTube for videos in a niche or category. Returns video IDs and basic metadata sorted by the specified order. Use this for targeted searches when you already have video IDs from a previous search or want raw search results without metric calculations.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query or niche keyword(s) (e.g. 'Claude Code tutorial', 'AI coding assistant for business')",
        },
        maxResults: {
          type: "number",
          description: "Number of results to return (1-50, default 25)",
        },
        order: {
          type: "string",
          enum: ["viewCount", "date", "relevance", "rating"],
          description: "Sort order. Default: viewCount",
        },
        publishedAfter: {
          type: "string",
          description: "ISO 8601 date — only return videos published after this date (e.g. 2025-01-01T00:00:00Z)",
        },
        regionCode: {
          type: "string",
          description: "ISO 3166-1 alpha-2 country code (e.g. IE, GB, US)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "youtube_get_video_details",
    description:
      "Fetch full metadata and calculated engagement metrics for one or more video IDs. Returns title, description, tags, thumbnails, duration, view/like/comment counts, engagement rate, view velocity, and more. Batches efficiently (50 per API call).",
    inputSchema: {
      type: "object" as const,
      properties: {
        videoIds: {
          type: "array",
          items: { type: "string" },
          description: "Array of YouTube video IDs (max 50)",
        },
      },
      required: ["videoIds"],
    },
  },
  {
    name: "youtube_get_channel_details",
    description:
      "Fetch channel metadata including subscriber count, total views, video count, and creation date. Useful for understanding the competitive landscape — whether top videos come from large or small channels.",
    inputSchema: {
      type: "object" as const,
      properties: {
        channelIds: {
          type: "array",
          items: { type: "string" },
          description: "Array of YouTube channel IDs (max 50)",
        },
      },
      required: ["channelIds"],
    },
  },
  {
    name: "youtube_analyse_niche",
    description:
      "High-level niche analysis — the primary entry point for YouTube research. Searches for videos, fetches full metadata, calculates engagement metrics, and returns sorted results with aggregate statistics including median views, engagement rates, top tags, duration distribution, publishing day patterns, and channel size breakdown. Filters out Shorts (<60s) and active live streams automatically.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Niche or keyword(s) to research (e.g. 'generative AI for work and business')",
        },
        maxResults: {
          type: "number",
          description: "Number of videos to analyse (1-50, default 30)",
        },
        publishedAfter: {
          type: "string",
          description: "ISO 8601 date filter — only include videos published after this date",
        },
        minViews: {
          type: "number",
          description: "Filter out videos below this view count (applied after fetch)",
        },
        order: {
          type: "string",
          enum: ["viewCount", "date", "relevance"],
          description: "Initial search order. Default: viewCount",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "youtube_get_thumbnails",
    description:
      "Download thumbnail images for video IDs to a local directory. Enables Claude vision analysis of thumbnail style, composition, text overlays, faces, and colour schemes. Tries maxresdefault first, falls back to hqdefault. No API quota cost.",
    inputSchema: {
      type: "object" as const,
      properties: {
        videoIds: {
          type: "array",
          items: { type: "string" },
          description: "Video IDs to download thumbnails for (max 50)",
        },
        outputDir: {
          type: "string",
          description: "Absolute path to save thumbnails. Defaults to ~/Downloads/youtube-thumbnails/[date]/",
        },
      },
      required: ["videoIds"],
    },
  },
  {
    name: "youtube_quota_status",
    description:
      "Returns estimated API quota consumption for the current server session. YouTube Data API v3 has a 10,000 unit daily limit. A typical full niche analysis costs ~103 units.",
    inputSchema: {
      type: "object" as const,
      properties: {},
    },
  },
];
