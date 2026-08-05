const apiUrl = "http://localhost:3001/api/checkout";

const body = JSON.stringify({
  name: "Test User",
  email: "test@e2e.com",
  plan: "3_months",
});

fetch(apiUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body,
})
  .then(async (r) => {
    console.log("Status:", r.status);
    const text = await r.text();
    console.log("Body:", text);
  })
  .catch((e) => console.error("Error:", e.message));
