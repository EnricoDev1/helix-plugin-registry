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
const pluginRows = [...document.querySelectorAll(".plugin-row")];
const resultCount = document.querySelector("#result-count");
const emptyState = document.querySelector("#empty-state");

searchInput.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();
  let visible = 0;
  pluginRows.forEach((row) => {
    const match = row.dataset.search.includes(query);
    row.hidden = !match;
    if (match) visible += 1;
  });
  resultCount.textContent = `${visible} ${visible === 1 ? "project" : "projects"}`;
  emptyState.hidden = visible !== 0;
});
