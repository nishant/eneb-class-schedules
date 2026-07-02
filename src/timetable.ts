import type { Cohort } from './config';
import { WEEKDAYS, type Section, type Weekday } from './types';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as const;
const DAY_INDEX: Record<Weekday, number> = { M: 0, Tu: 1, W: 2, Th: 3, F: 4 };

const PX_PER_MIN = 1.5;

// Course colour palette (background, accent border). Index = order within cohort.
const PALETTE = [
  ['#dbeafe', '#2563eb'],
  ['#dcfce7', '#16a34a'],
  ['#fef3c7', '#d97706'],
  ['#fce7f3', '#db2777'],
  ['#ede9fe', '#7c3aed'],
  ['#ccfbf1', '#0d9488'],
  ['#ffe4e6', '#e11d48'],
  ['#e0e7ff', '#4f46e5'],
  ['#fef9c3', '#ca8a04'],
  ['#d1fae5', '#059669'],
] as const;

interface Block {
  dayIndex: number;
  start: number;
  end: number;
  courseId: string;
  title: string;
  type: string;
  timeLabel: string;
  room: string;
  online: boolean;
  instructor: string;
  colorIndex: number;
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const TYPE_ABBREV: Record<string, string> = {
  Lecture: 'Lec',
  Laboratory: 'Lab',
  Lab: 'Lab',
  Discussion: 'Disc',
};
const abbrevType = (t: string): string => TYPE_ABBREV[t] ?? t;

function termLabel(term: string): string {
  const year = term.slice(0, 4);
  const season =
    ({ '01': 'Spring', '05': 'Summer', '08': 'Fall', '12': 'Winter' } as Record<string, string>)[
      term.slice(4, 6)
    ] ?? '';
  return `${season} ${year}`.trim();
}

function hourLabel(minutes: number): string {
  const h24 = Math.floor(minutes / 60);
  const ampm = h24 < 12 ? 'AM' : 'PM';
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h} ${ampm}`;
}

/** Pack a day's blocks into non-overlapping lanes; returns lane + total lanes for the day. */
function packLanes(blocks: Block[]): Array<{ block: Block; lane: number; lanes: number }> {
  const sorted = [...blocks].sort((a, b) => a.start - b.start || a.end - b.end);
  const laneEnds: number[] = [];
  const placed = sorted.map((block) => {
    let lane = laneEnds.findIndex((end) => end <= block.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(block.end);
    } else {
      laneEnds[lane] = block.end;
    }
    return { block, lane };
  });
  const lanes = Math.max(1, laneEnds.length);
  return placed.map((p) => ({ ...p, lanes }));
}

function buildBlocks(sections: Section[], courseOrder: string[]): Block[] {
  const colorIndexOf = (id: string): number => {
    const i = courseOrder.indexOf(id);
    return (i === -1 ? 0 : i) % PALETTE.length;
  };
  const blocks: Block[] = [];
  for (const section of sections) {
    const instructor = section.instructors.join(', ') || 'Instructor TBA';
    for (const m of section.meetings) {
      const room = m.online ? 'Online' : `${m.building} ${m.room}`.trim();
      for (const day of m.days) {
        const dayIndex = DAY_INDEX[day];
        blocks.push({
          dayIndex,
          start: m.startMinutes,
          end: m.endMinutes,
          courseId: section.courseId,
          title: section.courseTitle,
          type: m.classType,
          timeLabel: `${m.startLabel}–${m.endLabel}`,
          room,
          online: m.online,
          instructor,
          colorIndex: colorIndexOf(section.courseId),
        });
      }
    }
  }
  return blocks;
}

function renderBlock(block: Block, lane: number, lanes: number, winStart: number): string {
  const top = (block.start - winStart) * PX_PER_MIN;
  const height = (block.end - block.start) * PX_PER_MIN;
  const widthPct = 100 / lanes;
  const leftPct = lane * widthPct;
  const [, accent] = PALETTE[block.colorIndex]!;
  const roomLine = block.online
    ? `<span class="online">📶 Online</span>`
    : escapeHtml(block.room);
  return (
    `<div class="block c${block.colorIndex}" ` +
    `style="top:${top.toFixed(1)}px;height:${height.toFixed(1)}px;` +
    `left:calc(${leftPct}% + 2px);width:calc(${widthPct}% - 4px);border-left-color:${accent}">` +
    `<div class="b-head">${escapeHtml(block.courseId)} · ${escapeHtml(abbrevType(block.type))}</div>` +
    `<div class="b-title">${escapeHtml(block.title)}</div>` +
    `<div class="b-meta">${escapeHtml(block.timeLabel)}</div>` +
    `<div class="b-meta">${roomLine}</div>` +
    `<div class="b-prof">${escapeHtml(block.instructor)}</div>` +
    `</div>`
  );
}

