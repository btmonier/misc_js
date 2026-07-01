import p5 from "./p5-lite";

/**
 * A 3D warp-speed starfield rendered with p5.js in WEBGL mode.
 *
 * Each star keeps a fixed (x, y) and only travels along z toward the camera.
 * Perspective projection turns that single axis of motion into the classic
 * radial "warp" spread. We lean on a few of p5's graphics features:
 *   - WEBGL perspective camera + 3D primitives
 *   - additive blending for glow
 *   - per-star colour and depth-based size/alpha for a sense of distance
 */

type Star = {
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
};

type Controls = {
  speed: number;
  count: number;
  trail: number;
  spin: boolean;
};

const DEPTH = 2600; // how far back the field extends along -z

const el = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node as T;
};

const controls: Controls = { speed: 12, count: 900, trail: 6, spin: true };

const sketch = (p: p5) => {
  let stars: Star[] = [];
  let nearPlane = 0;
  let boost = 0; // decays after a click for a momentary speed kick

  const palette = (): [number, number, number] => {
    // Mostly cool white/blue stars with the occasional warm one.
    const t = p.random();
    if (t < 0.7) return [200 + p.random(55), 215 + p.random(40), 255];
    if (t < 0.9) return [150 + p.random(60), 190 + p.random(50), 255];
    return [255, 220 + p.random(35), 180 + p.random(40)];
  };

  const spawn = (atFar: boolean): Star => {
    const [r, g, b] = palette();
    return {
      x: p.random(-p.width, p.width),
      y: p.random(-p.height, p.height),
      z: atFar ? -DEPTH : p.random(-DEPTH, nearPlane - 1),
      r,
      g,
      b,
    };
  };

  const resize = () => {
    const n = controls.count;
    if (stars.length < n) {
      while (stars.length < n) stars.push(spawn(false));
    } else if (stars.length > n) {
      stars.length = n;
    }
  };

  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight, p.WEBGL);
    p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
    // Camera sits at +z looking at the origin; this is where stars "arrive".
    nearPlane = p.height / 2 / Math.tan(p.PI / 6) - 60;
    stars = Array.from({ length: controls.count }, () => spawn(false));
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
    nearPlane = p.height / 2 / Math.tan(p.PI / 6) - 60;
  };

  p.mousePressed = () => {
    if (p.mouseX >= 0 && p.mouseY >= 0) boost = 1;
  };

  p.draw = () => {
    p.background(3, 4, 10);
    resize();

    // Gentle auto-drift plus mouse steering for parallax.
    if (controls.spin) {
      const mx = (p.mouseX / p.width - 0.5) * 0.6;
      const my = (p.mouseY / p.height - 0.5) * 0.6;
      p.rotateY(mx + p.frameCount * 0.0008);
      p.rotateX(-my + p.frameCount * 0.0005);
    }

    const speed = controls.speed * (1 + boost * 3);
    boost *= 0.9;
    if (boost < 0.01) boost = 0;

    p.blendMode(p.ADD);

    for (const s of stars) {
      s.z += speed;
      if (s.z >= nearPlane) {
        Object.assign(s, spawn(true));
        continue;
      }

      // 0 (far) -> 1 (close). Drives size and brightness.
      const closeness = p.constrain((s.z + DEPTH) / (DEPTH + nearPlane), 0, 1);
      const alpha = 30 + closeness * 225;
      const weight = 0.6 + closeness * closeness * 5;

      // Motion streak: a line trailing behind along the travel axis.
      const streak = controls.trail * (speed * 0.15) * closeness;
      if (streak > 1) {
        p.strokeWeight(weight * 0.7);
        p.stroke(s.r, s.g, s.b, alpha * 0.55);
        p.line(s.x, s.y, s.z - streak, s.x, s.y, s.z);
      }

      p.strokeWeight(weight);
      p.stroke(s.r, s.g, s.b, alpha);
      p.point(s.x, s.y, s.z);
    }

    p.blendMode(p.BLEND);

    if (p.frameCount % 12 === 0) {
      el("fps").textContent = `${Math.round(p.frameRate())} fps`;
    }
  };
};

function wireControls() {
  const bind = (id: string, outId: string, key: "speed" | "count" | "trail") => {
    const input = el<HTMLInputElement>(id);
    const out = el(outId);
    const sync = () => {
      const v = Number(input.value);
      controls[key] = v;
      out.textContent = String(v);
    };
    input.addEventListener("input", sync);
    sync();
  };

  bind("speed", "speedOut", "speed");
  bind("count", "countOut", "count");
  bind("trail", "trailOut", "trail");

  const spin = el<HTMLInputElement>("spin");
  const syncSpin = () => {
    controls.spin = spin.checked;
  };
  spin.addEventListener("change", syncSpin);
  syncSpin();
}

wireControls();
new p5(sketch, el("sketch"));

console.log("[12-p5-starfield] ready");
