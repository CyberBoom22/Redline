import { describe, expect, test } from 'bun:test';
import { ALL_PARTS } from './parts';

// A guide link that 404s on the live site is worse than no link. Every
// YouTube link must name a real-format video ID (11 characters), which rules
// out placeholders like `watch?v=sample_mhd_b58`. The field is optional:
// leave it out until a walkthrough has been checked by hand.
const YOUTUBE_VIDEO = /^https:\/\/(www\.youtube\.com\/watch\?v=|youtu\.be\/)[A-Za-z0-9_-]{11}([&?#].*)?$/;

describe('curated part guide links', () => {
  test('YouTube links point at a real-format video ID', () => {
    const bad = ALL_PARTS.filter((p) => p.youtubeGuideUrl && !YOUTUBE_VIDEO.test(p.youtubeGuideUrl)).map(
      (p) => `${p.id}: ${p.youtubeGuideUrl}`,
    );
    expect(bad).toEqual([]);
  });

  test('install guide links are https', () => {
    const bad = ALL_PARTS.filter((p) => p.installGuideUrl && !p.installGuideUrl.startsWith('https://')).map(
      (p) => `${p.id}: ${p.installGuideUrl}`,
    );
    expect(bad).toEqual([]);
  });
});
