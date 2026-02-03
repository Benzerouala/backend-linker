import { jest } from "@jest/globals";

jest.unstable_mockModule("../../src/models/Notification.js", () => ({
  default: {},
}));
jest.unstable_mockModule("../../src/services/settingsService.js", () => ({
  default: {},
}));
jest.unstable_mockModule("../../src/services/socketService.js", () => ({
  default: {},
}));
jest.unstable_mockModule("../../src/services/emailService.js", () => ({
  default: {},
}));
jest.unstable_mockModule("../../src/models/User.js", () => ({
  default: {},
}));

const { default: notificationService } = await import(
  "../../src/services/notificationService.js"
);

describe("notificationService", () => {
  it("detects mentions without duplicates", () => {
    const mentions = notificationService.detectMentions(
      "Salut @alice et @bob, encore @alice",
    );
    expect(mentions).toEqual(["alice", "bob"]);
  });

  it("returns empty mentions for invalid input", () => {
    expect(notificationService.detectMentions(null)).toEqual([]);
  });

  it("builds email messages per type", () => {
    const message = notificationService.buildEmailMessage(
      "thread_like",
      "Alice",
      "hello",
    );
    expect(message.subject).toBe("Nouveau j'aime");
    expect(message.message).toContain("Alice a aimé votre post.");
  });
});
