const { S3Client } = require("@aws-sdk/client-s3");

const s3 = new S3Client({
    region: "us-east-1",
    endpoint: "https://s3.filebase.com",
    credentials: {
        accessKeyId: process.env.FILEBASE_KEY,
        secretAccessKey: process.env.FILEBASE_SECRET,
    },
});

module.exports = s3;
