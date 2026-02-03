import { jest } from "@jest/globals";

const Follow = {
  findOne: jest.fn(),
  create: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findOneAndDelete: jest.fn(),
  find: jest.fn(),
};

const User = {
  findById: jest.fn(),
};

const userService = {
  incrementFollowingCount: jest.fn(),
  incrementFollowersCount: jest.fn(),
  decrementFollowingCount: jest.fn(),
  decrementFollowersCount: jest.fn(),
};

const settingsService = {
  getUserSettings: jest.fn(),
};

const notificationService = {
  createNotification: jest.fn(),
};

jest.unstable_mockModule("../../src/models/Follow.js", () => ({
  default: Follow,
}));
jest.unstable_mockModule("../../src/models/User.js", () => ({
  default: User,
}));
jest.unstable_mockModule("../../src/services/userService.js", () => ({
  default: userService,
}));
jest.unstable_mockModule("../../src/services/settingsService.js", () => ({
  default: settingsService,
}));
jest.unstable_mockModule("../../src/services/notificationService.js", () => ({
  default: notificationService,
}));
jest.unstable_mockModule("../../src/models/Notification.js", () => ({
  default: {},
}));

const { default: followService } = await import(
  "../../src/services/followService.js"
);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("followService", () => {
  it("prevents self follow", async () => {
    await expect(followService.followUser("1", "1")).rejects.toThrow(
      "Vous ne pouvez pas vous suivre vous-même",
    );
  });

  it("creates follow request for private user", async () => {
    Follow.findOne.mockResolvedValue(null);
    User.findById.mockResolvedValue({ isPrivate: true });
    settingsService.getUserSettings.mockResolvedValue({
      privacy: { whoCanFollowMe: "everyone" },
    });
    Follow.create.mockResolvedValue({ status: "en_attente" });

    const follow = await followService.followUser("a", "b");

    expect(Follow.create).toHaveBeenCalled();
    expect(notificationService.createNotification).toHaveBeenCalledWith({
      recipient: "b",
      sender: "a",
      type: "follow_request",
    });
    expect(follow.status).toBe("en_attente");
  });

  it("accepts follow request", async () => {
    Follow.findOneAndUpdate.mockResolvedValue({ status: "accepte" });
    const result = await followService.acceptFollowRequest("f1", "f2");

    expect(userService.incrementFollowingCount).toHaveBeenCalledWith("f1");
    expect(userService.incrementFollowersCount).toHaveBeenCalledWith("f2");
    expect(notificationService.createNotification).toHaveBeenCalledWith({
      recipient: "f1",
      sender: "f2",
      type: "follow_accepted",
    });
    expect(result.status).toBe("accepte");
  });

  it("rejects follow request", async () => {
    Follow.findOneAndDelete.mockResolvedValue({ id: "follow" });
    const result = await followService.rejectFollowRequest("f1", "f2");
    expect(result.message).toBe("Demande refusée");
  });

  it("returns pending requests", async () => {
    const pending = [{ id: 1 }];
    Follow.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(pending),
      }),
    });

    const result = await followService.getPendingRequests("user");
    expect(result).toBe(pending);
  });

  it("returns sent requests", async () => {
    const pending = [{ id: 2 }];
    Follow.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(pending),
      }),
    });

    const result = await followService.getSentRequests("user");
    expect(result).toBe(pending);
  });

  it("unfollows user", async () => {
    Follow.findOneAndDelete.mockResolvedValue({ id: "follow" });
    const result = await followService.unfollowUser("a", "b");
    expect(userService.decrementFollowingCount).toHaveBeenCalledWith("a");
    expect(userService.decrementFollowersCount).toHaveBeenCalledWith("b");
    expect(result.message).toBe("Désabonnement réussi");
  });

  it("removes follower", async () => {
    Follow.findOne.mockResolvedValue({ id: "follow" });
    Follow.findOneAndDelete.mockResolvedValue({ id: "follow" });

    const result = await followService.removeFollower("a", "b");
    expect(userService.decrementFollowersCount).toHaveBeenCalledWith("a");
    expect(userService.decrementFollowingCount).toHaveBeenCalledWith("b");
    expect(result.message).toBe("Abonné supprimé avec succès");
  });
});
