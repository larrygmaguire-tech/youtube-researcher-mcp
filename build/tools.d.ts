/**
 * MCP Tool Definitions for YouTube Researcher
 *
 * Each tool defines its name, description, and input schema.
 * These are exposed to Claude for YouTube niche research.
 */
export declare const TOOLS: ({
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            query: {
                type: string;
                description: string;
            };
            maxResults: {
                type: string;
                description: string;
            };
            order: {
                type: string;
                enum: string[];
                description: string;
            };
            publishedAfter: {
                type: string;
                description: string;
            };
            regionCode: {
                type: string;
                description: string;
            };
            videoIds?: undefined;
            channelIds?: undefined;
            minViews?: undefined;
            outputDir?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            videoIds: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            query?: undefined;
            maxResults?: undefined;
            order?: undefined;
            publishedAfter?: undefined;
            regionCode?: undefined;
            channelIds?: undefined;
            minViews?: undefined;
            outputDir?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            channelIds: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            query?: undefined;
            maxResults?: undefined;
            order?: undefined;
            publishedAfter?: undefined;
            regionCode?: undefined;
            videoIds?: undefined;
            minViews?: undefined;
            outputDir?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            query: {
                type: string;
                description: string;
            };
            maxResults: {
                type: string;
                description: string;
            };
            publishedAfter: {
                type: string;
                description: string;
            };
            minViews: {
                type: string;
                description: string;
            };
            order: {
                type: string;
                enum: string[];
                description: string;
            };
            regionCode?: undefined;
            videoIds?: undefined;
            channelIds?: undefined;
            outputDir?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            videoIds: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            outputDir: {
                type: string;
                description: string;
            };
            query?: undefined;
            maxResults?: undefined;
            order?: undefined;
            publishedAfter?: undefined;
            regionCode?: undefined;
            channelIds?: undefined;
            minViews?: undefined;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: "object";
        properties: {
            query?: undefined;
            maxResults?: undefined;
            order?: undefined;
            publishedAfter?: undefined;
            regionCode?: undefined;
            videoIds?: undefined;
            channelIds?: undefined;
            minViews?: undefined;
            outputDir?: undefined;
        };
        required?: undefined;
    };
})[];
