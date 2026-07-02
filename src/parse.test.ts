import assert from 'node:assert/strict';
import test from 'node:test';

import { parseDays, parseSections, parseTime, parseTitles } from './parse';

test('parseDays splits multi-letter tokens correctly', () => {
  assert.deepEqual(parseDays('M'), ['M']);
  assert.deepEqual(parseDays('MW'), ['M', 'W']);
  assert.deepEqual(parseDays('MWF'), ['M', 'W', 'F']);
  assert.deepEqual(parseDays('TuTh'), ['Tu', 'Th']);
  assert.deepEqual(parseDays('MTuWThF'), ['M', 'Tu', 'W', 'Th', 'F']);
  assert.deepEqual(parseDays('Tu'), ['Tu']);
  assert.deepEqual(parseDays('Th'), ['Th']);
});

test('parseDays ignores unknown/weekend tokens', () => {
  assert.deepEqual(parseDays(''), []);
  assert.deepEqual(parseDays('Sa'), []); // weekend dropped
  assert.deepEqual(parseDays('MSaW'), ['M', 'W']);
});

test('parseTime converts am/pm to minutes from midnight', () => {
  assert.equal(parseTime('8:30am'), 8 * 60 + 30);
  assert.equal(parseTime('10:00am'), 600);
  assert.equal(parseTime('12:00pm'), 720); // noon
  assert.equal(parseTime('12:30pm'), 750);
  assert.equal(parseTime('1:50pm'), 13 * 60 + 50);
  assert.equal(parseTime('7:00pm'), 19 * 60);
  assert.equal(parseTime('12:00am'), 0); // midnight
});

test('parseTime rejects garbage', () => {
  assert.throws(() => parseTime('TBA'));
  assert.throws(() => parseTime('25:00'));
});

// Minimal fixtures mirroring the real Testudo DOM.
const SECTIONS_HTML = `
<div id="ENEB302" class="course-sections">
  <div class="section delivery-f2f">
    <span class="section-id"> ESG1 </span>
    <span class="section-instructors">
      <span class="section-instructor"><a href="#">Wesley Lawson</a></span>
    </span>
    <div class="class-days-container">
      <div class="row">
        <div class="section-day-time-group">
          <span class="section-days">M</span>
          <span class="class-start-time">10:00am</span> - <span class="class-end-time">12:30pm</span>
        </div>
        <div class="section-class-building-group">
          <span class="class-building"><span class="building-code">BLD4</span><span class="class-room">5321</span></span>
        </div>
      </div>
      <div class="row">
        <div class="section-day-time-group">
          <span class="section-days">Th</span>
          <span class="class-start-time">12:30pm</span> - <span class="class-end-time">3:20pm</span>
        </div>
        <div class="section-class-building-group">
          <span class="class-building"><span class="building-code">BLD4</span><span class="class-room">5202</span></span>
        </div>
        <div class="two columns"><span class="class-type">Lab</span></div>
      </div>
    </div>
  </div>
</div>
<div id="ENEB354" class="course-sections">
  <div class="section delivery-online">
    <span class="section-id"> ESG1 </span>
    <span class="section-instructors">
      <span class="section-instructor">Yavuz Oruc</span>
    </span>
    <div class="class-days-container">
      <div class="row">
        <div class="section-day-time-group">
          <span class="section-days">Tu</span>
          <span class="class-start-time">8:30am</span> - <span class="class-end-time">11:00am</span>
        </div>
        <div class="section-class-building-group">
          <span class="class-building"><span class="class-room">ONLINE</span></span>
        </div>
      </div>
    </div>
  </div>
</div>`;

const SEARCH_HTML = `
<div id="ENEB302" class="course">
  <div class="course-id">ENEB302</div>
  <span class="course-title">Analog Circuits</span>
</div>
<div id="ENEB354" class="course">
  <div class="course-id">ENEB354</div>
  <span class="course-title">Discrete Mathematics for Information Technology</span>
</div>`;

test('parseTitles maps course id to title', () => {
  const titles = parseTitles(SEARCH_HTML);
  assert.equal(titles.get('ENEB302'), 'Analog Circuits');
  assert.equal(titles.get('ENEB354'), 'Discrete Mathematics for Information Technology');
});

test('parseSections extracts instructors, meetings, class type, and online room', () => {
  const titles = parseTitles(SEARCH_HTML);
  const sections = parseSections(SECTIONS_HTML, titles);
  assert.equal(sections.length, 2);

  const eneb302 = sections.find((s) => s.courseId === 'ENEB302');
  assert.ok(eneb302);
  assert.equal(eneb302.courseTitle, 'Analog Circuits');
  assert.equal(eneb302.sectionId, 'ESG1');
  assert.deepEqual(eneb302.instructors, ['Wesley Lawson']); // <a> unwrapped to text
  assert.equal(eneb302.meetings.length, 2);

  const [lecture, lab] = eneb302.meetings;
  assert.ok(lecture && lab);
  assert.equal(lecture.classType, 'Lecture'); // no .class-type => Lecture
  assert.deepEqual(lecture.days, ['M']);
  assert.equal(lecture.building, 'BLD4');
  assert.equal(lecture.room, '5321');
  assert.equal(lecture.online, false);
  assert.equal(lab.classType, 'Lab');
  assert.deepEqual(lab.days, ['Th']);

  const eneb354 = sections.find((s) => s.courseId === 'ENEB354');
  assert.ok(eneb354);
  assert.equal(eneb354.online, true);
  assert.equal(eneb354.meetings[0]?.online, true);
  assert.equal(eneb354.meetings[0]?.room, 'ONLINE');
});
