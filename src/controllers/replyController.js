import Reply from "../models/Reply.js"
import Thread from "../models/Thread.js"
import Notification from "../models/Notification.js"
import settingsService from "../services/settingsService.js"
import notificationService from "../services/notificationService.js"

class ReplyController {
  /**
   * @route   POST /api/replies/:threadId
   * @desc    Créer une réponse à un thread
   * @access  Private
   */
  async createReply(req, res) {
    try {
      const { threadId } = req.params
      const { content } = req.body
      const authorId = req.user.id

      if (!content || content.trim().length === 0) {
        return res.status(400).json({ success: false, message: "Le contenu est requis" })
      }

      const thread = await Thread.findById(threadId)
      if (!thread) {
        return res.status(404).json({ success: false, message: "Thread non trouvé" })
      }

      const reply = await Reply.create({
        author: authorId,
        thread: threadId,
        content: content.trim(),
      })

      // Ajouter la réponse au tableau replies du thread (comme pour les likes)
      thread.replies.push(reply._id)
      await thread.save()

      // Détecter et créer les notifications de mention
      await notificationService.createMentionNotifications(content, authorId, threadId);

      // Créer une notification pour l'auteur du thread (si ce n'est pas le même)
      if (thread.author.toString() !== authorId.toString()) {
        const canReceiveNotification = await settingsService.canReceiveNotification(
          thread.author,
          "thread_reply",
          "inApp"
        );
        
        if (canReceiveNotification) {
          await Notification.create({
            type: "thread_reply",
            recipient: thread.author,
            sender: authorId,
            thread: threadId,
          });
        }
      }

      const populatedReply = await Reply.findById(reply._id).populate(
        "author",
        "username name profilePicture isVerified",
      )

      res.status(201).json({
        success: true,
        message: "Réponse envoyée",
        data: populatedReply,
      })
    } catch (error) {
      console.error("Erreur createReply:", error)
      res.status(500).json({ success: false, message: "Erreur serveur" })
    }
  }

  /**
   * @route   GET /api/replies/:threadId
   * @desc    Obtenir toutes les réponses d'un thread
   * @access  Public
   */
  async getThreadReplies(req, res) {
    try {
      const { threadId } = req.params
      const replies = await Reply.find({ thread: threadId })
        .populate("author", "username name profilePicture isVerified")
        .sort({ createdAt: -1 })

      res.status(200).json({
        success: true,
        data: replies,
      })
    } catch (error) {
      console.error("Erreur getThreadReplies:", error)
      res.status(500).json({ success: false, message: "Erreur serveur" })
    }
  }

  /**
   * @route   DELETE /api/replies/:id
   * @desc    Supprimer une réponse
   * @access  Private
   */
  async deleteReply(req, res) {
    try {
      const { id } = req.params
      const userId = req.user.id

      const reply = await Reply.findById(id)
      if (!reply) {
        return res.status(404).json({ success: false, message: "Réponse non trouvée" })
      }

      if (reply.author.toString() !== userId.toString()) {
        return res.status(403).json({ success: false, message: "Non autorisé" })
      }

      await Reply.findByIdAndDelete(id)
      
      // Retirer la réponse du tableau replies du thread (comme pour les likes)
      const thread = await Thread.findById(reply.thread)
      if (thread) {
        thread.replies = thread.replies.filter(replyId => replyId.toString() !== id.toString())
        await thread.save()
      }

      res.status(200).json({ success: true, message: "Réponse supprimée" })
    } catch (error) {
      console.error("Erreur deleteReply:", error)
      res.status(500).json({ success: false, message: "Erreur serveur" })
    }
  }
}

export default new ReplyController()
