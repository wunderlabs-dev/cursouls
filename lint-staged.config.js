export default {
  "*.{ts,tsx}": ["biome check --write", "eslint --fix"],
  "*.{js,jsx,mjs}": ["biome check --write"],
  "*.json !*-lock.json": ["biome check --write"],
};
