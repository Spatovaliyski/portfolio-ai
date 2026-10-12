import {
  contentSchema,
  type Entity,
  type EntityKind,
  type PortfolioContent,
} from '../domain/schema.ts';
import legacyNotes from './legacy-notes.json' with { type: 'json' };

const entity = (
  id: string,
  kind: EntityKind,
  data: Record<string, unknown>,
  sortOrder = 0,
): Entity => ({ id, kind, status: 'published', sortOrder, data });
const seo = (title: string, description: string) => ({ title, description });
const addonNames = [
  'PlateSCT',
  'ClassicNumbersEx',
  'EasySummon',
  'RaidOpacity',
  'sBoard',
  'EasyMill',
];
const addonIds = [1343190310, 841917085, 959503918, 1134458912, 1053249260, 1016232714];
const addonDescriptions = [
  'Floating nameplate combat text with damage filters, number styles, and optional critical-hit sounds.',
  'A maintenance update to ClassicNumbers. Discontinued; its Midnight features continue in PlateSCT.',
  'A Warlock summon queue that detects requests in chat, with list and grid views.',
  'Opacity and background fade controls for Blizzard raid frames.',
  'Chat messages collected into a tidy services board.',
  'Milling batch estimates using Auctionator prices, with a test mode.',
];
const pageTitles: Record<string, [string, string, string]> = {
  '/': [
    'Engineering & independent products',
    'Interfaces that work. Products that ship.',
    'I build thoughtful interfaces, own the details, and stay close to the people using them.',
  ],
  '/projects/': [
    'Selected work',
    'From idea to everyday use.',
    'Independent products and professional work, with a clear account of my contribution.',
  ],
  '/pet-projects/': [
    'After hours',
    'Small tools. Real communities.',
    'World of Warcraft addons: focused experiments in interfaces, platform constraints, and ongoing maintenance.',
  ],
  '/experience/': [
    'Experience',
    'A career built by shipping.',
    'Production interfaces, product ownership, and work across teams and platforms.',
  ],
  '/about/': [
    'About',
    'The person behind the interface.',
    'I’m Martin Spatovaliyski, a front-end engineer and independent product builder based in Bulgaria.',
  ],
  '/github/': [
    'Open source',
    'The work behind the work.',
    'A curated view of public repositories, releases, and owner-authored commits.',
  ],
  '/notes/': [
    'Notes',
    'Things learned along the way.',
    'Notes on interfaces, product work, and experiments.',
  ],
  '/contact/': [
    'Contact',
    'Let’s build something useful.',
    'For engineering roles, product conversations, and thoughtful collaboration.',
  ],
  '/resume/': [
    'Resume',
    'A quick view of the essentials.',
    'Experience, education, and contact details in a readable format.',
  ],
  '/privacy/': [
    'Privacy',
    'A small footprint.',
    'This portfolio uses no advertising or analytics cookies. Public pages are served as static files.',
  ],
};
const prose = (id: string, markdown: string) => ({ id, type: 'prose', markdown });
const media = (
  id: string,
  path: string,
  alt: string,
  sourceUrl: string,
  width: number,
  height: number,
) =>
  entity(id, 'media', {
    path,
    mime: path.endsWith('.png') ? 'image/png' : 'image/jpeg',
    width,
    height,
    bytes: 1,
    alt,
    caption: '',
    sourceUrl,
    rights:
      'Owner-provided public product material; review original before production publication.',
    publicPath: `/media/${path}`,
  });

