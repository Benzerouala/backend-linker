import { jest } from "@jest/globals";

jest.unstable_mockModule("socket.io", () => ({
  Server: jest.fn(),
}));
jest.unstable_mockModule("jsonwebtoken", () => ({
  default: { verify: jest.fn() },
}));

const { default: socketService } = await import(
  "../../src/services/socketService.js"
);

beforeEach(() => {
  socketService.io = null;
  socketService.connectedUsers = new Map();
});

describe("socketService", () => {
  it("sends notification when user is connected", () => {
    const emit = jest.fn();
    socketService.io = { to: jest.fn(() => ({ emit })) };
    socketService.connectedUsers.set("user", "socket-id");

    socketService.sendNotification("user", { id: "n1" });

    expect(socketService.io.to).toHaveBeenCalledWith("user_user");
    expect(emit).toHaveBeenCalledWith(
      "new_notification",
      expect.objectContaining({ data: { id: "n1" } }),
    );
  });

  it("reports connection status", () => {
    socketService.connectedUsers.set("user", "socket-id");
    expect(socketService.isUserConnected("user")).toBe(true);
    expect(socketService.isUserConnected("other")).toBe(false);
  });

  it("returns connected users count", () => {
    socketService.connectedUsers.set("a", "1");
    socketService.connectedUsers.set("b", "2");
    expect(socketService.getConnectedUsersCount()).toBe(2);
  });

  it("broadcasts system notification", () => {
    const emit = jest.fn();
    socketService.io = { emit };
    socketService.broadcastSystemNotification("hello");
    expect(emit).toHaveBeenCalledWith(
      "system_notification",
      expect.objectContaining({ data: { message: "hello" } }),
    );
  });
});
