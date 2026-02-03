import { jest } from "@jest/globals";

jest.unstable_mockModule("../../src/models/Thread.js", () => ({
  default: {},
}));
jest.unstable_mockModule("../../src/models/Reply.js", () => ({
  default: {},
}));
jest.unstable_mockModule("../../src/models/User.js", () => ({
  default: {},
}));
jest.unstable_mockModule("../../src/services/notificationService.js", () => ({
  default: {},
}));

const { default: validationService } = await import(
  "../../src/services/validationService.js"
);

describe("validationService", () => {
  it("flags inappropriate content", async () => {
    const result = await validationService.autoValidateContent(
      "This is spam",
      "user-id",
    );
    expect(result.isValid).toBe(false);
    expect(result.requiresModeration).toBe(true);
  });

  it("flags suspicious formatting", async () => {
    const result = await validationService.autoValidateContent(
      "THIS IS VERY LOUD!!!!!!!!",
      "user-id",
    );
    expect(result.isValid).toBe(false);
  });

  it("accepts normal content", async () => {
    const result = await validationService.autoValidateContent(
      "Bonjour tout le monde",
      "user-id",
    );
    expect(result.isValid).toBe(true);
  });
});
