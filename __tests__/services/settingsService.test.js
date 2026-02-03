import { jest } from "@jest/globals";

const Settings = {
  findOne: jest.fn(),
  create: jest.fn(),
};

const User = {
  findByIdAndUpdate: jest.fn(),
};

jest.unstable_mockModule("../../src/models/Settings.js", () => ({
  default: Settings,
}));
jest.unstable_mockModule("../../src/models/User.js", () => ({
  default: User,
}));

const { default: settingsService } = await import(
  "../../src/services/settingsService.js"
);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("settingsService", () => {
  it("returns existing settings", async () => {
    const settings = { id: "settings" };
    Settings.findOne.mockResolvedValue(settings);

    const result = await settingsService.getUserSettings("user");
    expect(result).toBe(settings);
  });

  it("creates default settings when missing", async () => {
    Settings.findOne.mockResolvedValue(null);
    Settings.create.mockResolvedValue({ id: "settings" });

    const result = await settingsService.getUserSettings("user");
    expect(Settings.create).toHaveBeenCalled();
    expect(result.id).toBe("settings");
  });

  it("updates privacy settings and syncs isPrivate", async () => {
    const settings = {
      privacy: { whoCanSeeMyPosts: "everyone" },
      save: jest.fn(),
    };
    Settings.findOne.mockResolvedValue(settings);

    const result = await settingsService.updatePrivacySettings("user", {
      whoCanSeeMyPosts: "followers",
    });

    expect(settings.save).toHaveBeenCalled();
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith("user", {
      isPrivate: true,
    });
    expect(result).toBe(settings);
  });

  it("updates display settings and syncs language", async () => {
    const settings = {
      display: { theme: "light" },
      save: jest.fn(),
    };
    Settings.findOne.mockResolvedValue(settings);

    const result = await settingsService.updateDisplaySettings("user", {
      language: "en",
    });

    expect(settings.save).toHaveBeenCalled();
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith("user", {
      language: "en",
    });
    expect(result).toBe(settings);
  });
});
