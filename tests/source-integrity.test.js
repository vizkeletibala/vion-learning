import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLearningModel } from '../src/lib/learningModel.js';

test('seed content is original trainer content and includes required source/video metadata fields', () => {
  const model = loadLearningModel();
  for (const track of Object.values(model.tracks)) {
    assert.ok(track.limitations.length > 0);
    for (const card of track.cards) {
      assert.ok(['original_seed', 'resource_explanation_corpus'].includes(card.origin));
      assert.ok(card.short_answer);
      assert.ok(card.detailed_explanation);
      assert.ok(Array.isArray(card.source_links) && card.source_links.length > 0);
      assert.ok(card.last_verified);
      assert.ok(card.tags.length > 0);
      assert.ok(card.services.length > 0);
    }
    for (const source of track.sources) {
      assert.equal(source.track_id, track.id);
      assert.ok(source.url);
      assert.ok(source.last_verified_date);
      assert.ok(source.refresh_status);
    }
    for (const video of track.videos) {
      assert.equal(video.track_id, track.id);
      assert.ok(video.provider);
      assert.ok(video.url);
      assert.ok(video.metadata_status);
    }
  }
});
