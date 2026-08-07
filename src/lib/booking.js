/** Shared Technonaire booking link (same across marketing, DineOS, Easy Website). */
export const DEFAULT_CALENDLY_URL = "https://calendly.com/technonaire/30min";

export const bookMeetingLabel = "Book a meeting";

export function getBookMeetingHref() {
  return process.env.NEXT_PUBLIC_CALENDLY_URL || DEFAULT_CALENDLY_URL;
}
