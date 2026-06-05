import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLearningModel } from '../src/lib/learningModel.js';

test('seed content remains original, source-linked, and includes richer CLF-C02 concept/question metadata', () => {
  const model = loadLearningModel();
  for (const track of Object.values(model.tracks)) {
    assert.ok(track.limitations.length > 0);
    for (const card of track.cards) {
      assert.ok(['original_seed', 'resource_explanation_corpus', 'concept_record'].includes(card.origin));
      assert.ok(card.short_answer);
      assert.ok(card.detailed_explanation);
      assert.ok(Array.isArray(card.source_links) && card.source_links.length > 0);
      assert.ok(card.last_verified);
      assert.ok(card.tags.length > 0);
      assert.ok(card.services.length > 0);
      assert.ok(card.topic_id);
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

  const clf = model.tracks['clf-c02'];
  const conceptCard = clf.cards.find((card) => card.origin === 'concept_record');
  assert.ok(conceptCard, 'expected CLF-C02 concept-backed cards');
  assert.ok(conceptCard.scenario?.length > 20);
  assert.ok(conceptCard.exam_angle?.length > 15);
  assert.ok(conceptCard.misconceptions?.length > 0);
  assert.ok(conceptCard.decision_rules?.length > 0);

  for (const question of clf.questionBank) {
    assert.ok(question.source_links.length > 0);
    assert.ok(question.common_misconceptions.length > 0);
    assert.ok(question.decision_rules.length > 0);
    assert.ok(question.answer_pattern_signature.includes('C'));
  }
});
