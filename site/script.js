const setupText = `git clone https://github.com/mattwparas/helix.git
cd helix
git switch steel-event-system
cargo xtask steel
forge pkg install --git https://github.com/Ra77a3l3-jar/oil.hx.git
(require "oil/oil.scm")`;

const copyButton = document.querySelector("#copy-setup");

copyButton.addEventListener("click", async () => {
  copyButton.dataset.state = "loading";
  copyButton.textContent = "Copying…";
  try {
    await navigator.clipboard.writeText(setupText);
    copyButton.dataset.state = "success";
    copyButton.textContent = "Copied";
  } catch {
    copyButton.dataset.state = "error";
    copyButton.textContent = "Copy failed";
  }
  window.setTimeout(() => {
    copyButton.removeAttribute("data-state");
    copyButton.textContent = "Copy";
  }, 1600);
});

const searchInput = document.querySelector("#plugin-search");
const pluginList = document.querySelector("#plugin-list");
const resultCount = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");
let pluginRows = [];

function createPluginRow(plugin) {
  const row = document.createElement("a");
  const name = document.createElement("strong");
  const description = document.createElement("span");
  const author = document.createElement("small");

  row.className = "plugin-row";
  row.href = `/plugins/${plugin.slug}/`;
  row.dataset.search = [plugin.name, plugin.description, plugin.author, ...plugin.keywords]
    .join(" ")
    .toLowerCase();

  name.textContent = plugin.name;
  description.textContent = plugin.description;
  author.textContent = `@${plugin.author}`;
  row.append(name, description, author);

  return row;
}

function updateFilter() {
  const query = searchInput.value.trim().toLowerCase();
  let visible = 0;

  pluginRows.forEach((row) => {
    const match = row.dataset.search.includes(query);
    row.hidden = !match;
    if (match) visible += 1;
  });

  resultCount.textContent = `${visible} ${visible === 1 ? "project" : "projects"}`;
  emptyState.hidden = visible !== 0;
}

function addPluginStructuredData(plugins) {
  const structuredData = document.createElement("script");
  structuredData.type = "application/ld+json";
  structuredData.textContent = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Community plugins for the Helix editor",
    numberOfItems: plugins.length,
    itemListElement: plugins.map((plugin, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: plugin.name,
      url: new URL(`/plugins/${plugin.slug}/`, window.location.origin).href,
    })),
  });
  document.head.append(structuredData);
}

function isValidPlugin(plugin) {
  return plugin
    && typeof plugin.slug === "string"
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(plugin.slug)
    && typeof plugin.name === "string"
    && typeof plugin.description === "string"
    && typeof plugin.author === "string"
    && typeof plugin.repository === "string"
    && Array.isArray(plugin.keywords)
    && plugin.keywords.every((keyword) => typeof keyword === "string");
}

async function loadPlugins() {
  try {
    const response = await fetch("./plugins.json");
    if (!response.ok) throw new Error(`Plugin request failed with ${response.status}`);

    const plugins = await response.json();
    if (!Array.isArray(plugins) || !plugins.every(isValidPlugin)) {
      throw new TypeError("Plugin data has an invalid format");
    }

    pluginRows = plugins.map(createPluginRow);
    pluginList.replaceChildren(...pluginRows, emptyState);
    pluginList.setAttribute("aria-busy", "false");
    searchInput.disabled = false;
    searchInput.placeholder = "Name or use";
    addPluginStructuredData(plugins);
    updateFilter();
  } catch (error) {
    console.error("Unable to load plugin directory", error);
    emptyState.textContent = "The plugin directory could not be loaded. Refresh the page to try again.";
    emptyState.hidden = false;
    pluginList.replaceChildren(emptyState);
    pluginList.setAttribute("aria-busy", "false");
    resultCount.textContent = "Plugin directory unavailable";
    searchInput.placeholder = "Plugins unavailable";
  }
}

searchInput.addEventListener("input", updateFilter);
loadPlugins();
