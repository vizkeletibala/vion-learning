import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLearningModel } from '../src/lib/learningModel.js';

test('seed content remains original, source-linked, and includes richer CLF-C02 concept/question metadata', () => {
  const model = loadLearningModel();
  for (const track of Object.values(model.tracks)) {
    assert.ok(track.limitations.length > 0);
    if (track.id === 'german-b2-exam') {
      assert.equal(track.sources.length, 2, 'German B2 should expose embedded lesson-1 source provenance without creating quiz/card corpora');
      assert.equal(track.sources.every((source) => source.track_id === 'german-b2-exam'), true);
      assert.equal(track.sources.every((source) => source.citation_text && source.source_file && source.freshness_status === 'embedded_source'), true);
      assert.equal(track.sources.some((source) => source.source_file === 'data/sources/german-b2/lesson-1-corpus.md'), true);
      assert.deepEqual(track.cards, []);
      assert.deepEqual(track.questions, []);
      continue;
    }
    assert.ok(Array.isArray(track.sources) && track.sources.length > 0);
    assert.ok(track.sources.every((source) => source.track_id === track.id));
    assert.ok(track.sources.every((source) => source.citation_text));
    assert.ok(track.sources.every((source) => source.last_checked_at || source.last_verified_date));
    assert.ok(track.sources.every((source) => source.freshness_status || source.refresh_status));
    for (const card of track.cards) {
      assert.ok(['original_seed', 'resource_explanation_corpus', 'concept_record'].includes(card.origin));
      assert.ok(card.short_answer);
      assert.ok(card.detailed_explanation);
      assert.ok(Array.isArray(card.source_links) && card.source_links.length > 0);
      assert.ok(Array.isArray(card.source_ids));
      assert.ok(card.last_verified);
      assert.ok(card.tags.length > 0);
      assert.ok(card.services.length > 0);
      assert.ok(card.topic_id);
    }
    for (const video of track.videos) {
      assert.equal(video.track_id, track.id);
      assert.ok(video.provider);
      assert.ok(video.url);
      assert.ok(video.metadata_status);
    }
  }

  const clf = model.tracks['clf-c02'];
  const conceptCard = clf.cards.find((card) => card.origin === 'concept_record');
  assert.ok(conceptCard, 'expected CLF-C02 concept-backed cards');
  assert.ok(conceptCard.scenario?.length > 20);
  assert.ok(conceptCard.exam_angle?.length > 15);
  assert.ok(conceptCard.misconceptions?.length > 0);
  assert.ok(conceptCard.decision_rules?.length > 0);
  assert.ok(conceptCard.source_ids.length > 0);

  for (const question of clf.questionBank) {
    assert.ok(question.source_links.length > 0);
    assert.ok(question.source_ids.length > 0);
    assert.ok(question.common_misconceptions.length > 0);
    assert.ok(question.decision_rules.length > 0);
    assert.ok(question.answer_pattern_signature.includes('C'));
  }
});
