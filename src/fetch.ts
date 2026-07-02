import { TERM, COURSE_PREFIX } from './config';

const BASE = 'https://app.testudo.umd.edu/soc';

// GOTCHA: Testudo returns only the empty search *form* (no course rows) unless the
// request carries a browser-like User-Agent. The /sections endpoint is less picky,
// but we send the UA on both for consistency.
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

async function get(url: string): Promise<string> {
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
  }
  return res.text();
}

/** Search-results page — the only place course *titles* live. */
export function searchUrl(term = TERM, prefix = COURSE_PREFIX): string {
  const params = new URLSearchParams({
    courseId: prefix,
    sectionId: '',
    termId: term,
    _openSectionsOnly: 'on',
    creditCompare: '>=',
    credits: '0.0',
    courseLevelFilter: 'ALL',
    instructor: '',
    _facetoface: 'on',
    _blended: 'on',
    _online: 'on',
    teachingCenter: 'ALL',
    _classDay1: 'on',
    _classDay2: 'on',
    _classDay3: 'on',
    _classDay4: 'on',
    _classDay5: 'on',
  });
  return `${BASE}/search?${params.toString()}`;
}

/** Per-section endpoint — instructor, days, times, room, class type. */
export function sectionsUrl(courseIds: string[], term = TERM): string {
  return `${BASE}/${term}/sections?courseIds=${courseIds.join(',')}`;
}

export const fetchSearchHtml = (term = TERM, prefix = COURSE_PREFIX): Promise<string> =>
  get(searchUrl(term, prefix));

export const fetchSectionsHtml = (courseIds: string[], term = TERM): Promise<string> =>
  get(sectionsUrl(courseIds, term));
