export type TileBrush = "walkable" | "unwalkable";

export type TileEditorHandle = {
  isActive: () => boolean;
  getBrush: () => TileBrush;
  getBrushValue: () => number;
  onActiveChange: (listener: (active: boolean) => void) => void;
};

type TileEditorOptions = {
  walkableValue: number;
  unwalkableValue: number;
};

export function mountTileEditor(root: HTMLElement, options: TileEditorOptions): TileEditorHandle {
  const { walkableValue, unwalkableValue } = options;

  let active = false;
  let brush: TileBrush = "unwalkable";
  const activeListeners = new Set<(active: boolean) => void>();

  root.className = "tile-editor";
  root.innerHTML = `
    <div class="tile-editor__head">
      <strong>Tile editor</strong>
      <button type="button" class="tile-editor__toggle" aria-pressed="false">Off</button>
    </div>
    <p class="tile-editor__hint">Enable edit mode, pick a brush, then drag on the map.</p>
    <div class="tile-editor__brushes" role="group" aria-label="Tile brush">
      <button type="button" class="tile-editor__brush" data-brush="walkable">
        <span class="tile-editor__swatch tile-editor__swatch--walkable" aria-hidden="true"></span>
        Walkable
      </button>
      <button type="button" class="tile-editor__brush active" data-brush="unwalkable">
        <span class="tile-editor__swatch tile-editor__swatch--unwalkable" aria-hidden="true"></span>
        Unwalkable
      </button>
    </div>
  `;

  const toggleBtn = root.querySelector<HTMLButtonElement>(".tile-editor__toggle")!;
  const brushBtns = root.querySelectorAll<HTMLButtonElement>(".tile-editor__brush");

  function notifyActive(): void {
    for (const listener of activeListeners) listener(active);
  }

  function syncToggleUi(): void {
    toggleBtn.textContent = active ? "On" : "Off";
    toggleBtn.setAttribute("aria-pressed", String(active));
    toggleBtn.classList.toggle("active", active);
    root.classList.toggle("tile-editor--active", active);
  }

  function syncBrushUi(): void {
    for (const btn of brushBtns) {
      btn.classList.toggle("active", btn.dataset.brush === brush);
    }
  }

  toggleBtn.addEventListener("click", () => {
    active = !active;
    syncToggleUi();
    notifyActive();
  });

  for (const btn of brushBtns) {
    btn.addEventListener("click", () => {
      const next = btn.dataset.brush;
      if (next !== "walkable" && next !== "unwalkable") return;
      brush = next;
      syncBrushUi();
    });
  }

  syncToggleUi();
  syncBrushUi();

  return {
    isActive: () => active,
    getBrush: () => brush,
    getBrushValue: () => (brush === "walkable" ? walkableValue : unwalkableValue),
    onActiveChange: (listener) => {
      activeListeners.add(listener);
    },
  };
}
