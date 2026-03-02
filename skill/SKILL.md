---
name: researching-youtube-niche
description: Research a YouTube niche to identify what's working — title patterns, description structure, video length, thumbnail style, hook formats, tags. Use when asked to "research a YouTube niche", "analyse competitor YouTube channels", "what's working on YouTube for [topic]", or "YouTube content strategy for [niche]". Calls youtube-researcher MCP tools. Do NOT use for transcript extraction or SEO optimisation of existing videos.
allowed-tools: Read, Write, Bash, Agent
---

# YouTube Niche Research

## When to Use

- User wants to understand what performs well in a specific YouTube niche
- Competitor analysis for a YouTube topic or creator category
- Content strategy research before starting a channel or series

## When NOT to Use

- Extracting a specific video's transcript
- Optimising existing video titles/descriptions/tags

## Prerequisites

- `youtube-researcher` MCP server running
- Valid `YOUTUBE_API_KEY` set in server env

## Output Location

All research output saves to a user-specified folder, or defaults to:
`~/Documents/youtube-research/`

**Naming convention:** `YYYY-MM-DD Research Title.md`

Nothing gets echoed to the main conversation except the file path and a brief summary (5-10 lines max).

## Workflow

### Step 1: Get the Topic

The user **must** provide the topic/keywords before any research runs. Do not assume or infer a topic. If the user triggers this skill without a topic, ask:

```
What topic or keywords should I research?
```

No other questions. No parameter negotiation. Defaults handle everything else.

### Step 2: Run Niche Analysis

```
youtube_analyse_niche(
  query: [user's topic],
  maxResults: 10,
  order: "viewCount"
)
```

This returns the top 10 videos by view count with full metadata and aggregate statistics. Check quota after: `youtube_quota_status`.

### Step 3: Download Thumbnails

Download thumbnails for all 10 videos:

```
youtube_get_thumbnails(
  videoIds: [all 10 video IDs],
  outputDir: ~/Downloads/youtube-research/[date]-[niche-slug]/
)
```

### Step 4: Delegate Everything to a Single Agent

Spawn ONE agent that:

1. Reads the raw niche analysis data (from the tool result file)
2. Reads all 10 thumbnail images from the download directory
3. Analyses everything
4. Writes the full report to disk

**Agent prompt template:**

```
Read the raw YouTube niche analysis data from: [tool-result-path]
Read all thumbnail images from: [thumbnail-dir]

Analyse and write a research report to: [output-path]

Report structure:

# YouTube Niche Research: [Topic]

**Date:** YYYY-MM-DD
**Query:** [query]
**Videos analysed:** [count]

---

## What Works — Executive Summary

[5-7 bullet points: the most actionable findings for a creator entering this niche]

## Top 10 Videos by Engagement

| # | Title | Channel | Views | Engagement % | Duration | Published |
[Table of all 10 videos sorted by engagement rate]

## Title Strategy

- Winning patterns with specific examples from the data
- Title length range, power words, structures that correlate with high engagement
- 3 recommended title templates

## Thumbnail Strategy

- Visual patterns across all 10 thumbnails (faces, text, colours, logos, composition)
- What the top 3 by engagement do differently
- Specific recommendations for a new creator

## Description & Tags

- Above-the-fold patterns (first 2 lines)
- Tag frequency analysis — what tags the top performers use
- Recommended tags for this niche

## Duration & Format

- Duration distribution and where highest engagement concentrates
- Optimal length recommendation with rationale

## Channel Landscape

- Who dominates, subscriber distribution, where mid-tier creators break through
- Gap analysis: underserved angles or content types

## Actionable Recommendations

[7-10 specific, numbered recommendations for someone creating content in this niche. Focus on what to do differently from the established creators.]

---

**Thumbnails saved to:** [thumbnail-dir]

Return to me: Only the file path and a 1-line summary. Do NOT return the full content.
```

### Step 5: Confirm to User

Report the file path and a 3-line summary:

```
Research complete for "[topic]".

Report: [file path]
Thumbnails: [thumbnail dir]

[1-2 sentence highlight of the most actionable finding]
```

No review checkpoint needed — the user reads the file directly.

## Context Discipline

- The main conversation window never sees raw niche data, thumbnail analysis, or report content
- The niche analysis tool returns large JSON — always save to disk, never parse in main context
- All heavy work happens inside the delegated agent
- Main context total for this skill: ~10 tool calls max

## Installation

Copy this file to your Claude Code skills directory:

```bash
mkdir -p .claude/skills/researching-youtube-niche
cp skill/SKILL.md .claude/skills/researching-youtube-niche/SKILL.md
```

Customise the output path and report structure to suit your workflow.

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "Missing required environment variable: YOUTUBE_API_KEY" | API key not set | Add key to MCP server config |
| "YouTube search failed: quotaExceeded" | Daily quota exceeded | Wait until midnight Pacific, or request quota increase |
| Few results returned | Niche too narrow | Broaden query terms |
| Thumbnail 404s | Older videos lack maxres | Fallback to hqdefault is automatic |
