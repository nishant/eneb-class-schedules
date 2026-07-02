export const WEEKDAYS = ['M', 'Tu', 'W', 'Th', 'F'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** A single scheduled meeting of a section (one lecture/lab/discussion time slot). */
export interface Meeting {
  /** weekdays this meeting recurs on (weekend tokens are dropped) */
  days: Weekday[];
  /** minutes from midnight, used for positioning on the grid */
  startMinutes: number;
  endMinutes: number;
  /** original Testudo labels, e.g. "10:00am" / "12:30pm" */
  startLabel: string;
  endLabel: string;
  /** building code, e.g. "BLD4" ("" for online) */
  building: string;
  /** room number, e.g. "5321" (or "ONLINE") */
  room: string;
  online: boolean;
  /** "Lecture" | "Lab" | "Discussion" | ... (defaults to Lecture when Testudo omits it) */
  classType: string;
}

/** One section of a course, with its instructor(s) and meetings. */
export interface Section {
  courseId: string;
  courseTitle: string;
  sectionId: string;
  instructors: string[];
  online: boolean;
  meetings: Meeting[];
}
