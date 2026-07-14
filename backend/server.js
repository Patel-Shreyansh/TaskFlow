const app = require("./src/app");
const env = require("./src/config/env");

app.listen(env.PORT, () => {
  console.log(`✅ TaskFlow API running on http://localhost:${env.PORT}`);
  console.log(`   Environment: ${env.NODE_ENV}`);

  if (env.JWT_SECRET === "dev-secret-change-me") {
    console.warn(
      "⚠️  Using the default JWT_SECRET. Copy .env.example to .env and set a real secret."
    );
  }
});