function renderLegend(sections: Section[], courseOrder: string[]): string {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const id of courseOrder) {
    if (seen.has(id)) continue;
    const section = sections.find((s) => s.courseId === id);
    if (!section) continue;
    seen.add(id);
    const idx = courseOrder.indexOf(id) % PALETTE.length;
    const prof = section.instructors.join(', ') || 'Instructor TBA';
    items.push(
      `<div class="chip c${idx}">` +
        `<span class="chip-code">${escapeHtml(id)}</span> ` +
        `<span class="chip-title">${escapeHtml(section.courseTitle)}</span> ` +
        `<span class="chip-prof">${escapeHtml(prof)}</span>` +
        `</div>`,
    );
  }
  return `<div class="legend">${items.join('')}</div>`;
}

/** Friendly overview page linking to each cohort's timetable. */
export function renderIndex(
  entries: Array<{ cohort: Cohort; sections: Section[] }>,
  term: string,
  generatedAt: string,
): string {
  const cards = entries
    .map(({ cohort, sections }, i) => {
      const accent = PALETTE[i % PALETTE.length]![1];
      const courseCount = new Set(sections.map((s) => s.courseId)).size;
      const codes = cohort.courseIds.map((c) => escapeHtml(c)).join(' · ');
      return (
        `<a class="card" href="${escapeHtml(cohort.key)}.html" style="border-top-color:${accent}">` +
        `<div class="card-label">${escapeHtml(cohort.label)}</div>` +
        `<div class="card-sem">${escapeHtml(cohort.semester)} · ${courseCount} classes</div>` +
        `<div class="card-codes">${codes}</div>` +
        `<div class="card-cta">View weekly schedule →</div>` +
        `</a>`
      );
    })
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>ENEB Class Schedules — ${escapeHtml(termLabel(term))}</title>
<style>
  * { box-sizing:border-box; }
  body { margin:0; padding:40px 20px; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:#111827; background:#f9fafb; }
  .wrap { max-width:720px; margin:0 auto; }
  h1 { margin:0 0 4px; font-size:26px; }
  .sub { color:#6b7280; font-size:14px; margin-bottom:28px; }
  .cards { display:flex; flex-wrap:wrap; gap:16px; }
  .card { flex:1 1 260px; display:block; text-decoration:none; color:inherit; background:#fff; border:1px solid #e5e7eb; border-top:4px solid; border-radius:12px; padding:20px; box-shadow:0 1px 3px rgba(0,0,0,.06); transition:box-shadow .15s, transform .15s; }
  .card:hover { box-shadow:0 6px 16px rgba(0,0,0,.10); transform:translateY(-2px); }
  .card-label { font-size:19px; font-weight:700; }
  .card-sem { color:#6b7280; font-size:13px; margin-top:2px; }
  .card-codes { font-size:12px; color:#374151; margin-top:12px; line-height:1.5; }
  .card-cta { margin-top:16px; font-weight:600; color:#2563eb; font-size:14px; }
  footer { color:#9ca3af; font-size:12px; margin-top:28px; }
</style>
</head>
<body>
  <div class="wrap">
    <h1>ENEB Class Schedules</h1>
    <div class="sub">${escapeHtml(termLabel(term))} · University of Maryland · Cyber-Physical Systems Engineering</div>
    <div class="cards">${cards}</div>
    <footer>Last updated ${escapeHtml(generatedAt)} · Data from the UMD Testudo Schedule of Classes.</footer>
  </div>
</body>
</html>`;
}

export function renderTimetable(cohort: Cohort, sections: Section[], term: string): string {
  const blocks = buildBlocks(sections, cohort.courseIds);

  const winStart = blocks.length ? Math.floor(Math.min(...blocks.map((b) => b.start)) / 60) * 60 : 8 * 60;
  const winEnd = blocks.length ? Math.ceil(Math.max(...blocks.map((b) => b.end)) / 60) * 60 : 18 * 60;
  const totalHeight = (winEnd - winStart) * PX_PER_MIN;

  // Hour gridlines + axis labels.
  const hourLines: string[] = [];
  const axisLabels: string[] = [];
  for (let min = winStart; min <= winEnd; min += 60) {
    const top = (min - winStart) * PX_PER_MIN;
    hourLines.push(`<div class="hline" style="top:${top.toFixed(1)}px"></div>`);
    axisLabels.push(`<div class="hlabel" style="top:${top.toFixed(1)}px">${hourLabel(min)}</div>`);
  }

  // Day columns with lane-packed blocks.
  const dayCols = DAY_NAMES.map((_, dayIndex) => {
    const dayBlocks = blocks.filter((b) => b.dayIndex === dayIndex);
    const packed = packLanes(dayBlocks);
    const rendered = packed.map((p) => renderBlock(p.block, p.lane, p.lanes, winStart)).join('');
    return `<div class="day-col">${rendered}</div>`;
  }).join('');

  const dayHeads = DAY_NAMES.map((d) => `<div class="day-head">${d}</div>`).join('');
  const title = `${cohort.label} — ${escapeHtml(termLabel(term))}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root { --line:#e5e7eb; --ink:#111827; --muted:#6b7280; --axis-w:58px; }
  * { box-sizing: border-box; }
  body { margin:0; padding:24px; max-width:1200px; margin-inline:auto; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:var(--ink); background:#f9fafb; }
  a.back { display:inline-block; margin-bottom:10px; color:#2563eb; text-decoration:none; font-size:13px; }
  a.back:hover { text-decoration:underline; }
  header.page-head { margin:0 0 4px; }
  header.page-head h1 { margin:0; font-size:22px; }
  header.page-head .sub { color:var(--muted); font-size:13px; margin-top:2px; }
  .legend { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0 18px; }
  .chip { font-size:12px; padding:5px 9px; border-radius:6px; border-left:4px solid; }
  .chip-code { font-weight:700; }
  .chip-title { }
  .chip-prof { color:var(--muted); }
  .cal-scroll { overflow-x:auto; -webkit-overflow-scrolling:touch; }
  .cal { background:#fff; border:1px solid var(--line); border-radius:10px; overflow:hidden; min-width:720px; }
  .cal-head { display:flex; border-bottom:1px solid var(--line); background:#fff; position:sticky; top:0; z-index:5; }
  .axis-corner { width:var(--axis-w); flex:0 0 var(--axis-w); border-right:1px solid var(--line); }
  .day-heads { display:grid; grid-template-columns:repeat(5,1fr); flex:1; }
  .day-head { text-align:center; font-weight:600; font-size:13px; padding:10px 4px; border-left:1px solid var(--line); }
  .day-head:first-child { border-left:none; }
  .cal-body { display:flex; position:relative; }
  .axis { width:var(--axis-w); flex:0 0 var(--axis-w); position:relative; border-right:1px solid var(--line); }
  .hlabel { position:absolute; right:6px; transform:translateY(-50%); font-size:11px; color:var(--muted); }
  .days { position:relative; flex:1; display:grid; grid-template-columns:repeat(5,1fr); }
  .grid-lines { position:absolute; inset:0; pointer-events:none; }
  .hline { position:absolute; left:0; right:0; border-top:1px solid var(--line); }
  .day-col { position:relative; border-left:1px solid var(--line); }
  .day-col:first-child { border-left:none; }
  .block { position:absolute; border-radius:6px; border-left:4px solid; padding:4px 6px; overflow:hidden; box-shadow:0 1px 2px rgba(0,0,0,.06); line-height:1.15; }
  .b-head { font-weight:700; font-size:11px; }
  .b-title { font-size:11px; margin-top:1px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
  .b-meta { font-size:10px; color:#374151; margin-top:1px; }
  .b-meta .online { font-weight:600; }
  .b-prof { font-size:10px; margin-top:2px; font-style:italic; color:#1f2937; }
  ${PALETTE.map(([bg, accent], i) => `.c${i}{background:${bg};} .chip.c${i}{background:${bg};border-left-color:${accent};} .block.c${i}{border-left-color:${accent};}`).join('\n  ')}
  @media print {
    body { padding:0; background:#fff; }
    .cal { border:none; border-radius:0; }
    .cal-head { position:static; }
  }
</style>
</head>
<body>
  <a class="back" href="index.html">← All schedules</a>
  <header class="page-head">
    <h1>${escapeHtml(title)}</h1>
    <div class="sub">${escapeHtml(cohort.semester)} · ${escapeHtml(cohort.courseIds.length.toString())} courses · source: UMD Testudo Schedule of Classes</div>
  </header>
  ${renderLegend(sections, cohort.courseIds)}
  <div class="cal-scroll">
    <div class="cal">
      <div class="cal-head">
        <div class="axis-corner"></div>
        <div class="day-heads">${dayHeads}</div>
      </div>
      <div class="cal-body" style="height:${totalHeight.toFixed(1)}px">
        <div class="axis">${axisLabels.join('')}</div>
        <div class="days">
          <div class="grid-lines">${hourLines.join('')}</div>
          ${dayCols}
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
