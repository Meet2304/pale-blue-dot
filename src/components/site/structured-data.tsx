import { CONTACT, type Unit } from "@/content/work";

import {
  absoluteUrl,
  PERSON_ID,
  SAME_AS,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_ORIGIN,
  WEBSITE_ID,
} from "@/lib/site";

/** JSON-LD, with `<` escaped so a string in the graph cannot close the script. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/** The person and the site, on every page, so the name is one entity. */
export function IdentityJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            "@id": WEBSITE_ID,
            url: absoluteUrl("/"),
            name: SITE_NAME,
            description: SITE_DESCRIPTION,
            inLanguage: "en",
            publisher: { "@id": PERSON_ID },
          },
          {
            "@type": "Person",
            "@id": PERSON_ID,
            name: SITE_NAME,
            givenName: "Meet",
            familyName: "Bhatt",
            alternateName: ["Meet", "Meet2304"],
            url: absoluteUrl("/"),
            description: SITE_DESCRIPTION,
            jobTitle: "AI engineer and product builder",
            email: CONTACT.email,
            sameAs: [...SAME_AS],
            affiliation: {
              "@type": "CollegeOrUniversity",
              name: "Carnegie Mellon University",
              sameAs: "https://www.cmu.edu/",
            },
            alumniOf: {
              "@type": "CollegeOrUniversity",
              name: "Pandit Deendayal Energy University",
            },
          },
        ],
      }}
    />
  );
}

/** The home page is a profile of that person. */
export function ProfileJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        "@id": `${SITE_ORIGIN}/#profile`,
        url: absoluteUrl("/"),
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        mainEntity: { "@id": PERSON_ID },
        isPartOf: { "@id": WEBSITE_ID },
      }}
    />
  );
}

/** One piece of work, credited to him, with a trail back to the home page. */
export function WorkJsonLd({ unit }: { unit: Unit }) {
  const url = absoluteUrl(`/work/${unit.id}`);
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "CreativeWork",
            "@id": `${url}#work`,
            url,
            name: unit.name,
            description: unit.brief,
            author: { "@id": PERSON_ID },
            isPartOf: { "@id": WEBSITE_ID },
          },
          {
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: SITE_NAME,
                item: absoluteUrl("/"),
              },
              {
                "@type": "ListItem",
                position: 2,
                name: unit.name,
                item: url,
              },
            ],
          },
        ],
      }}
    />
  );
}
