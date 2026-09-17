import type { Draft, Review, Source } from '../../src/domain/entities/models';
export const fixtureNow = '2026-09-18T06:00:00.000Z';
export const fixtureSources: Source[] = [
  {
    id: 'release',
    title: 'TypeScript: validating external data at a typed boundary',
    url: 'https://www.typescriptlang.org/docs/handbook/2/narrowing.html',
    publishedAt: '2026-09-17T10:00:00.000Z',
    category: 'TypeScript',
    kind: 'update',
    content:
      'DETERMINISTIC TEST FIXTURE, not a real release. TypeScript narrows an unknown value after runtime guards check its shape. A typeof check distinguishes a string from other JavaScript values. User-defined type predicates communicate the result of checks to the compiler. Checking a field at runtime establishes a boundary before application code uses it.',
  },
  {
    id: 'reference',
    title: 'TypeScript handbook: everyday types',
    url: 'https://www.typescriptlang.org/docs/handbook/2/everyday-types.html',
    publishedAt: fixtureNow,
    category: 'TypeScript',
    kind: 'reference',
    content:
      'DETERMINISTIC TEST FIXTURE. TypeScript is a static type checker. Type annotations are removed when compiling to JavaScript and do not add runtime validation. The unknown type requires checks before a value can be used. Prefer narrowing over assertions when dealing with data from outside a trusted application boundary.',
  },
];
export const fixtureDraft: Draft = {
  slug: 'validating-unknown-values-at-the-boundary',
  category: 'TypeScript',
  title: 'Validate unknown values before they enter your application',
  summary:
    'External values need runtime checks before typed application code can rely on their shape. This fixture demonstrates a small boundary parser that accepts a valid name and rejects malformed input without using a type assertion.',
  whatChanged:
    'This is an offline test scenario, not a report of a new TypeScript release. The supplied fixture describes how a runtime guard lets the compiler narrow unknown input into a shape that application code can safely consume.',
  whyItMatters:
    'Network responses and parsed files can violate a declared interface. Validating at the entry point prevents a missing property from silently travelling through business logic until an unrelated operation eventually fails.',
  explanation:
    'The parser accepts unknown because its caller has not established a trustworthy shape. It first checks whether the value is an object and excludes null. The in operator establishes the existence of the name property, and a typeof check establishes that the field is a string. Only then does the function return a typed object. The checks remain in emitted JavaScript, unlike type annotations, which disappear during compilation.',
  typescript:
    'function parseName(value: unknown): { name: string } {\n  if (typeof value !== "object" || value === null || !("name" in value) || typeof value.name !== "string") {\n    throw new Error("Expected an object with a string name");\n  }\n  return { name: value.name };\n}\nconst result = parseName({ name: "DevSignal" });\nconsole.log(result.name.toUpperCase());',
  considerations:
    'Place the parser in the adapter that receives external data and return a domain-friendly value. Keep the application handler independent of HTTP response objects so the same boundary policy can be exercised with deterministic test fixtures.',
  tradeOffs:
    'A handwritten guard has no extra runtime dependency and makes each check explicit. As the shape grows, maintaining equivalent validation and static types becomes more repetitive, and a schema library may offer a clearer source of truth.',
  whenToUse:
    'Use a small guard for a limited external shape, such as a configuration object with one required name. It is especially helpful at a trust boundary where callers cannot guarantee the values they supply are well formed.',
  whenNotToUse:
    'Do not repeat the same validation at every internal function after a trusted boundary has already established the invariant. For deeply nested optional fields, a shared runtime schema is usually easier to maintain than many separate conditions.',
  limitations:
    'The example validates only a string property. It does not enforce nonempty names, maximum lengths, Unicode normalization or business rules. It has been supplied as a fixture and makes no claim that a live API or newly released feature was tested.',
  sources: fixtureSources.map((s) => s.url),
};
export const fixtureReview: Review = {
  scores: {
    factualGrounding: 92,
    technicalDepth: 90,
    clarity: 92,
    usefulness: 90,
    sourceQuality: 90,
    originality: 90,
  },
  overall: 91,
  unsupportedClaims: [],
  inventedSources: [],
  feedback: [],
  approved: true,
};
