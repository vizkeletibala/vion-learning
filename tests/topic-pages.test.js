import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLearningModel, trackPayload } from '../src/lib/learningModel.js';

test('CLF-C02 track payload exposes dedicated topic pages for cloud components and security', () => {
  const model = loadLearningModel();
  const payload = trackPayload(model, 'clf-c02');

  assert.ok(Array.isArray(payload.topicPages));
  const cloudComponents = payload.topicPages.find((page) => page.slug === 'cloud-components');
  const security = payload.topicPages.find((page) => page.slug === 'security');

  assert.ok(cloudComponents, 'expected a cloud-components topic page');
  assert.ok(security, 'expected a security topic page');

  assert.equal(cloudComponents.title, 'Cloud components');
  assert.match(cloudComponents.summary, /compute|storage|networking/i);
  assert.ok(cloudComponents.service_names.includes('Amazon EC2'));
  assert.ok(cloudComponents.service_names.includes('Amazon VPC'));
  assert.ok(cloudComponents.sections.length >= 2);

  assert.equal(security.title, 'Security and compliance');
  assert.match(security.summary, /security|compliance/i);
  assert.ok(security.service_names.includes('AWS IAM'));
  assert.ok(security.service_names.includes('AWS CloudTrail'));
  assert.ok(security.sections.length >= 2);
});

test('topic pages stay source backed and reference learning chunks', () => {
  const model = loadLearningModel();
  const payload = trackPayload(model, 'clf-c02');
  const page = payload.topicPages.find((candidate) => candidate.slug === 'security');

  assert.ok(page.chunk_ids.length > 0);
  assert.ok(page.source_links.length > 0);
  assert.ok(page.source_ids.length > 0);
  assert.ok(page.sections.every((section) => Array.isArray(section.items) && section.items.length > 0));
});
