declare module "p5/core" {
  import P5 from "p5";
  export default P5;
}

type P5Module = (instance: typeof import("p5").default) => void;

declare module "p5/shape" {
  const mod: P5Module;
  export default mod;
}

declare module "p5/color" {
  const mod: P5Module;
  export default mod;
}

declare module "p5/events" {
  const mod: P5Module;
  export default mod;
}

declare module "p5/math" {
  const mod: P5Module;
  export default mod;
}

declare module "p5/utilities" {
  const mod: P5Module;
  export default mod;
}

declare module "p5/webgl" {
  const mod: P5Module;
  export default mod;
}
