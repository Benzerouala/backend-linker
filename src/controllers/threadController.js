//backend/src/controllers/threadController.js
import threadService from "../services/threadService.js"

class ThreadController {
  /**
   * @route   POST /api/threads
   * @desc    Créer un nouveau thread
   * @access  Private
   */
  async createThread(req, res) {
    try {
      const authorId = req.user.id
      const { content } = req.body

      let media = null
      if (req.file) {
        // Convertir l'image en base64 et stocker dans MongoDB
        const fs = await import('fs');
        const path = await import('path');
        
        const filePath = path.join(process.cwd(), 'src', 'uploads', req.file.filename);
        const imageBuffer = fs.readFileSync(filePath);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = req.file.mimetype;
        
        // Stocker en base64 dans MongoDB
        const base64Url = `data:${mimeType};base64,${base64Image}`;
        
        // Supprimer le fichier temporaire
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkError) {
          console.log('Fichier temporaire non supprimé:', unlinkError.message);
        }
        
        media = {
          url: base64Url,
          type: req.file.mimetype.startsWith("image/") ? "image" : "video",
        }
      }

      if (!content || content.trim().length === 0) {
        // Permettre un post sans contenu SEULEMENT s'il y a un média
        if (!media) {
          return res.status(400).json({
            success: false,
            message: "Le contenu ou un média est requis",
          })
        }
      }

      if (content.length > 500) {
        return res.status(400).json({
          success: false,
          message: "Le contenu ne peut pas dépasser 500 caractères",
        })
      }

      const thread = await threadService.createThread(authorId, content, media)

      res.status(201).json({
        success: true,
        message: "Thread créé avec succès",
        data: thread,
      })
    } catch (error) {
      console.error("Erreur createThread:", error)
      res.status(400).json({
        success: false,
        message: error.message || "Erreur lors de la création du thread",
      })
    }
  }

  /**
   * @route   GET /api/threads
   * @desc    Obtenir tous les threads (avec pagination) - Explore
   * @access  Public
   */
  async getAllThreads(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query
      const currentUserId = req.user?.id

      const result = await threadService.getAllThreads(Number.parseInt(page), Number.parseInt(limit), currentUserId)

      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      console.error("Erreur getAllThreads:", error)
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des threads",
      })
    }
  }

  /**
   * @route   GET /api/threads/:id
   * @desc    Obtenir un thread par ID
   * @access  Public
   */
  async getThreadById(req, res) {
    try {
      const { id } = req.params
      const currentUserId = req.user?.id

      const thread = await threadService.getThreadById(id, currentUserId)

      res.status(200).json({
        success: true,
        data: thread,
      })
    } catch (error) {
      console.error("Erreur getThreadById:", error)
      res.status(404).json({
        success: false,
        message: error.message || "Thread non trouvé",
      })
    }
  }

  /**
   * @route   GET /api/threads/user/:userId
   * @desc    Obtenir les threads d'un utilisateur
   * @access  Public
   */
  async getUserThreads(req, res) {
    try {
      const { userId } = req.params
      const { page = 1, limit = 20 } = req.query
      const currentUserId = req.user?.id

      if (!userId || userId === "undefined") {
        return res.status(400).json({
          success: false,
          message: "ID utilisateur non valide",
        })
      }

      const result = await threadService.getUserThreads(
        userId,
        Number.parseInt(page),
        Number.parseInt(limit),
        currentUserId,
      )

      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      console.error("Erreur getUserThreads:", error)
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des threads",
      })
    }
  }

  /**
   * @route   DELETE /api/threads/:id
   * @desc    Supprimer un thread
   * @access  Private
   */
  async deleteThread(req, res) {
    try {
      const { id } = req.params
      const userId = req.user.id

      const result = await threadService.deleteThread(id, userId)

      res.status(200).json({
        success: true,
        message: result.message,
      })
    } catch (error) {
      console.error("Erreur deleteThread:", error)
      res.status(403).json({
        success: false,
        message: error.message || "Non autorisé",
      })
    }
  }

  /**
   * @route   PUT /api/threads/:id
   * @desc    Mettre à jour un thread
   * @access  Private
   */
  async updateThread(req, res) {
    try {
      const { id } = req.params
      const userId = req.user.id
      const { content } = req.body

      let media = null
      if (req.file) {
        // Convertir l'image en base64 et stocker dans MongoDB
        const fs = await import('fs');
        const path = await import('path');
        
        const filePath = path.join(process.cwd(), 'src', 'uploads', req.file.filename);
        const imageBuffer = fs.readFileSync(filePath);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = req.file.mimetype;
        
        // Stocker en base64 dans MongoDB
        const base64Url = `data:${mimeType};base64,${base64Image}`;
        
        // Supprimer le fichier temporaire
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkError) {
          console.log('Fichier temporaire non supprimé:', unlinkError.message);
        }
        
        media = {
          url: base64Url,
          type: req.file.mimetype.startsWith("image/") ? "image" : "video",
        }
      }

      if (content !== undefined) {
        if (content.trim().length === 0) {
          // Permettre un contenu vide SEULEMENT s'il y a un média
          if (!media) {
            return res.status(400).json({
              success: false,
              message: "Le contenu ne peut pas être vide sans média",
            })
          }
        }
        if (content.length > 500) {
          return res.status(400).json({
            success: false,
            message: "Le contenu ne peut pas dépasser 500 caractères",
          })
        }
      }

      const thread = await threadService.updateThread(id, userId, content, media)

      res.status(200).json({
        success: true,
        message: "Thread mis à jour avec succès",
        data: thread,
      })
    } catch (error) {
      console.error("Erreur updateThread:", error)
      res.status(400).json({
        success: false,
        message: error.message || "Erreur lors de la mise à jour du thread",
      })
    }
  }

  /**
   * @route   POST /api/threads/:id/like
   * @desc    Liker un thread
   * @access  Private
   */
  async likeThread(req, res) {
    try {
      const { id } = req.params
      const userId = req.user.id

      const result = await threadService.likeThread(id, userId)

      res.status(200).json({
        success: true,
        message: result.message,
        data: { likesCount: result.likesCount },
      })
    } catch (error) {
      console.error("Erreur likeThread:", error)
      res.status(400).json({
        success: false,
        message: error.message || "Erreur lors du like",
      })
    }
  }

  /**
   * @route   DELETE /api/threads/:id/unlike
   * @desc    Retirer le like d'un thread
   * @access  Private
   */
  async unlikeThread(req, res) {
    try {
      const { id } = req.params
      const userId = req.user.id

      const result = await threadService.unlikeThread(id, userId)

      res.status(200).json({
        success: true,
        message: result.message,
        data: { likesCount: result.likesCount },
      })
    } catch (error) {
      console.error("Erreur unlikeThread:", error)
      res.status(400).json({
        success: false,
        message: error.message || "Erreur lors du unlike",
      })
    }
  }

  /**
   * @route   GET /api/threads/search
   * @desc    Rechercher des threads par contenu
   * @access  Public
   */
  async searchThreads(req, res) {
    try {
      const { q, page = 1, limit = 20 } = req.query
      const currentUserId = req.user?.id

      if (!q) {
        return res.status(400).json({
          success: false,
          message: "La requête de recherche est requise",
        })
      }

      const result = await threadService.searchThreads(
        q,
        Number.parseInt(page),
        Number.parseInt(limit),
        currentUserId
      )

      res.status(200).json({
        success: true,
        data: result.threads,
      })
    } catch (error) {
      console.error("Erreur searchThreads:", error)
      res.status(500).json({
        success: false,
        message: "Erreur lors de la recherche des threads",
      })
    }
  }

  /**
   * @route   GET /api/threads/feed
   * @desc    Obtenir le flux d'actualité (comptes suivis) - Home
   * @access  Private
   */
  async getHomeFeed(req, res) {
    try {
      const { page = 1, limit = 20 } = req.query
      const currentUserId = req.user.id

      const result = await threadService.getFollowedThreads(
        Number.parseInt(page),
        Number.parseInt(limit),
        currentUserId,
      )

      res.status(200).json({
        success: true,
        data: result,
      })
    } catch (error) {
      console.error("Erreur getHomeFeed:", error)
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération du flux d'actualité",
      })
    }
  }
}

export default new ThreadController()