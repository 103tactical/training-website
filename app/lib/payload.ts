const PAYLOAD_API_URL = process.env.PAYLOAD_API_URL ?? "https://training-cms.onrender.com";

export async function fetchPayload<T>(path: string): Promise<T> {
  const res = await fetch(`${PAYLOAD_API_URL}/api${path}`, {
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Payload fetch failed: ${res.status} ${res.statusText} (${path})`);
  }

  return res.json() as Promise<T>;
}

export async function getSiteSettings() {
  return fetchPayload<SiteSettings>("/globals/site-settings");
}

export async function getHomePage() {
  return fetchPayload<HomePage>("/globals/home-page?depth=2");
}

export async function getCourses() {
  return fetchPayload<{ docs: Course[] }>("/courses?where[isActive][equals]=true&sort=displayOrder");
}

// ── Types ──────────────────────────────────────────────────────────────────

export interface SiteSettings {
  logo?: { url: string; alt: string };
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
  featured: FeaturedSlide[];
  featuredCoursesHeading?: string;
  featuredCourses: Course[];
  whyChoose: {
    heading: string;
    items: {
      title: string;
      description?: string;
      bullets?: { item: string }[];
    }[];
  };
  badgesHeading?: string;
  badges: Badge[];
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
  verticalImage?: { url: string; alt: string };
  verticalVideo?: { url: string };
  heading?: string;
  subtext?: string;
  button?: { label?: string; url?: string; openInNewTab?: boolean };
}
