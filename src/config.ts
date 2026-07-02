// The ONLY file you need to edit to regenerate for a different term or cohort layout.
//
// Testudo term id format: <year><month>  — 01=Spring, 05=Summer, 08=Fall, 12=Winter.
export const TERM = '202608'; // Fall 2026
export const COURSE_PREFIX = 'ENEB';

export interface Cohort {
  /** file/base name for the generated html (out/<key>.html) */
  key: string;
  /** heading shown at the top of the timetable */
  label: string;
  /** which semester of the sample plan this cohort maps to */
  semester: string;
  /** courses to place on this cohort's calendar, in preferred legend order */
  courseIds: string[];
}

// Cohort → course mapping comes from the ENEB "Sample Four-Semester Plan":
//   Semester 1 = Junior cohort, Semester 3 = Senior cohort.
// (Semesters 2 & 4 are spring courses and are not offered in the Fall term.)
export const COHORTS: Cohort[] = [
  {
    key: 'junior',
    label: 'Junior Cohort',
    semester: 'Semester 1',
    courseIds: ['ENEB302', 'ENEB340', 'ENEB341', 'ENEB344', 'ENEB354'],
  },
  {
    key: 'senior',
    label: 'Senior Cohort',
    semester: 'Semester 3',
    // ENGL3XX "Professional Writing" is intentionally omitted: it is not an ENEB
    // course and has no scrapeable section/time/professor on the Testudo ENEB page.
    courseIds: ['ENEB408A', 'ENEB454', 'ENEB444', 'ENEB346'],
  },
];
