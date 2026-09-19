export const SOCIAL_LINKS = [
  {
    id: "linkedin",
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/meet-bhatt-655a89250/",
  },
  { id: "github", label: "GitHub", href: "https://github.com/Meet2304" },
  { id: "x", label: "X", href: "https://twitter.com/Meet2304" },
] as const;

export type SocialId = (typeof SOCIAL_LINKS)[number]["id"];
