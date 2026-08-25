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

const submissionForm = document.querySelector("#submission-form");
const submissionButton = document.querySelector("#submission-button");
const formStatus = document.querySelector("#form-status");

submissionForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = [...submissionForm.querySelectorAll("input[required]")];
  const invalid = fields.find((field) => !field.checkValidity());

  fields.forEach((field) => field.setAttribute("aria-invalid", String(!field.checkValidity())));
  if (invalid) {
    submissionButton.dataset.state = "error";
    formStatus.dataset.state = "error";
    formStatus.textContent = "Complete the highlighted fields.";
    invalid.focus();
    return;
  }

  const name = document.querySelector("#plugin-name").value.trim();
  const repository = document.querySelector("#repository-url").value.trim();
  const summary = document.querySelector("#plugin-summary").value.trim();
  const branch = document.querySelector("#plugin-branch").value.trim();
  const license = document.querySelector("#plugin-license").value.trim();
  const params = new URLSearchParams({
    title: `[Plugin submission] ${name}`,
    body: `## Plugin\n\n- **Name:** ${name}\n- **Repository:** ${repository}\n- **Tested branch or commit:** ${branch}\n- **License:** ${license}\n\n## Summary\n\n${summary}\n\n## Checklist\n\n- [ ] Repository is public and includes setup documentation\n- [ ] I have the right to submit this plugin and its associated assets\n- [ ] I understand that listing is not a security review or endorsement`
  });

  submissionButton.dataset.state = "loading";
  submissionButton.textContent = "Opening…";
  window.open(`${submissionForm.action}?${params.toString()}`, "_blank", "noopener,noreferrer");
  window.setTimeout(() => {
    submissionButton.dataset.state = "success";
    submissionButton.textContent = "Draft opened";
    formStatus.dataset.state = "success";
    formStatus.textContent = "Review the issue on GitHub.";
  }, 300);
});

submissionForm.addEventListener("input", (event) => {
  event.target.removeAttribute("aria-invalid");
  submissionButton.removeAttribute("data-state");
  submissionButton.textContent = "Prepare issue";
  formStatus.removeAttribute("data-state");
  formStatus.textContent = "You review it on GitHub before submitting.";
});
