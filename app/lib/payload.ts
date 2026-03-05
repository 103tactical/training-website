export const PAYLOAD_API_URL =
  typeof process !== "undefined" && process.env.PAYLOAD_API_URL
    ? process.env.PAYLOAD_API_URL
    : "https://training-cms.onrender.com";

export function resolveMediaUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith("http") ? url : `${PAYLOAD_API_URL}${url}`;
}

export async function fetchPayload<T>(path: string): Promise<T> {
  const res = await fetch(`${PAYLOAD_API_URL}/api${path}`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    throw new Error(`Payload fetch failed: ${res.status} ${res.statusText} (${path})`);
  }

  return res.json() as Promise<T>;
}

export async function getSiteSettings() {
  return fetchPayload<SiteSettings>("/globals/site-settings");
}

export async function getUtility() {
  return fetchPayload<Utility>("/globals/utility");
}

export async function getHomePage() {
  return fetchPayload<HomePage>("/globals/home-page?depth=2");
}

export async function getCourses() {
  return fetchPayload<{ docs: Course[] }>("/courses?where[isActive][equals]=true&sort=displayOrder");
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface Utility {
  carouselDelay?: "off" | "4" | "6" | "8" | "10";
}

export interface SiteSettings {
  logo?: { url: string; alt: string };
  logoFooter?: { url: string; alt: string };
  nav: { label: string; url: string; openInNewTab: boolean }[];
  contact: {
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
  };
  social: { platform: string; url: string }[];
  copyright?: string;
}

export interface HomePage {
  websiteHeadline?: string;
  featured: FeaturedSlide[];
  featuredCoursesSection?: {
    heading?: string;
    courses: Course[];
  };
  whyChoose: {
    heading: string;
    items: {
      title: string;
      description?: string;
      bullets?: { item: string }[];
    }[];
  };
  badgesSection?: {
    heading?: string;
    badges: Badge[];
  };
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  thumbnail?: { url: string; alt: string };
  summary?: { item: string }[];
  price?: number;
  isActive: boolean;
}

export interface Badge {
  id: string;
  name: string;
  image: { url: string; alt?: string };
  url: string;
}

export interface FeaturedSlide {
  slideType: "image" | "image-text" | "video";
  wideImage?: { url: string; alt: string };
  wideVideo?: { url: string };
  wideVideoPreview?: { url: string; alt?: string };
  verticalImage?: { url: string; alt: string };
  verticalVideo?: { url: string };
  verticalVideoPreview?: { url: string; alt?: string };
  heading?: string;
  subtext?: string;
  button?: { label?: string; url?: string; openInNewTab?: boolean };
}
