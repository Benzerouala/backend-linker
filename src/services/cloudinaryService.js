import { v2 as cloudinary } from 'cloudinary';

// Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class CloudinaryService {
  /**
   * Upload une image vers Cloudinary
   */
  async uploadImage(file, folder = 'profile-images') {
    try {
      if (!file) {
        throw new Error('Aucun fichier fourni');
      }

      // Convertir le buffer en base64 si nécessaire
      let fileData;
      if (file.buffer) {
        fileData = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      } else if (file.path) {
        // Si c'est un chemin de fichier local
        const fs = await import('fs');
        fileData = await fs.promises.readFile(file.path);
        fileData = `data:${file.mimetype};base64,${fileData.toString('base64')}`;
      } else {
        throw new Error('Format de fichier non supporté');
      }

      const result = await cloudinary.uploader.upload(fileData, {
        folder,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        max_file_size: 10485760, // 10MB
        transformation: [
          { width: 1200, height: 1200, crop: 'limit', quality: 'auto' }
        ]
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height
      };

    } catch (error) {
      console.error('Erreur upload Cloudinary:', error);
      throw new Error('Erreur lors de l\'upload de l\'image');
    }
  }

  /**
   * Supprimer une image de Cloudinary
   */
  async deleteImage(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error('Erreur suppression Cloudinary:', error);
      throw new Error('Erreur lors de la suppression de l\'image');
    }
  }

  /**
   * Vérifier si Cloudinary est configuré
   */
  isConfigured() {
    return !!(process.env.CLOUDINARY_CLOUD_NAME && 
             process.env.CLOUDINARY_API_KEY && 
             process.env.CLOUDINARY_API_SECRET);
  }
}

export default new CloudinaryService();
