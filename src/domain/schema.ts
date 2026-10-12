import { z } from 'zod';

const text = z.string().max(50000);
const date = z.iso.date();
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(100);

export const safeUrl = z
  .string()
  .max(2000)
  .refine((value) => {
    if (/^\/(?!\/)[a-zA-Z0-9/_?=&.#%-]*$/.test(value)) return !value.includes('..');
    try {
      const url = new URL(value);

      return ['https:', 'mailto:'].includes(url.protocol) && !url.username && !url.password;
    } catch {
      return false;
    }
  }, 'Use an HTTPS URL, email link, or internal path.');

export const linkSchema = z.object({ label: z.string().min(1).max(120), url: safeUrl }).strict();

export const metricSchema = z
  .object({
    label: text,
    value: text,
    sourceUrl: safeUrl,
    verifiedAt: date,
    period: text,
    note: text,
  })
  .strict();

const baseBlock = { id: z.string().min(1).max(100) };
const markdown = text.refine(
  (value) =>
    !/<\/?[a-z][^>]*>/i.test(value) && !/\]\(\s*(?:javascript|data|vbscript):/i.test(value),
  'Raw HTML and executable embeds are not supported. Use structured blocks.',
);

export const blockSchema = z.discriminatedUnion('type', [
  z.object({ ...baseBlock, type: z.literal('prose'), markdown }).strict(),
  z.object({ ...baseBlock, type: z.literal('heading'), text }).strict(),
  z
    .object({ ...baseBlock, type: z.literal('image'), mediaId: text, alt: text, caption: text })
    .strict(),
  z
    .object({
      ...baseBlock,
      type: z.literal('gallery'),
      images: z.array(z.object({ mediaId: text, alt: text, caption: text }).strict()).max(12),
    })
    .strict(),
  z
    .object({
      ...baseBlock,
      type: z.literal('summary'),
      title: text,
      ownership: text,
      constraints: text,
    })
    .strict(),
  z
    .object({
      ...baseBlock,
      type: z.literal('decision'),
      title: text,
      context: text,
      choice: text,
      alternatives: text,
      consequence: text,
    })
    .strict(),
  z
    .object({ ...baseBlock, type: z.literal('code'), language: text, code: text, caption: text })
    .strict(),
  z
    .object({
      ...baseBlock,
      type: z.literal('diagram'),
      title: text,
      nodes: z.array(text).min(2).max(8),
      explanation: text,
    })
    .strict(),
  z.object({ ...baseBlock, type: z.literal('links'), links: z.array(linkSchema).max(20) }).strict(),
  z.object({ ...baseBlock, type: z.literal('related'), projectIds: z.array(text).max(8) }).strict(),
  z.object({ ...baseBlock, type: z.literal('metric'), metric: metricSchema }).strict(),
]);

export type ContentBlock = z.infer<typeof blockSchema>;

const seo = z
  .object({
    title: z.string().max(150),
    description: z.string().max(300),
    imageId: text.optional(),
  })
  .strict();

export const profileSchema = z
  .object({
    name: text,
    role: text,
    positioning: text,
    biography: text,
    location: text,
    since: date.nullable(),
    email: z.email(),
    availability: z.boolean(),
    availabilityLabel: text,
    links: z.array(linkSchema),
    cvMediaId: text.nullable(),
  })
  .strict();

export const settingsSchema = z
  .object({
    siteTitle: text,
    siteUrl: z.url().refine((value) => value === 'https://spatovaliyski.com'),
    navigation: z.array(linkSchema).max(8),
    footer: text,
    defaultDescription: text,
    theme: z
      .object({
        canvas: z.string().regex(/^#[a-fA-F\d]{6}$/),
        ink: z.string().regex(/^#[a-fA-F\d]{6}$/),
        accent: z.string().regex(/^#[a-fA-F\d]{6}$/),
      })
      .strict(),
    sections: z
      .array(z.enum(['positioning', 'bausy', 'work', 'pets', 'approach', 'github', 'contact']))
      .max(7),
    labels: z.record(z.string(), z.string().max(300)),
  })
  .strict();

export const pageSchema = z
  .object({
    path: z.enum([
      '/',
      '/projects/',
      '/pet-projects/',
      '/experience/',
      '/about/',
      '/github/',
      '/notes/',
      '/contact/',
      '/resume/',
      '/privacy/',
    ]),
    eyebrow: text,
    title: text,
    introduction: text,
    blocks: z.array(blockSchema).max(100),
    seo,
  })
  .strict();

export const projectSchema = z
  .object({
    slug,
    title: text,
    kind: z.enum(['product', 'professional', 'pet-project', 'archive']),
    status: z.enum(['active', 'maintained', 'completed', 'experimental', 'archived']),
    summary: text,
    ownership: text,
    dates: text,
    technologies: z.array(text).max(20),
    links: z.array(linkSchema),
    blocks: z.array(blockSchema).max(100),
    heroMediaId: text.nullable(),
    repositoryIds: z.array(z.number().int().positive()),
    featured: z.boolean(),
    seo,
  })
  .strict();

export const experienceSchema = z
  .object({
    employer: text,
    role: text,
    start: date,
    end: date.nullable(),
    location: text,
    summary: text,
    achievements: z.array(text).max(20),
    projectIds: z.array(text),
    sourceUrl: safeUrl,
  })
  .strict();

export const qualificationSchema = z
  .object({
    kind: z.enum(['education', 'language', 'credential']),
    title: text,
    institution: text,
    dates: text,
    details: text,
    sourceUrl: safeUrl.nullable(),
  })
  .strict();

export const skillSchema = z
  .object({ label: text, category: text, evidenceIds: z.array(text).min(1) })
  .strict();

export const noteSchema = z
  .object({
    slug,
    title: text,
    summary: text,
    publishedAt: z.union([date, z.iso.datetime()]),
    modifiedAt: z.union([date, z.iso.datetime()]),
    tags: z.array(text),
    blocks: z.array(blockSchema).max(100),
    projectIds: z.array(text),
    seo,
  })
  .strict();

export const mediaSchema = z
  .object({
    path: z
      .string()
      .regex(/^(?!.*\.\.)[a-zA-Z0-9_-][a-zA-Z0-9/_-]*\.(png|jpg|jpeg|webp|avif|pdf)$/),
    mime: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'application/pdf']),
    width: z.number().int().positive().nullable(),
    height: z.number().int().positive().nullable(),
    bytes: z
      .number()
      .int()
      .min(1)
      .max(20 * 1024 * 1024),
    alt: text,
    caption: text,
    sourceUrl: safeUrl.nullable(),
    rights: text,
    publicPath: z
      .string()
      .regex(/^\/media\/(?!.*\.\.)[a-zA-Z0-9/_.,-]+$/)
      .optional(),
    variants: z
      .array(
        z
          .object({
            width: z.number(),
            path: z.string().regex(/^\/media\/(?!.*\.\.)[a-zA-Z0-9/_.,-]+$/),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export const redirectSchema = z
  .object({
    from: z.string().regex(/^\/(?!\/)[a-zA-Z0-9/_-]*$/),
    to: z.string().regex(/^\/(?!\/)[a-zA-Z0-9/_-]*$/),
    status: z.literal(301),
    reason: text,
  })
  .strict();

export const repositoryCurationSchema = z
  .object({
    githubId: z.number().int().positive(),
    fullName: z.string().regex(/^Spatovaliyski\/[a-zA-Z0-9_.-]+$/),
    featured: z.boolean(),
    projectId: text.nullable(),
    description: text,
  })
  .strict();

export const entitySchemas = {
  profile: profileSchema,
  settings: settingsSchema,
  page: pageSchema,
  project: projectSchema,
  experience: experienceSchema,
  qualification: qualificationSchema,
  skill: skillSchema,
  note: noteSchema,
  media: mediaSchema,
  redirect: redirectSchema,
  repository: repositoryCurationSchema,
};

export type EntityKind = keyof typeof entitySchemas;

export const entitySchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-zA-Z0-9_-]+$/)
      .max(100),
    kind: z.enum(Object.keys(entitySchemas) as [EntityKind, ...EntityKind[]]),
    status: z.enum(['draft', 'published', 'archived']),
    sortOrder: z.number().int(),
    data: z.record(z.string(), z.unknown()),
  })
  .strict()
  .superRefine((entity, ctx) => {
    const result = entitySchemas[entity.kind].safeParse(entity.data);

    if (!result.success)
      for (const issue of result.error.issues)
        ctx.addIssue({ code: 'custom', path: ['data', ...issue.path], message: issue.message });
  });

export type Entity = z.infer<typeof entitySchema>;

export const repositorySchema = z
  .object({
    id: z.number().int(),
    fullName: text,
    description: text,
    url: safeUrl,
    languages: z.record(z.string(), z.number().nonnegative()),
    stars: z.number().nonnegative(),
    forks: z.number().nonnegative(),
    archived: z.boolean(),
    updatedAt: z.iso.datetime(),
    commits: z.array(
      z.object({ sha: text, message: text, url: safeUrl, date: z.iso.datetime() }).strict(),
    ),
    releases: z.array(
      z.object({ tag: text, name: text, url: safeUrl, date: z.iso.datetime() }).strict(),
    ),
    pullRequests: z.array(
      z
        .object({ number: z.number(), title: text, url: safeUrl, mergedAt: z.iso.datetime() })
        .strict(),
    ),
    coverage: z
      .object({
        from: z.iso.datetime(),
        to: z.iso.datetime(),
        complete: z.boolean(),
        releasesComplete: z.boolean(),
        pullRequestsComplete: z.boolean(),
      })
      .strict(),
    freshness: z
      .object({
        metadata: z.iso.datetime(),
        languages: z.iso.datetime(),
        commits: z.iso.datetime(),
        releases: z.iso.datetime().nullable(),
        pullRequests: z.iso.datetime().nullable(),
      })
      .strict(),
  })
  .strict();

export const githubSchema = z
  .object({
    account: z.literal('Spatovaliyski'),
    fetchedAt: z.iso.datetime().nullable(),
    repositories: z.array(repositorySchema),
    errors: z.array(text),
    excludedIds: z.array(z.number().int()),
  })
  .strict();

export type GitHubSnapshot = z.infer<typeof githubSchema>;

export type GitHubRepository = z.infer<typeof repositorySchema>;

export const contentSchema = z
  .object({
    schemaVersion: z.literal(1),
    releaseId: text,
    generation: z.number().int().nonnegative(),
    generatedAt: z.iso.datetime(),
    entities: z.array(entitySchema),
    github: githubSchema,
  })
  .strict();

export type PortfolioContent = z.infer<typeof contentSchema>;

export type Project = z.infer<typeof projectSchema> & { id: string };

export type Media = z.infer<typeof mediaSchema> & { id: string };

export function records<K extends EntityKind>(
  content: PortfolioContent,
  kind: K,
): Array<z.infer<(typeof entitySchemas)[K]> & { id: string }> {
  return content.entities
    .filter((entity) => entity.kind === kind && entity.status === 'published')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((entity) => ({
      ...entitySchemas[kind].parse(entity.data),
      id: entity.id,
    })) as unknown as Array<z.infer<(typeof entitySchemas)[K]> & { id: string }>;
}