export const seedContent: PortfolioContent = contentSchema.parse({
  schemaVersion: 1,
  releaseId: 'local-evidence-preview',
  generation: 0,
  generatedAt: '2026-10-12T12:00:00.000Z',
  github: {
    account: 'Spatovaliyski',
    fetchedAt: null,
    repositories: [],
    errors: [],
    excludedIds: [],
  },
  entities: [
    entity('profile', 'profile', {
      name: 'Martin Spatovaliyski',
      role: 'Front-end engineer & product builder',
      positioning:
        'Thoughtful interfaces. Useful products. Ownership from the first decision to the next release.',
      biography:
        'I work at the intersection of engineering, product, and interface design. My work spans React applications, content platforms, independently published mobile products, and small tools for gaming communities. I care about readable systems, accessible experiences, and decisions that hold up after launch.',
      location: 'Bulgaria',
      since: '2017-05-01',
      email: 'martinspatovaliyski@gmail.com',
      availability: false,
      availabilityLabel: 'Building & maintaining products',
      links: [
        { label: 'GitHub', url: 'https://github.com/Spatovaliyski' },
        { label: 'LinkedIn', url: 'https://www.linkedin.com/in/martin-spatovaliyski-554622aa/' },
      ],
      cvMediaId: null,
    }),
    entity('settings', 'settings', {
      siteTitle: 'Martin Spatovaliyski',
      siteUrl: 'https://spatovaliyski.com',
      navigation: [
        { label: 'Work', url: '/projects/' },
        { label: 'Pet projects', url: '/pet-projects/' },
        { label: 'Experience', url: '/experience/' },
        { label: 'About', url: '/about/' },
        { label: 'Contact', url: '/contact/' },
      ],
      footer: 'Made with care, built to last.',
      defaultDescription:
        'Front-end engineering, independent products, and selected work by Martin Spatovaliyski.',
      theme: { canvas: '#F5F2EC', ink: '#161923', accent: '#2445E8' },
      sections: ['positioning', 'bausy', 'work', 'pets', 'approach', 'github', 'contact'],
      labels: {
        work: 'Explore work',
        contact: 'Get in touch',
        resume: 'View CV',
        selected: 'Selected work',
        petProjects: 'Pet projects',
        caseStudy: 'Explore the project',
        approachTitle: 'Good work lives in the details.',
        approach1: 'Start with the real problem',
        approach1Body:
          'Understand the people, the constraints, and what a useful outcome looks like.',
        approach2: 'Make the system understandable',
        approach2Body:
          'Prefer clear boundaries, small responsibilities, and decisions that can be explained.',
        approach3: 'Own what happens next',
        approach3Body: 'Shipping is a beginning. Maintenance and feedback are part of the work.',
        githubTitle: 'Built in the open.',
        githubBody:
          'Small tools and ongoing experiments. Explore the source, releases, and public activity.',
        contactTitle: 'Have something in mind?',
        contactBody: 'I’m always happy to talk about thoughtful products and engineering.',
        email: 'Send an email',
        allWork: 'All work',
        allPets: 'Explore the addons',
        footerNotes: 'Notes',
        footerPrivacy: 'Privacy',
        footerSource: 'GitHub',
        ownership: 'My contribution',
        constraints: 'Constraints',
        technologies: 'Technologies',
        projectLinks: 'Project links',
        noNotes: 'Published notes will appear here.',
        noGitHub: 'Repository activity has not been synchronized yet.',
        availability: 'Availability',
        backToWork: 'Back to work',
        results: 'repositories',
        search: 'Search repositories',
        language: 'Language',
        allLanguages: 'All languages',
        sort: 'Sort by',
        recent: 'Recent activity',
        stars: 'Stars',
        mostActive: 'Most active',
        activeDefinition:
          'Owner-authored, non-merge commits on default branches in selected public repositories over the past 90 days. UTC dates.',
        languageDefinition:
          'Language totals measure source-code bytes, not time spent or proficiency.',
        publicScope: 'Selected public repositories · 90 days · UTC',
        published: 'Published',
        updated: 'Updated',
        previous: 'Previous',
        next: 'Next',
        openMenu: 'Open navigation',
        closeMenu: 'Close navigation',
        notFound: 'This page has moved or does not exist.',
        returnHome: 'Return home',
        copyright: 'Martin Spatovaliyski',
        productCaption: 'Everyday care. A little more connected.',
        scroll: 'Scroll to explore',
        selectedBody: 'Products, platforms, and the decisions behind them.',
        petTitle: 'Made for the small details.',
        petBody:
          'Tools for the games and communities I spend time in. Small scope, real use, and plenty to learn.',
        approachLabel: 'Engineering approach',
        githubLabel: 'Public development',
        githubExplore: 'Explore GitHub activity',
        contactLabel: 'Next conversation',
        experienceExplore: 'Explore my experience',
        qualifications: 'Education & languages',
        skillContext: 'Skills, with context',
        downloadCv: 'Download PDF CV',
        aboutTitle: 'Engineering, close to the product.',
        independentProduct: 'Independent product',
        professionalWork: 'Professional work',
        selectedWork: 'Selected work',
        addonLabel: 'Pet project / WoW addon',
        noteLabel: 'Engineering notes',
        status: 'Status',
        featured: 'Featured',
        present: 'Present',
        availableLabel: 'Open to conversations',
      },
    }),
    ...Object.entries(pageTitles).map(([path, [eyebrow, title, introduction]]) =>
      entity(`page-${path === '/' ? 'home' : path.split('/')[1]}`, 'page', {
        path,
        eyebrow,
        title,
        introduction,
        blocks:
          path === '/privacy/'
            ? [
                prose(
                  'privacy-details',
                  'The server may keep standard access logs for security and operations. Contact links open your email app or the linked service; this portfolio does not collect messages. The private editor uses Supabase authentication and private storage. External websites follow their own privacy policies.',
                ),
              ]
            : [],
        seo: seo(
          `${path === '/' ? 'Front-end engineering & products' : eyebrow} — Martin Spatovaliyski`,
          introduction,
        ),
      }),
    ),
    media(
      'bausy-hero',
      'bausy-screen-1.jpg',
      'Bausy pet-care app showing its public product interface.',
      'https://apps.apple.com/bg/app/bausy/id6787374200',
      1320,
      2868,
    ),
    media(
      'bausy-health',
      'bausy-screen-2.jpg',
      'Bausy pet health profile, shown in its published product screenshots.',
      'https://apps.apple.com/bg/app/bausy/id6787374200',
      1320,
      2868,
    ),
    media(
      'cilect-hero',
      'project-cilect-interface.png',
      'CILECT homepage interface, showing the international film-school platform.',
      'https://cilect.org/',
      1168,
      633,
    ),
    media(
      'platesct-settings',
      'addon-platesct-settings.png',
      'PlateSCT configuration interface.',
      'https://www.curseforge.com/wow/addons/platesct',
      842,
      642,
    ),
    media(
      'easysummon-hero',
      'addon-easysummon.jpg',
      'EasySummon Warlock summon queue.',
      'https://www.curseforge.com/wow/addons/easysummon',
      800,
      600,
    ),
    media(
      'raidopacity-hero',
      'addon-raidopacity.png',
      'RaidOpacity Blizzard raid-frame configuration.',
      'https://www.curseforge.com/wow/addons/raidopacity',
      800,
      600,
    ),
    media(
      'easymill-hero',
      'addon-easymill.png',
      'EasyMill milling estimates interface.',
      'https://www.curseforge.com/wow/addons/easymill',
      800,
      600,
    ),
    media(
      'platesct-hero',
      'addon-platesct-combat.png',
      'PlateSCT floating combat text at World of Warcraft nameplates.',
      'https://www.curseforge.com/wow/addons/platesct',
      594,
      619,
    ),
    entity('bausy', 'project', {
      slug: 'bausy',
      title: 'Bausy',
      kind: 'product',
      status: 'active',
      summary:
        'A pet-care companion that brings health records, reminders, and shared care into one place.',
      ownership: 'Independent product, published by Martin Spatovaliyski.',
      dates: 'Available on iPhone and Android',
      technologies: [],
      featured: true,
      heroMediaId: 'bausy-hero',
      repositoryIds: [],
      links: [
        { label: 'Product website', url: 'https://bausy.app/' },
        { label: 'App Store', url: 'https://apps.apple.com/bg/app/bausy/id6787374200' },
        {
          label: 'Google Play',
          url: 'https://play.google.com/store/apps/details?id=com.bausy.app',
        },
      ],
      blocks: [
        prose(
          'bausy-problem',
          'Pet care involves information scattered across notes, documents, and recurring tasks. Bausy brings pet profiles, health records, medication and vaccination reminders, and family sharing into a single mobile product.',
        ),
        {
          id: 'bausy-proof',
          type: 'gallery',
          images: [
            {
              mediaId: 'bausy-hero',
              alt: 'Bausy published mobile interface.',
              caption: 'Public App Store product material.',
            },
            {
              mediaId: 'bausy-health',
              alt: 'Bausy published pet health interface.',
              caption: 'Health information and everyday care.',
            },
          ],
        },
        prose(
          'bausy-evidence',
          'The public store listings document the shipped product. Detailed engineering decisions and architecture will be published after an owner review.',
        ),
      ],
      seo: seo(
        'Bausy — independent pet-care product',
        'A published mobile product for pet profiles, health records, reminders, and shared care.',
      ),
    }),
    entity(
      'cilect',
      'project',
      {
        slug: 'cilect',
        title: 'CILECT',
        kind: 'professional',
        status: 'maintained',
        summary:
          'A content platform for the international association of film and television schools.',
        ownership:
          'Full-stack development and product ownership, as described in the existing portfolio.',
        dates: '2021–2022',
        technologies: ['WordPress', 'PHP', 'JavaScript'],
        featured: true,
        heroMediaId: 'cilect-hero',
        repositoryIds: [],
        links: [{ label: 'CILECT', url: 'https://cilect.org/' }],
        blocks: [
          prose(
            'cilect-summary',
            'The existing portfolio describes a migration and a custom content platform for CILECT, with a custom theme and plugins. The case study focuses on platform ownership and content structure. Specific architecture decisions and approved interface screenshots require an editorial review.',
          ),
        ],
        seo: seo(
          'CILECT — content-platform engineering',
          'Content migration, custom development, and platform ownership for CILECT.',
        ),
      },
      1,
    ),
    ...addonNames.flatMap((name, i) => [
      entity(
        name.toLowerCase(),
        'project',
        {
          slug: name.toLowerCase(),
          title: name,
          kind: 'pet-project',
          status: i === 1 ? 'archived' : 'maintained',
          summary: addonDescriptions[i],
          ownership:
            i === 1
              ? 'Maintenance by Limitedby (Spatovaliyski), building on ClassicNumbers by zeldarsprod.'
              : 'Public addon maintained by Limitedby (Spatovaliyski).',
          dates: i === 1 ? 'Legacy · features moved to PlateSCT' : 'World of Warcraft addon',
          technologies: ['Lua', 'WoW API'],
          links: [
            { label: 'Source on GitHub', url: `https://github.com/Spatovaliyski/${name}` },
            ...(i === 4
              ? []
              : [
                  {
                    label: 'Distribution on CurseForge',
                    url:
                      'https://www.curseforge.com/wow/addons/' +
                      [
                        'platesct',
                        'classicnumbers-ex',
                        'easysummon',
                        'raidopacity',
                        'sboard',
                        'easymill',
                      ][i],
                  },
                ]),
          ],
          blocks: [
            prose(`${name}-intro`, addonDescriptions[i]),
            ...(i === 0
              ? [
                  prose(
                    'platesct-attribution',
                    'Personal damage attribution in Midnight is experimental under restricted platform APIs.',
                  ),
                  {
                    id: 'platesct-settings-image',
                    type: 'image',
                    mediaId: 'platesct-settings',
                    alt: 'PlateSCT number-style and combat-text configuration.',
                    caption: 'Public addon configuration interface.',
                  },
                ]
              : []),
          ],
          heroMediaId: [
            'platesct-hero',
            null,
            'easysummon-hero',
            'raidopacity-hero',
            null,
            'easymill-hero',
          ][i],
          repositoryIds: [addonIds[i]],
          featured: i === 0,
          seo: seo(`${name} — WoW addon`, addonDescriptions[i]),
        },
        i + 2,
      ),
      entity(
        `repo-${name.toLowerCase()}`,
        'repository',
        {
          githubId: addonIds[i],
          fullName: `Spatovaliyski/${name}`,
          featured: i === 0,
          projectId: name.toLowerCase(),
          description: addonDescriptions[i],
        },
        i,
      ),
    ]),
    ...[
      [
        'crownpeak',
        'Rezolve AI (Formerly Crownpeak)',
        'Senior Front-end Engineer',
        '2024-04-01',
        null,
        'Front-end engineering. Detailed responsibilities are pending an owner review.',
      ],
      [
        'almacena',
        'Almacena Platform',
        'Senior Front-End Developer',
        '2022-12-01',
        '2023-10-31',
        'Marketplace interfaces, internal React/TypeScript tools, and visual rebrand work.',
      ],
      [
        'freelance',
        'Freelance / CILECT',
        'Full-stack Developer & Product Owner',
        '2021-07-01',
        '2022-11-30',
        'Content migration, a custom theme and plugins, and platform ownership.',
      ],
      [
        'devrix',
        'DevriX',
        'Front-end Developer & Project Owner',
        '2017-05-01',
        '2021-06-30',
        'Front-end delivery, project ownership, and mentoring.',
      ],
    ].map(([id, employer, role, start, end, summary], i) =>
      entity(
        String(id),
        'experience',
        {
          employer,
          role,
          start,
          end,
          location: 'Bulgaria',
          summary,
          achievements: [],
          projectIds: id === 'freelance' ? ['cilect'] : [],
          sourceUrl: 'https://spatovaliyski.com/experience',
        },
        i,
      ),
    ),
    entity('education', 'qualification', {
      kind: 'education',
      title: 'Master’s degree',
      institution: 'Plovdiv University',
      dates: '2021',
      details:
        'Graphic environments and user interfaces. Imported from the linked CV; confirm before launch.',
      sourceUrl: 'https://wp.spatovaliyski.com/resume/',
    }),
    entity(
      'english',
      'qualification',
      {
        kind: 'language',
        title: 'English',
        institution: '',
        dates: '',
        details: 'C1, as listed in the existing CV.',
        sourceUrl: 'https://wp.spatovaliyski.com/resume/',
      },
      1,
    ),
    entity(
      'bulgarian',
      'qualification',
      {
        kind: 'language',
        title: 'Bulgarian',
        institution: '',
        dates: '',
        details: 'Native.',
        sourceUrl: 'https://wp.spatovaliyski.com/resume/',
      },
      2,
    ),
    entity('skill-react', 'skill', {
      label: 'React & TypeScript',
      category: 'Interface engineering',
      evidenceIds: ['almacena', 'crownpeak'],
    }),
    entity(
      'skill-ownership',
      'skill',
      {
        label: 'Product & platform ownership',
        category: 'Delivery',
        evidenceIds: ['bausy', 'cilect'],
      },
      1,
    ),
    entity(
      'skill-lua',
      'skill',
      { label: 'Lua & platform APIs', category: 'Experiments', evidenceIds: ['platesct'] },
      2,
    ),
    ...legacyNotes,
    entity('redirect-blog', 'redirect', {
      from: '/blog',
      to: '/notes/',
      status: 301,
      reason: 'Notes replaces the legacy blog collection.',
    }),
  ],
});
