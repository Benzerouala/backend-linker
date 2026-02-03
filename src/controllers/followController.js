import followService from "../services/followService.js"

class FollowController {
  async follow(req, res) {
    try {
      const followerId = req.user.id
      const { userId: followingId } = req.params

      console.log("Follow request - followerId:", followerId, "followingId:", followingId)

      const follow = await followService.followUser(followerId, followingId)

      res.status(201).json({
        success: true,
        message: "Utilisateur suivi avec succès",
        data: follow,
      })
    } catch (error) {
      console.error("Follow error:", error)
      const isAlready =
        error.message?.includes("déjà") ||
        error.message?.includes("Déjà")
      if (isAlready) {
        res.status(200).json({
          success: true,
          message: error.message,
        })
        return
      }

      res.status(400).json({
        success: false,
        message: error.message,
      })
    }
  }

  async acceptRequest(req, res) {
    try {
      const { userId: followerId } = req.params
      const followingId = req.user.id

      console.log("Accept request - followerId:", followerId, "followingId:", followingId)

      const follow = await followService.acceptFollowRequest(followerId, followingId)

      res.status(200).json({
        success: true,
        message: "Demande acceptée",
        data: follow,
      })
    } catch (error) {
      console.error("Accept request error:", error)
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async rejectRequest(req, res) {
    try {
      const { userId: followerId } = req.params
      const followingId = req.user.id

      console.log("Reject request - followerId:", followerId, "followingId:", followingId)

      const result = await followService.rejectFollowRequest(followerId, followingId)

      res.status(200).json({
        success: true,
        message: result.message,
      })
    } catch (error) {
      console.error("Reject request error:", error)
      res.status(400).json({ success: false, message: error.message })
    }
  }

  async getPendingRequests(req, res) {
    try {
      const userId = req.user.id
      const requests = await followService.getPendingRequests(userId)

      res.status(200).json({
        success: true,
        data: requests,
      })
    } catch (error) {
      res.status(500).json({ success: false, message: "Erreur lors de la récupération des demandes" })
    }
  }

  async getSentRequests(req, res) {
    try {
      const userId = req.user.id
      const requests = await followService.getSentRequests(userId)

      res.status(200).json({
        success: true,
        data: requests,
      })
    } catch (error) {
      res.status(500).json({ success: false, message: "Erreur lors de la récupération des demandes envoyees" })
    }
  }

  async unfollow(req, res) {
    try {
      const followerId = req.user.id
      const { userId: followingId } = req.params

      const result = await followService.unfollowUser(followerId, followingId)

      res.status(200).json({
        success: true,
        message: result.message,
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      })
    }
  }

  async getFollowers(req, res) {
    try {
      const { userId } = req.params
      const currentUserId = req.user?.id
      const followers = await followService.getFollowers(userId, currentUserId)

      res.status(200).json({
        success: true,
        data: followers,
      })
    } catch (error) {
      res.status(403).json({
        success: false,
        message: error.message || "Erreur lors de la récupération des abonnés",
      })
    }
  }

  async getFollowing(req, res) {
    try {
      const { userId } = req.params
      const currentUserId = req.user?.id
      const following = await followService.getFollowing(userId, currentUserId)

      res.status(200).json({
        success: true,
        data: following,
      })
    } catch (error) {
      res.status(403).json({
        success: false,
        message: error.message || "Erreur lors de la récupération des abonnements",
      })
    }
  }

  async removeFollower(req, res) {
    try {
      const followingId = req.user.id // L'utilisateur qui veut supprimer l'abonné
      const { userId: followerId } = req.params // L'abonné à supprimer

      const result = await followService.removeFollower(followingId, followerId)

      res.status(200).json({
        success: true,
        message: result.message,
      })
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message,
      })
    }
  }
}

export default new FollowController()
