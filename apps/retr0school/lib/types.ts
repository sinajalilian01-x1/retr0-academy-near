export type TrackGroup = "web3" | "foundations" | "diploma";

export type Track = {
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  group: TrackGroup;
  listed: boolean;
  level?: string;
  prerequisites: string[];
  youWillBuild?: string;
  overview?: string;
};

export type LessonSummary = {
  slug: string;
  title: string;
  description: string;
  order: number;
  tags: string[];
  track: string;
  readingMinutes: number;
};

export type Lesson = LessonSummary & {
  body: string;
  plainText: string;
};

export type QuizQuestion = {
  question: string;
  options: string[];
  /** Omitted for server-graded quizzes (the NEAR track), whose key lives only in the grader's env. */
  answer?: number;
  explanation: string;
};

export type SearchEntry = {
  href: string;
  title: string;
  description: string;
  track: string;
  trackTitle: string;
  tags: string[];
  text: string;
};

export type NavItem = {
  href: string;
  title: string;
  key: string;
};

export type QuizScore = {
  correct: number;
  total: number;
};

export type ProgressState = {
  lessons: string[];
  quizzes: Record<string, QuizScore>;
};
