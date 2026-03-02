#!/usr/bin/env node

/**
 * YouTube Researcher MCP Server
 *
 * A Model Context Protocol server for YouTube niche research.
 * Uses YouTube Data API v3 (API key authentication) to search,
 * analyse, and report on what's working in a YouTube niche.
 *
 * @version 1.0.0
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import * as os from "os";
import * as path from "path";

import { YouTubeClient } from "./youtube-client.js";
import { TOOLS } from "./tools.js";

// Validate required environment variable
const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) {
  console.error("Missing required environment variable: YOUTUBE_API_KEY");
  process.exit(1);
}

// Initialise YouTube client
const youtubeClient = new YouTubeClient(apiKey);

// Create MCP server
const server = new Server(
  {
    name: "youtube-researcher-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "youtube_search_niche": {
        const videoIds = await youtubeClient.searchVideos({
          query: String(args?.query ?? ""),
          maxResults: args?.maxResults as number | undefined,
          order: args?.order as "viewCount" | "date" | "relevance" | "rating" | undefined,
          publishedAfter: args?.publishedAfter as string | undefined,
          regionCode: args?.regionCode as string | undefined,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { videoIds, count: videoIds.length, quotaUsed: youtubeClient.getQuotaUsed() },
                null,
                2
              ),
            },
          ],
        };
      }

      case "youtube_get_video_details": {
        const videoIds = args?.videoIds as string[] | undefined;
        if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
          throw new McpError(ErrorCode.InvalidParams, "videoIds must be a non-empty array of strings");
        }

        const videos = await youtubeClient.getVideoDetails(videoIds);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ videos, count: videos.length }, null, 2),
            },
          ],
        };
      }

      case "youtube_get_channel_details": {
        const channelIds = args?.channelIds as string[] | undefined;
        if (!channelIds || !Array.isArray(channelIds) || channelIds.length === 0) {
          throw new McpError(ErrorCode.InvalidParams, "channelIds must be a non-empty array of strings");
        }

        const channels = await youtubeClient.getChannelDetails(channelIds);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ channels, count: channels.length }, null, 2),
            },
          ],
        };
      }

      case "youtube_analyse_niche": {
        const analysis = await youtubeClient.analyseNiche({
          query: String(args?.query ?? ""),
          maxResults: args?.maxResults as number | undefined,
          publishedAfter: args?.publishedAfter as string | undefined,
          minViews: args?.minViews as number | undefined,
          order: args?.order as "viewCount" | "date" | "relevance" | undefined,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(analysis, null, 2),
            },
          ],
        };
      }

      case "youtube_get_thumbnails": {
        const videoIds = args?.videoIds as string[] | undefined;
        if (!videoIds || !Array.isArray(videoIds) || videoIds.length === 0) {
          throw new McpError(ErrorCode.InvalidParams, "videoIds must be a non-empty array of strings");
        }

        const today = new Date().toISOString().split("T")[0];
        const defaultDir = path.join(os.homedir(), "Downloads", "youtube-thumbnails", today);
        const outputDir = (args?.outputDir as string) || defaultDir;

        const results = await youtubeClient.downloadThumbnails(videoIds, outputDir);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  downloaded: Object.keys(results).length,
                  outputDir,
                  files: results,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "youtube_quota_status": {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  quotaUsed: youtubeClient.getQuotaUsed(),
                  dailyLimit: 10000,
                  remaining: 10000 - youtubeClient.getQuotaUsed(),
                  note: "Quota resets at midnight Pacific Time. Usage is estimated — actual quota may vary slightly.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error) {
    if (error instanceof McpError) throw error;
    const message = error instanceof Error ? error.message : String(error);
    throw new McpError(ErrorCode.InternalError, message);
  }
});

// Start stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
