import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      FIREBASE_PROJECT_ID: "test-project",
      FIREBASE_CLIENT_EMAIL: "test@test.iam.gserviceaccount.com",
      FIREBASE_PRIVATE_KEY: "test-key",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    },
  },
});
