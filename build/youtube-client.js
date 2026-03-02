/**
 * YouTube Data API v3 Client
 *
 * Wraps the YouTube Data API for niche research. Provides search,
 * metadata fetching, metric calculation, and thumbnail downloading.
 * Tracks quota usage per session.
 */
// --- YouTube Client ---
export class YouTubeClient {
    apiKey;
    baseUrl = "https://www.googleapis.com/youtube/v3";
    quotaUsed = 0;
    constructor(apiKey) {
        this.apiKey = apiKey;
    }
    /**
     * Search for videos by keyword/niche.
     * Costs 100 quota units per call.
     */
    async searchVideos(params) {
        const maxResults = Math.min(params.maxResults ?? 25, 50);
        const searchParams = new URLSearchParams({
            part: "id",
            q: params.query,
            type: "video",
            maxResults: String(maxResults),
            order: params.order ?? "viewCount",
            key: this.apiKey,
        });
        if (params.publishedAfter) {
            searchParams.set("publishedAfter", params.publishedAfter);
        }
        if (params.regionCode) {
            searchParams.set("regionCode", params.regionCode);
        }
        const response = await fetch(`${this.baseUrl}/search?${searchParams}`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`YouTube search failed: ${JSON.stringify(error.error?.message ?? error)}`);
        }
        this.quotaUsed += 100;
        const data = await response.json();
        return data.items
            ?.map((item) => item.id?.videoId)
            .filter(Boolean) ?? [];
    }
    /**
     * Fetch full metadata for video IDs. Batches up to 50 per call.
     * Costs 1 quota unit per call.
     */
    async getVideoDetails(videoIds) {
        const results = [];
        for (let i = 0; i < videoIds.length; i += 50) {
            const batch = videoIds.slice(i, i + 50);
            const params = new URLSearchParams({
                part: "snippet,statistics,contentDetails",
                id: batch.join(","),
                key: this.apiKey,
            });
            const response = await fetch(`${this.baseUrl}/videos?${params}`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(`YouTube videos.list failed: ${JSON.stringify(error.error?.message ?? error)}`);
            }
            this.quotaUsed += 1;
            const data = await response.json();
            for (const item of data.items ?? []) {
                const metrics = this.calculateMetrics(item);
                if (metrics)
                    results.push(metrics);
            }
        }
        return results;
    }
    /**
     * Fetch channel metadata. Batches up to 50 per call.
     * Costs 1 quota unit per call.
     */
    async getChannelDetails(channelIds) {
        const unique = [...new Set(channelIds)];
        const results = [];
        for (let i = 0; i < unique.length; i += 50) {
            const batch = unique.slice(i, i + 50);
            const params = new URLSearchParams({
                part: "snippet,statistics",
                id: batch.join(","),
                key: this.apiKey,
            });
            const response = await fetch(`${this.baseUrl}/channels?${params}`);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(`YouTube channels.list failed: ${JSON.stringify(error.error?.message ?? error)}`);
            }
            this.quotaUsed += 1;
            const data = await response.json();
            for (const item of data.items ?? []) {
                results.push({
                    channelId: item.id,
                    title: item.snippet?.title ?? "",
                    description: item.snippet?.description ?? "",
                    subscriberCount: parseInt(item.statistics?.subscriberCount ?? "0", 10),
                    videoCount: parseInt(item.statistics?.videoCount ?? "0", 10),
                    totalViewCount: parseInt(item.statistics?.viewCount ?? "0", 10),
                    publishedAt: item.snippet?.publishedAt ?? "",
                    thumbnailUrl: item.snippet?.thumbnails?.default?.url ?? "",
                    hiddenSubscriberCount: item.statistics?.hiddenSubscriberCount === true,
                });
            }
        }
        return results;
    }
    /**
     * Compound niche analysis: search + video details + channel details + metrics.
     */
    async analyseNiche(params) {
        const quotaBefore = this.quotaUsed;
        // Step 1: Search
        const videoIds = await this.searchVideos({
            query: params.query,
            maxResults: params.maxResults ?? 30,
            order: params.order ?? "viewCount",
            publishedAfter: params.publishedAfter,
        });
        if (videoIds.length === 0) {
            return {
                query: params.query,
                fetchedAt: new Date().toISOString(),
                totalVideosAnalysed: 0,
                videos: [],
                channels: [],
                aggregates: this.emptyAggregates(),
                quotaUsed: this.quotaUsed - quotaBefore,
            };
        }
        // Step 2: Video details
        let videos = await this.getVideoDetails(videoIds);
        // Filter out Shorts (under 60 seconds)
        videos = videos.filter(v => v.durationSeconds >= 60);
        // Filter by minimum views if specified
        if (params.minViews) {
            videos = videos.filter(v => v.viewCount >= params.minViews);
        }
        // Step 3: Channel details
        const channelIds = [...new Set(videos.map(v => v.channelId))];
        const channels = await this.getChannelDetails(channelIds);
        // Step 4: Compute aggregates
        const aggregates = this.computeAggregates(videos, channels);
        // Sort by view count descending
        videos.sort((a, b) => b.viewCount - a.viewCount);
        return {
            query: params.query,
            fetchedAt: new Date().toISOString(),
            totalVideosAnalysed: videos.length,
            videos,
            channels,
            aggregates,
            quotaUsed: this.quotaUsed - quotaBefore,
        };
    }
    /**
     * Download thumbnail images for given video IDs.
     * No quota cost — direct image fetch from i.ytimg.com.
     */
    async downloadThumbnails(videoIds, outputDir) {
        const fs = await import("fs/promises");
        const path = await import("path");
        await fs.mkdir(outputDir, { recursive: true });
        const results = {};
        for (const videoId of videoIds) {
            const maxresUrl = `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
            const hqUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
            let imageBuffer = null;
            // Try maxres first, fallback to hq
            const maxresRes = await fetch(maxresUrl);
            if (maxresRes.ok) {
                imageBuffer = Buffer.from(await maxresRes.arrayBuffer());
            }
            else {
                const hqRes = await fetch(hqUrl);
                if (hqRes.ok) {
                    imageBuffer = Buffer.from(await hqRes.arrayBuffer());
                }
            }
            if (imageBuffer) {
                const filePath = path.join(outputDir, `${videoId}.jpg`);
                await fs.writeFile(filePath, imageBuffer);
                results[videoId] = filePath;
            }
        }
        return results;
    }
    /**
     * Get current session quota usage.
     */
    getQuotaUsed() {
        return this.quotaUsed;
    }
    // --- Private Methods ---
    calculateMetrics(item) {
        const snippet = item.snippet;
        const statistics = item.statistics;
        const contentDetails = item.contentDetails;
        if (!snippet || !statistics || !contentDetails)
            return null;
        // Filter out active live streams
        if (snippet.liveBroadcastContent === "live")
            return null;
        const durationSeconds = this.parseDuration(String(contentDetails.duration ?? "PT0S"));
        const viewCount = parseInt(String(statistics.viewCount ?? "0"), 10);
        const likeCount = parseInt(String(statistics.likeCount ?? "0"), 10);
        const commentCount = parseInt(String(statistics.commentCount ?? "0"), 10);
        const publishedAt = String(snippet.publishedAt ?? "");
        const daysSincePublish = publishedAt
            ? Math.max(1, Math.floor((Date.now() - new Date(publishedAt).getTime()) / 86400000))
            : 1;
        const thumbnails = snippet.thumbnails;
        return {
            videoId: String(item.id ?? ""),
            title: String(snippet.title ?? ""),
            description: String(snippet.description ?? ""),
            tags: Array.isArray(snippet.tags) ? snippet.tags : [],
            publishedAt,
            durationSeconds,
            durationFormatted: this.formatDuration(durationSeconds),
            viewCount,
            likeCount,
            commentCount,
            channelId: String(snippet.channelId ?? ""),
            channelTitle: String(snippet.channelTitle ?? ""),
            categoryId: String(snippet.categoryId ?? ""),
            thumbnailUrls: {
                default: thumbnails?.default?.url ?? "",
                medium: thumbnails?.medium?.url ?? "",
                high: thumbnails?.high?.url ?? "",
                standard: thumbnails?.standard?.url,
                maxres: thumbnails?.maxres?.url,
            },
            engagementRate: viewCount > 0 ? (likeCount + commentCount) / viewCount : 0,
            likeToViewRatio: viewCount > 0 ? likeCount / viewCount : 0,
            commentDensity: viewCount > 0 ? commentCount / viewCount : 0,
            daysSincePublish,
            viewVelocity: viewCount / daysSincePublish,
        };
    }
    parseDuration(iso) {
        const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match)
            return 0;
        const h = parseInt(match[1] || "0", 10);
        const m = parseInt(match[2] || "0", 10);
        const s = parseInt(match[3] || "0", 10);
        return h * 3600 + m * 60 + s;
    }
    formatDuration(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        if (h > 0)
            return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        return `${m}:${String(s).padStart(2, "0")}`;
    }
    median(values) {
        if (values.length === 0)
            return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
    computeAggregates(videos, channels) {
        if (videos.length === 0)
            return this.emptyAggregates();
        // Tag frequency
        const tagCounts = new Map();
        for (const v of videos) {
            for (const tag of v.tags) {
                const lower = tag.toLowerCase();
                tagCounts.set(lower, (tagCounts.get(lower) ?? 0) + 1);
            }
        }
        const topTags = [...tagCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .map(([tag, count]) => ({ tag, count }));
        // Duration distribution
        const durationDistribution = {
            under5min: 0,
            fiveTo10min: 0,
            tenTo20min: 0,
            over20min: 0,
        };
        for (const v of videos) {
            if (v.durationSeconds < 300)
                durationDistribution.under5min++;
            else if (v.durationSeconds < 600)
                durationDistribution.fiveTo10min++;
            else if (v.durationSeconds < 1200)
                durationDistribution.tenTo20min++;
            else
                durationDistribution.over20min++;
        }
        // Publish day distribution
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const publishDayDistribution = {};
        for (const v of videos) {
            if (v.publishedAt) {
                const day = dayNames[new Date(v.publishedAt).getUTCDay()];
                publishDayDistribution[day] = (publishDayDistribution[day] ?? 0) + 1;
            }
        }
        // Channel size distribution
        const channelSizeDistribution = { micro: 0, mid: 0, large: 0, mega: 0 };
        const channelMap = new Map(channels.map(c => [c.channelId, c]));
        const countedChannels = new Set();
        for (const v of videos) {
            if (countedChannels.has(v.channelId))
                continue;
            countedChannels.add(v.channelId);
            const ch = channelMap.get(v.channelId);
            if (!ch || ch.hiddenSubscriberCount)
                continue;
            if (ch.subscriberCount < 10000)
                channelSizeDistribution.micro++;
            else if (ch.subscriberCount < 100000)
                channelSizeDistribution.mid++;
            else if (ch.subscriberCount < 1000000)
                channelSizeDistribution.large++;
            else
                channelSizeDistribution.mega++;
        }
        const views = videos.map(v => v.viewCount);
        const rates = videos.map(v => v.engagementRate);
        const durations = videos.map(v => v.durationSeconds);
        const likeRatios = videos.map(v => v.likeToViewRatio);
        return {
            medianViewCount: this.median(views),
            medianEngagementRate: this.median(rates),
            medianDurationSeconds: this.median(durations),
            medianLikeToViewRatio: this.median(likeRatios),
            averageViewCount: views.reduce((a, b) => a + b, 0) / views.length,
            averageEngagementRate: rates.reduce((a, b) => a + b, 0) / rates.length,
            topTags,
            durationDistribution,
            publishDayDistribution,
            channelSizeDistribution,
        };
    }
    emptyAggregates() {
        return {
            medianViewCount: 0,
            medianEngagementRate: 0,
            medianDurationSeconds: 0,
            medianLikeToViewRatio: 0,
            averageViewCount: 0,
            averageEngagementRate: 0,
            topTags: [],
            durationDistribution: { under5min: 0, fiveTo10min: 0, tenTo20min: 0, over20min: 0 },
            publishDayDistribution: {},
            channelSizeDistribution: { micro: 0, mid: 0, large: 0, mega: 0 },
        };
    }
}
