const API_URL = "https://en.wikipedia.org/w/api.php";

interface WikiSearchHit {
  pageid: number;
  title: string;
  snippet: string;
}

interface WikiSearchResponse {
  query?: {
    search?: WikiSearchHit[];
  };
}

const form = document.getElementById("form") as HTMLFormElement;
const input = document.getElementById("query") as HTMLInputElement;
const statusEl = document.getElementById("status")!;
const resultsEl = document.getElementById("results")!;
const submitBtn = form.querySelector("button[type='submit']") as HTMLButtonElement;

let activeController: AbortController | null = null;

function wikiArticleUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

function setStatus(message: string, isError = false): void {
  statusEl.textContent = message;
  statusEl.classList.toggle("is-error", isError);
}

function clearResults(): void {
  resultsEl.replaceChildren();
}

function renderSnippet(html: string): DocumentFragment {
  const template = document.createElement("template");
  template.innerHTML = html;
  return template.content;
}

function renderResults(hits: WikiSearchHit[]): void {
  clearResults();

  if (hits.length === 0) {
    setStatus("No articles matched that search.");
    return;
  }

  setStatus(
    hits.length === 1 ? "1 article found." : `${hits.length} articles found.`,
  );

  const fragment = document.createDocumentFragment();

  for (const hit of hits) {
    const item = document.createElement("li");
    item.className = "result";

    const title = document.createElement("h2");
    title.className = "result-title";

    const link = document.createElement("a");
    link.href = wikiArticleUrl(hit.title);
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = hit.title;
    title.append(link);

    const snippet = document.createElement("p");
    snippet.className = "result-snippet";
    snippet.append(renderSnippet(hit.snippet));

    item.append(title, snippet);
    fragment.append(item);
  }

  resultsEl.append(fragment);
}

async function searchWikipedia(
  query: string,
  signal: AbortSignal,
): Promise<WikiSearchHit[]> {
  const params = new URLSearchParams({
    action: "query",
    list: "search",
    srsearch: query,
    srlimit: "10",
    format: "json",
    origin: "*",
  });

  const response = await fetch(`${API_URL}?${params}`, { signal });

  if (!response.ok) {
    throw new Error(`Wikipedia API returned ${response.status}.`);
  }

  const data = (await response.json()) as WikiSearchResponse;
  return data.query?.search ?? [];
}

async function runSearch(): Promise<void> {
  const query = input.value.trim();

  if (!query) {
    setStatus("Enter some text to search.", true);
    clearResults();
    return;
  }

  activeController?.abort();
  activeController = new AbortController();

  submitBtn.disabled = true;
  setStatus("Searching…");
  clearResults();

  try {
    const hits = await searchWikipedia(query, activeController.signal);
    renderResults(hits);
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return;
    setStatus(
      err instanceof Error ? err.message : "Something went wrong.",
      true,
    );
  } finally {
    submitBtn.disabled = false;
  }
}

form.addEventListener("submit", (ev) => {
  ev.preventDefault();
  void runSearch();
});

input.addEventListener("input", () => {
  if (statusEl.textContent && !submitBtn.disabled) {
    setStatus("");
    clearResults();
  }
});

console.log("[10-wikipedia-search] ready");
