const apiUrl = "http://localhost:3001/api";

async function test() {
  // Test health
  const h = await fetch(apiUrl + "/health");
  console.log("Health:", h.status, await h.text());

  // Test categories (public)
  const c = await fetch(apiUrl + "/categories");
  console.log("Categories:", c.status, await c.text());

  // Test checkout
  const co = await fetch(apiUrl + "/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test", email: "t@t.co", plan: "3_months" }),
  });
  console.log("Checkout:", co.status, await co.text());
}

test().catch(console.error);
