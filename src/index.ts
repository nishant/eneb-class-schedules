import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { COHORTS, COURSE_PREFIX, TERM } from './config';
import { fetchSearchHtml, fetchSectionsHtml } from './fetch';
import { parseSections, parseTitles } from './parse';
import { renderIndex, renderTimetable } from './timetable';
import type { Section } from './types';

// Output straight into docs/ so GitHub Pages can serve it with zero config.
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs');

async function main(): Promise<void> {
  const courseIds = [...new Set(COHORTS.flatMap((c) => c.courseIds))];
  console.log(`Fetching ${COURSE_PREFIX} schedule for term ${TERM} (${courseIds.length} courses)…`);

  const [searchHtml, sectionsHtml] = await Promise.all([
    fetchSearchHtml(TERM, COURSE_PREFIX),
    fetchSectionsHtml(courseIds, TERM),
  ]);

  const titles = parseTitles(searchHtml);
  const sections = parseSections(sectionsHtml, titles);

  const byCourse = new Map<string, Section[]>();
  for (const section of sections) {
    const list = byCourse.get(section.courseId) ?? [];
    list.push(section);
    byCourse.set(section.courseId, list);
  }

  await mkdir(OUT_DIR, { recursive: true });
  // GitHub Pages runs Jekyll by default; .nojekyll serves our files as-is.
  await writeFile(join(OUT_DIR, '.nojekyll'), '', 'utf8');

  const entries: Array<{ cohort: (typeof COHORTS)[number]; sections: Section[] }> = [];

  for (const cohort of COHORTS) {
    const cohortSections: Section[] = [];
    for (const id of cohort.courseIds) {
      const found = byCourse.get(id);
      if (!found || found.length === 0) {
        console.warn(`  ⚠ ${id}: no sections found on Testudo — skipped`);
        continue;
      }
      cohortSections.push(...found);
    }

    const html = renderTimetable(cohort, cohortSections, TERM);
    const file = join(OUT_DIR, `${cohort.key}.html`);
    await writeFile(file, html, 'utf8');
    entries.push({ cohort, sections: cohortSections });

    const meetings = cohortSections.reduce((n, s) => n + s.meetings.length, 0);
    console.log(`  ✓ ${cohort.label}: ${cohortSections.length} sections, ${meetings} meetings → ${file}`);
  }

  const generatedAt = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  await writeFile(join(OUT_DIR, 'index.html'), renderIndex(entries, TERM, generatedAt), 'utf8');
  console.log(`  ✓ Overview page → ${join(OUT_DIR, 'index.html')}`);

  console.log('Done.');
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
