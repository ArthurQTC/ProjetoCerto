module.exports = {
  apps: [
    {
      name: "ProjetoCerto",
      script: "dist/server.cjs",
      env: {
        NODE_ENV: "production",
        AWS_REGION: process.env.AWS_REGION || "",
        AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || "",
        AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || "",
        AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    },
  ],
};
