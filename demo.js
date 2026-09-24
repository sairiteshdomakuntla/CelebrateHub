const response = await fetch("http://localhost:5000/api/v1/send/message", {
  method: "POST",
  headers: {
    "X-Server-API-Key": "woSrfKSPFlHeVGX2bDXhfbxU",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    to: ["mdarbazking7@gmail.com"],
    from: "support@airepro.solutions",
    subject: "Hello from Postal",
    plain_body: "This is a test email sent from Postal!"
  })
});

const data = await response.json();
console.log(data);
