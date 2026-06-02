const form = document.getElementById("form") as HTMLFormElement;
const input = document.getElementById("number") as HTMLInputElement;
const resultEl = document.getElementById("result")!;

function isPrime(n: bigint): boolean {
  if (n < 2n) return false;
  if (n === 2n) return true;
  if (n % 2n === 0n) return false;
  let d = 3n;
  while (d * d <= n) {
    if (n % d === 0n) return false;
    d += 2n;
  }
  return true;
}

function parseInteger(raw: string): bigint | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^-?\d+$/.test(trimmed)) return null;
  try {
    return BigInt(trimmed);
  } catch {
    return null;
  }
}

function formatNumber(n: bigint): string {
  const s = n < 0n ? n.toString().slice(1) : n.toString();
  const sign = n < 0n ? "−" : "";
  return sign + s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function setResult(message: string, kind: "" | "prime" | "not-prime" = ""): void {
  resultEl.textContent = message;
  resultEl.classList.remove("is-prime", "is-not-prime");
  if (kind === "prime") resultEl.classList.add("is-prime");
  if (kind === "not-prime") resultEl.classList.add("is-not-prime");
}

function check(): void {
  const value = parseInteger(input.value);
  if (value === null) {
    setResult("Enter a whole number (digits only).");
    return;
  }

  if (value < 0n) {
    setResult("Primes are defined for non-negative integers. Try 0 or greater.");
    return;
  }

  const display = formatNumber(value);

  if (value < 2n) {
    setResult(`${display} is not prime.`, "not-prime");
    return;
  }

  if (isPrime(value)) {
    setResult(`${display} is prime.`, "prime");
    return;
  }

  setResult(`${display} is not prime.`, "not-prime");
}

form.addEventListener("submit", (ev) => {
  ev.preventDefault();
  check();
});

input.addEventListener("input", () => {
  if (resultEl.textContent) setResult("");
});

console.log("[08-prime-checker] ready");
