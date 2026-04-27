type El<K extends keyof HTMLElementTagNameMap> = HTMLElementTagNameMap[K];

function byId<K extends keyof HTMLElementTagNameMap>(tag: K, id: string): El<K> {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLElement) || el.tagName.toLowerCase() !== tag) {
    throw new Error(`expected <${tag} id="${id}">`);
  }
  return el as El<K>;
}

const dec = byId("button", "dec");
const inc = byId("button", "inc");
const value = byId("output", "value");
const tick = byId("span", "tick");

let count = 0;

function render() {
  value.textContent = String(count);
  tick.textContent = new Date().toLocaleTimeString();
}

dec.addEventListener("click", () => {
  count--;
  render();
});
inc.addEventListener("click", () => {
  count++;
  render();
});

render();
console.log("[hello-dom] ready");
