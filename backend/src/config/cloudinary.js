const { v2: cloudinary } = require('cloudinary');

const hasCloudinaryConfig = Boolean(
    process.env.CLOUDINARY_URL ||
    (
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    )
);

if (hasCloudinaryConfig) {
    if (process.env.CLOUDINARY_URL) {
        cloudinary.config({ secure: true });
    } else {
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true,
        });
    }
}

const uploadImageBuffer = (buffer, { folder = 'sabpara/posts' } = {}) => {
    if (!hasCloudinaryConfig) {
        return Promise.reject(new Error('Cloudinary is not configured'));
    }

    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder,
                resource_type: 'image',
                transformation: [
                    { quality: 'auto', fetch_format: 'auto' },
                ],
            },
            (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(result);
            }
        );

        stream.end(buffer);
    });
};

const deleteImage = (publicId) => {
    if (!hasCloudinaryConfig || !publicId) {
        return Promise.resolve();
    }

    return cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
};

module.exports = {
    hasCloudinaryConfig,
    deleteImage,
    uploadImageBuffer,
};
