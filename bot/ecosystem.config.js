export default {
  apps: [
    {
      name: "telegrambot",
      script: "./index.js",
      node_args: "--security-revert=CVE-2023-46809",
      watch: false,
      restart_delay: 3000,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};