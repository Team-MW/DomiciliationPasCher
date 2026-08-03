const http = require('http');

http.get('http://localhost:5173/api/list-payments?email=sofianelamine31@icloud.com&customerId=cus_UzIZUsDiZoenY0&since=2026-07-31&_t=12345', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log(data);
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
