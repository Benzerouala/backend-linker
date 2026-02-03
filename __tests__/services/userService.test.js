import { jest } from "@jest/globals";

const User = {
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
};

const Follow = {
  findOne: jest.fn(),
};

jest.unstable_mockModule("../../src/models/User.js", () => ({
  default: User,
}));
jest.unstable_mockModule("../../src/models/Follow.js", () => ({
  default: Follow,
}));
jest.unstable_mockModule("../../src/models/Thread.js", () => ({
  default: {},
}));
jest.unstable_mockModule("../../src/models/Reply.js", () => ({
  default: {},
}));
jest.unstable_mockModule("../../src/models/Notification.js", () => ({
  default: {},
}));
jest.unstable_mockModule("../../src/models/Settings.js", () => ({
  default: {},
}));
jest.unstable_mockModule("../../src/models/Like.js", () => ({
  default: {},
}));

const { default: userService } = await import(
  "../../src/services/userService.js"
);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("userService", () => {
  it("creates user", async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ id: "user" });

    const user = await userService.createUser({
      username: "alice",
      email: "alice@email.com",
      password: "pw",
    });

    expect(User.create).toHaveBeenCalled();
    expect(user).toEqual({ id: "user" });
  });

  it("finds by email", async () => {
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue({ id: "user" }),
    });
    const user = await userService.findByEmail("test@email.com");
    expect(user).toEqual({ id: "user" });
  });

  it("finds by id", async () => {
    User.findById.mockResolvedValue({ id: "user" });
    const user = await userService.findById("user");
    expect(user).toEqual({ id: "user" });
  });

  it("throws when user not found by id", async () => {
    User.findById.mockResolvedValue(null);
    await expect(userService.findById("user")).rejects.toThrow(
      "Utilisateur non trouvé",
    );
  });

  it("finds by username", async () => {
    User.findOne.mockResolvedValue({ id: "user" });
    const user = await userService.findByUsername("alice");
    expect(user).toEqual({ id: "user" });
  });

  it("returns limited profile for private account when not following", async () => {
    const user = {
      _id: "user-id",
      username: "alice",
      name: "Alice",
      profilePicture: "pic",
      isPrivate: true,
      isVerified: false,
      followersCount: 1,
      followingCount: 2,
      getPublicProfile: () => ({ id: "user-id" }),
    };
    User.findById.mockResolvedValue(user);
    Follow.findOne.mockResolvedValue(null);

    const profile = await userService.getUserProfile("user-id", "viewer-id");

    expect(profile.isPrivate).toBe(true);
    expect(profile.message).toBe("Ce profil est privé");
  });

  it("adds follow status when public profile", async () => {
    const user = {
      _id: "user-id",
      isPrivate: false,
      getPublicProfile: () => ({ id: "user-id" }),
    };
    User.findById.mockResolvedValue(user);
    Follow.findOne.mockResolvedValue({ status: "accepte" });

    const profile = await userService.getUserProfile("user-id", "viewer-id");

    expect(profile.isFollowing).toBe(true);
    expect(profile.followStatus).toBe("accepte");
  });
});
