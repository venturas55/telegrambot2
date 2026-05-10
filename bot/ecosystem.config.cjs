module.exports = {
  apps: [
    {
      name: "telegramBot",
      script: "./bot/index.js",
      //node_args: "--security-revert=CVE-2023-46809",
      watch: false,
      restart_delay: 3000,
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};