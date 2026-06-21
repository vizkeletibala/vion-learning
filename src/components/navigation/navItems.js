export const TRACKS = [
  {
    id: 'clf-c02',
    code: 'CLF-C02',
    name: 'AWS Certified Cloud Practitioner',
    description: 'Foundational AWS cloud fluency, shared responsibility, billing, support, and core services.',
  },
  {
    id: 'aif-c01',
    code: 'AIF-C01',
    name: 'AWS Certified AI Practitioner',
    description: 'AI/ML fundamentals, responsible AI, generative AI concepts, and AWS AI services.',
  },
];

export const GERMAN_B2_TRACK = {
  id: 'german-b2-exam',
  code: 'GERMAN B2',
  name: 'German B2 Exam',
  description: 'Personalized tutor track built gradually from private German B2 notes.',
  mode: 'personalized-tutor',
};

export const SHARED_UPLOAD_TRACK = {
  id: 'shared',
  code: 'SHARED',
  name: 'Shared intake lane',
  description: 'Upload-only private staging lane for shared provenance-bearing documents.',
  mode: 'uploads-only',
};

export const KNOWN_TRACKS = [...TRACKS, GERMAN_B2_TRACK];

export const UPLOAD_TRACKS = [
  ...KNOWN_TRACKS,
  SHARED_UPLOAD_TRACK,
].map((track) => ({ ...track, mode: track.mode || 'learning+uploads' }));

export const TRACK_SECTIONS = [
  { id: 'overview', label: 'Overview', group: 'track', description: 'Readiness, domains, milestones, and next action.' },
  { id: 'learn', label: 'Learn', group: 'practice', description: 'Roadmap, source-backed chunks, and review queue.' },
  { id: 'topics', label: 'Topics', group: 'practice', description: 'Focused study pages with source links.' },
  { id: 'quiz', label: 'Quiz', group: 'practice', description: 'Quick/domain drills with review feedback.' },
  { id: 'study-plan', label: 'Study Plan', group: 'practice', description: '7/14/30-day learning plans.' },
  { id: 'console', label: 'Console Practice', group: 'practice', description: 'Guided AWS console labs and cleanup notes.' },
  { id: 'progress', label: 'Progress', group: 'status', description: 'Readiness history and review signals.' },
  { id: 'sources', label: 'Sources', group: 'status', description: 'Source verification, freshness, and provenance.' },
];

export const TRACK_SECTION_OVERRIDES = {
  'german-b2-exam': ['overview', 'learn', 'progress', 'sources'],
};

export function getTrackSections(trackId) {
  const allowedSectionIds = TRACK_SECTION_OVERRIDES[trackId];
  return allowedSectionIds
    ? TRACK_SECTIONS.filter((section) => allowedSectionIds.includes(section.id))
    : TRACK_SECTIONS;
}

export function getPracticeSections(trackId) {
  return getTrackSections(trackId).filter((section) => section.group === 'practice');
}

export function getStatusSections(trackId) {
  return getTrackSections(trackId).filter((section) => section.group === 'status');
}

export const PRACTICE_SECTIONS = getPracticeSections();
export const STATUS_SECTIONS = getStatusSections();

export function trackPath(trackId, sectionId = 'overview') {
  return `/tracks/${trackId}/${sectionId}`;
}

export function getTrack(trackId) {
  return KNOWN_TRACKS.find((track) => track.id === trackId) || null;
}
