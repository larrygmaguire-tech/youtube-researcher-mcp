/**
 * YouTube Data API v3 Client
 *
 * Wraps the YouTube Data API for niche research. Provides search,
 * metadata fetching, metric calculation, and thumbnail downloading.
 * Tracks quota usage per session.
 */
export interface SearchParams {
    query: string;
    maxResults?: number;
    order?: "viewCount" | "date" | "relevance" | "rating";
    publishedAfter?: string;
    regionCode?: string;
}
export interface AnalyseParams {
    query: string;
    maxResults?: number;
    publishedAfter?: string;
    minViews?: number;
    order?: "viewCount" | "date" | "relevance";
}
export interface VideoMetrics {
    videoId: string;
    title: string;
    description: string;
    tags: string[];
    publishedAt: string;
    durationSeconds: number;
    durationFormatted: string;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    channelId: string;
    channelTitle: string;
    categoryId: string;
    thumbnailUrls: {
        default: string;
        medium: string;
        high: string;
        standard?: string;
        maxres?: string;
    };
    engagementRate: number;
    likeToViewRatio: number;
    commentDensity: number;
    daysSincePublish: number;
    viewVelocity: number;
}
export interface ChannelMetrics {
    channelId: string;
    title: string;
    description: string;
    subscriberCount: number;
    videoCount: number;
    totalViewCount: number;
    publishedAt: string;
    thumbnailUrl: string;
    hiddenSubscriberCount: boolean;
}
export interface NicheAnalysis {
    query: string;
    fetchedAt: string;
    totalVideosAnalysed: number;
    videos: VideoMetrics[];
    channels: ChannelMetrics[];
    aggregates: {
        medianViewCount: number;
        medianEngagementRate: number;
        medianDurationSeconds: number;
        medianLikeToViewRatio: number;
        averageViewCount: number;
        averageEngagementRate: number;
        topTags: Array<{
            tag: string;
            count: number;
        }>;
        durationDistribution: {
            under5min: number;
            fiveTo10min: number;
            tenTo20min: number;
            over20min: number;
        };
        publishDayDistribution: Record<string, number>;
        channelSizeDistribution: {
            micro: number;
            mid: number;
            large: number;
            mega: number;
        };
    };
    quotaUsed: number;
}
export declare class YouTubeClient {
    private apiKey;
    private baseUrl;
    private quotaUsed;
    constructor(apiKey: string);
    /**
     * Search for videos by keyword/niche.
     * Costs 100 quota units per call.
     */
    searchVideos(params: SearchParams): Promise<string[]>;
    /**
     * Fetch full metadata for video IDs. Batches up to 50 per call.
     * Costs 1 quota unit per call.
     */
    getVideoDetails(videoIds: string[]): Promise<VideoMetrics[]>;
    /**
     * Fetch channel metadata. Batches up to 50 per call.
     * Costs 1 quota unit per call.
     */
    getChannelDetails(channelIds: string[]): Promise<ChannelMetrics[]>;
    /**
     * Compound niche analysis: search + video details + channel details + metrics.
     */
    analyseNiche(params: AnalyseParams): Promise<NicheAnalysis>;
    /**
     * Download thumbnail images for given video IDs.
     * No quota cost — direct image fetch from i.ytimg.com.
     */
    downloadThumbnails(videoIds: string[], outputDir: string): Promise<Record<string, string>>;
    /**
     * Get current session quota usage.
     */
    getQuotaUsed(): number;
    private calculateMetrics;
    private parseDuration;
    private formatDuration;
    private median;
    private computeAggregates;
    private emptyAggregates;
}
