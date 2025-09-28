import { v2 as cloudinary } from 'cloudinary';
import { logger } from './logger';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadImage = async (base64Image: string, folder: string = 'users'): Promise<string> => {
  try {
    const result = await cloudinary.uploader.upload(base64Image, {
      folder: folder,
      resource_type: 'image',
      transformation: [
        { width: 500, height: 500, crop: 'fill' },
        { quality: 'auto' },
        { fetch_format: 'auto' }
      ]
    });
    
    return result.secure_url;
  } catch (error: any) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }
};

export const deleteImage = async (imageUrl: string): Promise<void> => {
  try {
    const publicId = extractPublicId(imageUrl);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }
  } catch (error: any) {
    logger.warn('Failed to delete image from Cloudinary', {
      error: error.message,
      imageUrl,
      service: 'cloudinary',
      action: 'delete',
      critical: false
    });
    // Don't throw error as this is not critical
  }
};

const extractPublicId = (imageUrl: string): string | null => {
  const matches = imageUrl.match(/\/([^\/]+)\.(jpg|jpeg|png|gif|webp)$/);
  return matches ? matches[1] : null;
};
