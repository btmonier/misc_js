const output = document.getElementById("output");

if (output) {
  const now = new Date().toLocaleTimeString();
  output.innerHTML = `
    <p>Booted at <strong>${now}</strong>.</p>
    <p>Open your console &mdash; log away.</p>
  `;
}

console.log("[__NAME__] ready");
