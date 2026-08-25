import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const sourceDir = join(repoRoot, "site");
const buildDir = join(repoRoot, ".pages-build");
const pluginsFile = join(sourceDir, "plugins.json");
const siteUrl = "https://helixplugins.xyz";
const steelProposal = "https://github.com/helix-editor/helix/pull/8675";

function assert(condition, message) {
  if (!condition) throw new TypeError(message);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;",
  })[character]);
}

function richText(value) {
  return String(value)
    .split(/(`[^`]+`)/g)
    .map((part) => part.startsWith("`") && part.endsWith("`")
      ? `<code>${escapeHtml(part.slice(1, -1))}</code>`
      : escapeHtml(part))
    .join("");
}

function validatePlugins(plugins) {
  assert(Array.isArray(plugins), "plugins.json must contain an array");
  const slugs = new Set();

  plugins.forEach((plugin, index) => {
    const context = `Plugin at index ${index}`;
    const requiredStrings = [
      "slug",
      "name",
      "description",
      "author",
      "repository",
      "lede",
      "overview",
      "installTitle",
      "reviewNote",
      "beforeInstalling",
    ];

    assert(plugin && typeof plugin === "object", `${context} must be an object`);
    requiredStrings.forEach((field) => {
      assert(typeof plugin[field] === "string" && plugin[field].trim(), `${context}.${field} must be a non-empty string`);
    });
    assert(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(plugin.slug), `${context}.slug is not URL-safe`);
    assert(!slugs.has(plugin.slug), `Duplicate plugin slug: ${plugin.slug}`);
    slugs.add(plugin.slug);
    assert(/^https:\/\/github\.com\//.test(plugin.repository), `${context}.repository must be a GitHub URL`);
    assert(Array.isArray(plugin.keywords) && plugin.keywords.every((item) => typeof item === "string"), `${context}.keywords must be strings`);
    assert(Array.isArray(plugin.features) && plugin.features.length > 0 && plugin.features.every((item) => typeof item === "string"), `${context}.features must contain strings`);
    assert(Array.isArray(plugin.installCommands) && plugin.installCommands.length > 0 && plugin.installCommands.every((item) => typeof item === "string"), `${context}.installCommands must contain strings`);
    assert(Array.isArray(plugin.programmingLanguages) && plugin.programmingLanguages.length > 0 && plugin.programmingLanguages.every((item) => typeof item === "string"), `${context}.programmingLanguages must contain strings`);
    assert(Array.isArray(plugin.facts) && plugin.facts.length > 0, `${context}.facts must contain entries`);
    plugin.facts.forEach((fact, factIndex) => {
      assert(typeof fact.label === "string" && typeof fact.value === "string", `${context}.facts[${factIndex}] is invalid`);
    });
    assert(plugin.seo && typeof plugin.seo === "object", `${context}.seo must be an object`);
    ["title", "description", "socialDescription", "structuredDescription"].forEach((field) => {
      assert(typeof plugin.seo[field] === "string" && plugin.seo[field].trim(), `${context}.seo.${field} must be a non-empty string`);
    });
    if (plugin.installInstructions !== undefined) {
      assert(typeof plugin.installInstructions === "string", `${context}.installInstructions must be a string`);
    }
    if (plugin.licenseUrl !== undefined) {
      assert(/^https:\/\//.test(plugin.licenseUrl), `${context}.licenseUrl must be an HTTPS URL`);
    }
  });
}

function createStructuredData(plugin, canonicalUrl) {
  const programmingLanguage = plugin.programmingLanguages.length === 1
    ? plugin.programmingLanguages[0]
    : plugin.programmingLanguages;
  const about = {
    "@type": "SoftwareSourceCode",
    name: plugin.name,
    codeRepository: plugin.repository,
    programmingLanguage,
    runtimePlatform: "Helix editor with Steel",
  };

  if (plugin.licenseUrl) about.license = plugin.licenseUrl;

  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: plugin.seo.title,
    url: canonicalUrl,
    description: plugin.seo.structuredDescription,
    isPartOf: { "@type": "WebSite", name: "Helix Plugins", url: `${siteUrl}/` },
    about,
  }, null, 2).replaceAll("<", "\\u003c");
}

function createPluginPage(plugin) {
  const canonicalUrl = `${siteUrl}/plugins/${plugin.slug}/`;
  const facts = plugin.facts
    .map((fact) => `        <div><dt>${escapeHtml(fact.label)}</dt><dd>${richText(fact.value)}</dd></div>`)
    .join("\n");
  const features = plugin.features
    .map((feature) => `          <li>${richText(feature)}</li>`)
    .join("\n");
  const installInstructions = plugin.installInstructions
    ? `\n        <p>${richText(plugin.installInstructions)}</p>`
    : "";

  return `<!doctype html>
<!-- Generated by scripts/generate-site.mjs from site/plugins.json. Do not edit directly. -->
<html lang="en">

<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="description" content="${escapeHtml(plugin.seo.description)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <meta name="theme-color" content="#100d1a" />
  <title>${escapeHtml(plugin.seo.title)}</title>
  <link rel="canonical" href="${canonicalUrl}" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Helix Plugins" />
  <meta property="og:title" content="${escapeHtml(plugin.seo.title)}" />
  <meta property="og:description" content="${escapeHtml(plugin.seo.socialDescription)}" />
  <meta property="og:url" content="${canonicalUrl}" />
  <meta property="og:image" content="${siteUrl}/og-image.png" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="Helix Plugins — community plugins for the Helix editor" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(plugin.seo.title)}" />
  <meta name="twitter:description" content="${escapeHtml(plugin.seo.socialDescription)}" />
  <meta name="twitter:image" content="${siteUrl}/og-image.png" />
  <script type="application/ld+json">
${createStructuredData(plugin, canonicalUrl).split("\n").map((line) => `    ${line}`).join("\n")}
  </script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap"
    rel="stylesheet" />
  <link rel="stylesheet" href="../../styles.css" />
</head>

<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <main id="main">
    <header class="detail-header shell">
      <nav class="detail-nav" aria-label="Breadcrumb"><a href="/">All Helix plugins</a></nav>
      <h1>${escapeHtml(plugin.name)}</h1>
      <p class="detail-lede">${richText(plugin.lede)}</p>
      <div class="detail-actions">
        <a class="submit-button" href="${escapeHtml(plugin.repository)}" target="_blank" rel="noreferrer">View repository</a>
        <a class="secondary-link" href="${steelProposal}" target="_blank" rel="noreferrer">Steel proposal</a>
      </div>
    </header>

    <section class="section shell" aria-labelledby="facts-title">
      <div class="section-heading"><h2 id="facts-title">Project facts</h2></div>
      <dl class="plugin-meta">
${facts}
      </dl>
    </section>

    <section class="detail-section shell" aria-labelledby="purpose-title">
      <h2 id="purpose-title">What it does</h2>
      <div>
        <p>${richText(plugin.overview)}</p>
        <ul>
${features}
        </ul>
      </div>
    </section>

    <section class="detail-section shell" aria-labelledby="install-title">
      <h2 id="install-title">${escapeHtml(plugin.installTitle)}</h2>
      <div>
        <pre class="setup-code detail-code"><code>${escapeHtml(plugin.installCommands.join("\n"))}</code></pre>${installInstructions}
        <p class="review-note">${richText(plugin.reviewNote)}</p>
      </div>
    </section>

    <section class="detail-section shell" aria-labelledby="before-title">
      <h2 id="before-title">Before installing</h2>
      <div>
        <p>${richText(plugin.beforeInstalling)}</p>
      </div>
    </section>
  </main>

  <footer class="site-footer shell">
    <p>Unofficial community index. Listings are not security-reviewed.</p>
    <nav aria-label="Project links">
      <a href="/">Directory</a>
      <a href="https://github.com/EnricoDev1/helix-plugin-registry/issues/new?template=plugin-submission.yml">Submit</a>
      <a href="https://github.com/EnricoDev1/helix-plugin-registry" target="_blank" rel="noreferrer">Source</a>
    </nav>
  </footer>
</body>

</html>
`;
}

function createSitemap(plugins) {
  const urls = [`${siteUrl}/`, ...plugins.map((plugin) => `${siteUrl}/plugins/${plugin.slug}/`)];
  const entries = urls.map((url) => `  <url>\n    <loc>${escapeHtml(url)}</loc>\n  </url>`).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>
`;
}

const plugins = JSON.parse(await readFile(pluginsFile, "utf8"));
validatePlugins(plugins);

await rm(buildDir, { recursive: true, force: true });
await cp(sourceDir, buildDir, { recursive: true });
await rm(join(buildDir, "plugins"), { recursive: true, force: true });

for (const plugin of plugins) {
  const outputFile = join(buildDir, "plugins", plugin.slug, "index.html");
  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, createPluginPage(plugin), "utf8");
}

await writeFile(join(buildDir, "sitemap.xml"), createSitemap(plugins), "utf8");
console.log(`Generated ${plugins.length} plugin pages and sitemap.xml in .pages-build`);
