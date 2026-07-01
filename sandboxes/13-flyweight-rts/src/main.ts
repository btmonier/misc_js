import p5 from "./p5-lite";

/**
 * A tiny RTS-style sandbox that demonstrates the **Flyweight** pattern.
 *
 * Hundreds of units share only a handful of "unit type" objects. The heavy,
 * unchanging data (colour, size, speed, name) lives once per type inside a
 * flyweight; each individual unit stores only its own lightweight, changing
 * state (position + velocity) and a *reference* to the shared flyweight.
 *
 *   Flyweight (intrinsic / shared)  -> UnitType
 *   Factory  (caches flyweights)    -> UnitTypeFactory
 *   Context  (extrinsic / per-unit) -> Unit
 *
 * Click the circular "barracks" to train a new squad of units.
 */

// --- Flyweight: intrinsic, shared state ------------------------------------
//
// One UnitType instance is shared by every unit of that type. Note it carries
// no position — that would be extrinsic state and is passed in when drawing.
class UnitType {
  constructor(
    readonly key: string,
    readonly label: string,
    readonly color: [number, number, number],
    readonly size: number,
    readonly maxSpeed: number,
  ) {}

  draw(p: p5, x: number, y: number, heading: number): void {
    const [r, g, b] = this.color;
    p.push();
    p.translate(x, y);
    p.rotate(heading);
    p.noStroke();
    p.fill(r, g, b);
    p.rectMode(p.CENTER);
    p.square(0, 0, this.size);
    // A brighter "muzzle" edge so orientation is legible at a glance.
    p.fill(255, 255, 255, 130);
    p.rect(this.size / 2 - 1, 0, 2, this.size * 0.6);
    p.pop();
  }
}

// --- Flyweight factory: hands back shared instances ------------------------
//
// The blueprints are defined once; `get()` guarantees that asking for the same
// key always returns the very same object (reference equality), which is the
// whole point of the pattern.
const BLUEPRINTS: Record<string, UnitType> = {
  marine: new UnitType("marine", "Marine", [125, 211, 252], 12, 1.6),
  scout: new UnitType("scout", "Scout", [134, 239, 172], 8, 3.0),
  heavy: new UnitType("heavy", "Heavy", [251, 146, 60], 18, 0.9),
  medic: new UnitType("medic", "Medic", [244, 114, 182], 11, 1.9),
};

class UnitTypeFactory {
  private readonly cache = new Map<string, UnitType>();

  get(key: string): UnitType {
    let flyweight = this.cache.get(key);
    if (!flyweight) {
      flyweight = BLUEPRINTS[key];
      if (!flyweight) throw new Error(`unknown unit type: ${key}`);
      this.cache.set(key, flyweight);
    }
    return flyweight;
  }

  keys(): string[] {
    return Object.keys(BLUEPRINTS);
  }

  /** How many distinct flyweights have actually been handed out so far. */
  get liveCount(): number {
    return this.cache.size;
  }
}

// --- Context: extrinsic, per-unit state ------------------------------------
//
// This is the object we create hundreds of. It is intentionally tiny: just
// mutable position/velocity plus a pointer to the shared flyweight.
type Unit = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: UnitType;
};

type Barracks = {
  x: number;
  y: number;
  r: number;
};

type Controls = {
  squad: number;
  selected: string; // "random" or a blueprint key
};

const el = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node as T;
};

const factory = new UnitTypeFactory();
const controls: Controls = { squad: 20, selected: "random" };

