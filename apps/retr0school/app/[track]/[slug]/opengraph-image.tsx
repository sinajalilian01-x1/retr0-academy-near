import { getLesson, getLessons, getTrack, getTracks } from "@/lib/content";
import { ogCard, ogContentType, ogSize } from "@/lib/og-card";

export function generateStaticParams() {
  return getTracks().flatMap((track) =>
    getLessons(track.slug).map((lesson) => ({ track: track.slug, slug: lesson.slug })),
  );
}

export const alt = "Retr0school lesson";
export const size = ogSize;
export const contentType = ogContentType;

export default async function Image({ params }: { params: Promise<{ track: string; slug: string }> }) {
  const { track: trackSlug, slug } = await params;
  const track = getTrack(trackSlug);
  const lesson = getLesson(trackSlug, slug);
  return ogCard(track?.title ?? "Course", lesson?.title ?? "Lesson", lesson?.description ?? "A Retr0school lesson.");
}
