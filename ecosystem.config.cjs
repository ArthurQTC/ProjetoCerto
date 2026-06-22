module.exports = {
  apps: [
    {
      name: "ProjetoCerto",
      script: "dist/server.cjs",
      env_file: ".env.production",
    },
  ],
};
