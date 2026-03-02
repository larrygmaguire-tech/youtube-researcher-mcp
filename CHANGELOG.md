# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] — 2026-03-02

### Added

- Companion skill file at `skill/SKILL.md` — ready-made Claude Code skill for the full research workflow
- README: recommended lean workflow section (10 videos, agent delegation, disk-first output)
- README: companion skill installation instructions

### Changed

- README: updated `analyse_niche` maxResults description to recommend 10 for lean usage
- No code changes — server already supports all parameters; lean workflow is caller-side

## [1.0.0] — 2026-03-02

### Added

- Initial release
- 6 MCP tools: youtube_search_niche, youtube_get_video_details, youtube_get_channel_details, youtube_analyse_niche, youtube_get_thumbnails, youtube_quota_status
- Engagement metric calculations (engagement rate, view velocity, like-to-view ratio, comment density)
- Aggregate niche statistics (median views, top tags, duration distribution, publish day patterns, channel size breakdown)
- Shorts and live stream filtering
- Thumbnail download with maxres/hq fallback
- In-memory quota tracking
