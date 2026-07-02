import { parse, type HTMLElement } from 'node-html-parser';
import { WEEKDAYS, type Meeting, type Section, type Weekday } from './types';

const text = (el: HTMLElement | null): string => (el ? el.text.trim() : '');

/**
 * Testudo concatenates day tokens with no separator: M, Tu, W, Th, F (and weekend
 * Sa/Su). Tokens are variable length, so we greedily match the known set. Unknown
 * characters are skipped defensively.
 */
export function parseDays(raw: string): Weekday[] {
  // Longest-first so "Tu"/"Th" win before any single-letter match.
  const tokens = [...WEEKDAYS].sort((a, b) => b.length - a.length);
  const out: Weekday[] = [];
  let s = raw.trim();
  while (s.length > 0) {
    const tok = tokens.find((t) => s.startsWith(t));
    if (tok) {
      out.push(tok);
      s = s.slice(tok.length);
    } else {
      s = s.slice(1); // skip Sa/Su or stray whitespace
    }
  }
  return out;
}

/** "10:00am" / "1:50pm" -> minutes from midnight. */
export function parseTime(raw: string): number {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})\s*([ap])\.?m\.?$/i);
  if (!m) throw new Error(`Unparseable time: "${raw}"`);
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  const isPm = m[3]!.toLowerCase() === 'p';
  if (hour === 12) hour = isPm ? 12 : 0;
  else if (isPm) hour += 12;
  return hour * 60 + minute;
}

function parseMeeting(row: HTMLElement, sectionOnline: boolean): Meeting | null {
  const daysRaw = text(row.querySelector('.section-days'));
  const startLabel = text(row.querySelector('.class-start-time'));
  const endLabel = text(row.querySelector('.class-end-time'));
  if (!daysRaw || !startLabel || !endLabel) return null; // e.g. "TBA" rows

  const building = text(row.querySelector('.building-code'));
  const room = text(row.querySelector('.class-room'));
  // Testudo only emits .class-type for non-lecture meetings; absence => Lecture.
  const classType = text(row.querySelector('.class-type')) || 'Lecture';
  const online = sectionOnline || room.toUpperCase() === 'ONLINE' || building === '';

  return {
    days: parseDays(daysRaw),
    startMinutes: parseTime(startLabel),
    endMinutes: parseTime(endLabel),
    startLabel,
    endLabel,
    building,
    room,
    online,
    classType,
  };
}

/**
 * Parse the /sections endpoint HTML into Section[].
 * @param titles courseId -> title, from parseTitles(searchHtml)
 */
export function parseSections(html: string, titles: Map<string, string>): Section[] {
  const root = parse(html);
  const sections: Section[] = [];

  for (const courseEl of root.querySelectorAll('.course-sections')) {
    const courseId = courseEl.getAttribute('id') ?? '';
    const courseTitle = titles.get(courseId) ?? courseId;

    for (const sectionEl of courseEl.querySelectorAll('.section')) {
      const online = (sectionEl.getAttribute('class') ?? '').includes('delivery-online');
      const instructors = sectionEl
        .querySelectorAll('.section-instructor')
        .map((el) => el.text.trim())
        .filter(Boolean);

      const meetings: Meeting[] = [];
      const container = sectionEl.querySelector('.class-days-container');
      if (container) {
        // Every meeting is its own .row inside .class-days-container.
        for (const row of container.querySelectorAll('.row')) {
          const meeting = parseMeeting(row, online);
          if (meeting) meetings.push(meeting);
        }
      }

      sections.push({
        courseId,
        courseTitle,
        sectionId: text(sectionEl.querySelector('.section-id')),
        instructors,
        online,
        meetings,
      });
    }
  }

  return sections;
}

/** Parse the search-results HTML into courseId -> course title. */
export function parseTitles(html: string): Map<string, string> {
  const root = parse(html);
  const map = new Map<string, string>();
  for (const courseEl of root.querySelectorAll('.course')) {
    const id = text(courseEl.querySelector('.course-id'));
    const title = text(courseEl.querySelector('.course-title'));
    if (id) map.set(id, title);
  }
  return map;
}