const sketch = (p: p5) => {
  const units: Unit[] = [];
  const barracks: Barracks = { x: 0, y: 0, r: 46 };
  let pulse = 0; // brief visual feedback when the barracks is clicked

  const placeBarracks = () => {
    barracks.x = p.width / 2;
    barracks.y = p.height / 2;
  };

  const pickType = (): UnitType => {
    const key = controls.selected === "random" ? p.random(factory.keys()) : controls.selected;
    return factory.get(key);
  };

  const spawn = (type: UnitType): Unit => {
    // Emanate from the barracks rim with an outward velocity.
    const angle = p.random(p.TWO_PI);
    const speed = type.maxSpeed * p.random(0.5, 1);
    return {
      x: barracks.x + Math.cos(angle) * barracks.r,
      y: barracks.y + Math.sin(angle) * barracks.r,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      type,
    };
  };

  const trainSquad = (n: number) => {
    for (let i = 0; i < n; i++) units.push(spawn(pickType()));
    pulse = 1;
  };

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
    placeBarracks();
    // Seed a starting batch so the field isn't empty on load.
    trainSquad(60);
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    placeBarracks();
  };

  p.mousePressed = () => {
    const d = p.dist(p.mouseX, p.mouseY, barracks.x, barracks.y);
    if (d <= barracks.r) trainSquad(controls.squad);
  };

  const updateUnit = (u: Unit) => {
    // A little wander, capped by the flyweight's shared maxSpeed.
    u.vx += p.random(-0.08, 0.08);
    u.vy += p.random(-0.08, 0.08);
    const max = u.type.maxSpeed;
    const sp = Math.hypot(u.vx, u.vy);
    if (sp > max) {
      u.vx = (u.vx / sp) * max;
      u.vy = (u.vy / sp) * max;
    }
    u.x += u.vx;
    u.y += u.vy;

    // Bounce off the canvas edges.
    const h = u.type.size / 2;
    if (u.x < h) {
      u.x = h;
      u.vx = Math.abs(u.vx);
    } else if (u.x > p.width - h) {
      u.x = p.width - h;
      u.vx = -Math.abs(u.vx);
    }
    if (u.y < h) {
      u.y = h;
      u.vy = Math.abs(u.vy);
    } else if (u.y > p.height - h) {
      u.y = p.height - h;
      u.vy = -Math.abs(u.vy);
    }
  };

  const drawBarracks = () => {
    const glow = 80 + pulse * 120;
    p.noStroke();
    p.fill(218, 220, 224, 120);
    p.circle(barracks.x, barracks.y, (barracks.r + 10) * 2);
    p.stroke(26, 115, 232, glow);
    p.strokeWeight(2 + pulse * 3);
    p.fill(255);
    p.circle(barracks.x, barracks.y, barracks.r * 2);
    p.noStroke();
    p.fill(32, 33, 36);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(12);
    p.text("BARRACKS", barracks.x, barracks.y);
    pulse *= 0.9;
    if (pulse < 0.01) pulse = 0;
  };

  p.draw = () => {
    p.background(248, 249, 250);

    // Subtle ground grid for RTS flavour.
    p.stroke(218, 220, 224, 180);
    p.strokeWeight(1);
    const step = 48;
    for (let x = 0; x < p.width; x += step) p.line(x, 0, x, p.height);
    for (let y = 0; y < p.height; y += step) p.line(0, y, p.width, y);

    drawBarracks();

    for (const u of units) {
      updateUnit(u);
      u.type.draw(p, u.x, u.y, Math.atan2(u.vy, u.vx));
    }

    if (p.frameCount % 12 === 0) {
      el("unitCount").textContent = String(units.length);
      el("flyCount").textContent = String(factory.liveCount);
      el("fps").textContent = `${Math.round(p.frameRate())} fps`;
    }
  };
};

function wireControls() {
  const select = el<HTMLSelectElement>("unitType");
  for (const key of factory.keys()) {
    const opt = document.createElement("option");
    opt.value = key;
    opt.textContent = BLUEPRINTS[key]!.label;
    select.appendChild(opt);
  }
  select.addEventListener("change", () => {
    controls.selected = select.value;
  });

  const squad = el<HTMLInputElement>("squad");
  const squadOut = el("squadOut");
  const syncSquad = () => {
    controls.squad = Number(squad.value);
    squadOut.textContent = squad.value;
  };
  squad.addEventListener("input", syncSquad);
  syncSquad();

  // Legend: one row per flyweight blueprint.
  const legend = el("legend");
  for (const key of factory.keys()) {
    const bp = BLUEPRINTS[key]!;
    const [r, g, b] = bp.color;
    const row = document.createElement("div");
    row.className = "legend-row";
    const sw = document.createElement("span");
    sw.className = "swatch";
    sw.style.background = `rgb(${r}, ${g}, ${b})`;
    const label = document.createElement("span");
    label.style.color = "var(--muted)";
    label.style.fontWeight = "400";
    label.textContent = `${bp.label} — speed ${bp.maxSpeed}, size ${bp.size}`;
    row.append(sw, label);
    legend.appendChild(row);
  }
}

wireControls();
new p5(sketch, el("sketch"));

console.log("[13-flyweight-rts] ready");
