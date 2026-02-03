import { jest } from "@jest/globals";

const Thread = {
  create: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
};

const Like = { exists: jest.fn() };
const Reply = {};
const Follow = {};
const User = { find: jest.fn() };
const Notification = {};

const settingsService = {};
const userService = {
  incrementThreadsCount: jest.fn(),
};
const notificationService = {
  createMentionNotifications: jest.fn(),
};

jest.unstable_mockModule("../../src/models/Thread.js", () => ({
  default: Thread,
}));
jest.unstable_mockModule("../../src/models/Like.js", () => ({
  default: Like,
}));
jest.unstable_mockModule("../../src/models/Reply.js", () => ({
  default: Reply,
}));
jest.unstable_mockModule("../../src/models/Follow.js", () => ({
  default: Follow,
}));
jest.unstable_mockModule("../../src/models/User.js", () => ({
  default: User,
}));
jest.unstable_mockModule("../../src/models/Notification.js", () => ({
  default: Notification,
}));
jest.unstable_mockModule("../../src/services/settingsService.js", () => ({
  default: settingsService,
}));
jest.unstable_mockModule("../../src/services/userService.js", () => ({
  default: userService,
}));
jest.unstable_mockModule("../../src/services/notificationService.js", () => ({
  default: notificationService,
}));

const { default: threadService } = await import(
  "../../src/services/threadService.js"
);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("threadService", () => {
  it("creates a thread and notifies mentions", async () => {
    const thread = {
      _id: "thread-id",
      populate: jest.fn().mockResolvedValue(),
    };
    Thread.create.mockResolvedValue(thread);

    const result = await threadService.createThread("user-id", "hello", null);

    expect(Thread.create).toHaveBeenCalledWith({
      author: "user-id",
      content: "hello",
      media: null,
    });
    expect(userService.incrementThreadsCount).toHaveBeenCalledWith("user-id");
    expect(notificationService.createMentionNotifications).toHaveBeenCalledWith(
      "hello",
      "user-id",
      "thread-id",
    );
    expect(result).toBe(thread);
  });

  it("returns public threads for anonymous user", async () => {
    const thread = {
      _id: "thread-id",
      author: { _id: "author-id", toObject: () => ({ _id: "author-id" }) },
      toObject: () => ({ _id: "thread-id", author: { _id: "author-id" } }),
    };

    User.find.mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    });
    Thread.find.mockReturnValue({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            populate: jest.fn().mockResolvedValue([thread]),
          }),
        }),
      }),
    });
    Thread.countDocuments.mockResolvedValue(1);

    const result = await threadService.getAllThreads(1, 10, null);

    expect(result.threads).toHaveLength(1);
    expect(result.pagination.totalThreads).toBe(1);
  });
});
