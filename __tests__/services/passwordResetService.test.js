import { jest } from "@jest/globals";

const User = {
  findOne: jest.fn(),
  findById: jest.fn(),
};

const emailService = {
  sendResetPasswordEmail: jest.fn(),
};

const jwt = {
  sign: jest.fn(() => "reset-token"),
  verify: jest.fn(() => ({ id: "user-id", type: "reset" })),
};

jest.unstable_mockModule("../../src/models/User.js", () => ({
  default: User,
}));

jest.unstable_mockModule("../../src/services/emailService.js", () => ({
  default: emailService,
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: jwt,
}));

const { default: passwordResetService } = await import(
  "../../src/services/passwordResetService.js"
);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("passwordResetService", () => {
  it("generates a reset token", () => {
    const token = passwordResetService.generateResetToken("user-id");
    expect(token).toBe("reset-token");
    expect(jwt.sign).toHaveBeenCalledWith(
      { id: "user-id", type: "reset" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" },
    );
  });

  it("verifies reset token", () => {
    const decoded = passwordResetService.verifyResetToken("token");
    expect(decoded).toEqual({ id: "user-id", type: "reset" });
  });

  it("rejects reset token with wrong type", () => {
    jwt.verify.mockImplementationOnce(() => ({ id: "user-id", type: "auth" }));
    expect(() => passwordResetService.verifyResetToken("token")).toThrow(
      "Token de réinitialisation invalide ou expiré",
    );
  });

  it("rejects expired reset token", () => {
    jwt.verify.mockImplementationOnce(() => {
      const error = new Error("expired");
      error.name = "TokenExpiredError";
      throw error;
    });

    expect(() => passwordResetService.verifyResetToken("token")).toThrow(
      "Le lien de réinitialisation a expiré",
    );
  });

  it("sends reset email", async () => {
    User.findOne.mockResolvedValue({
      _id: "user-id",
      email: "test@email.com",
      username: "alice",
    });

    const result = await passwordResetService.forgotPassword("TEST@email.com");

    expect(emailService.sendResetPasswordEmail).toHaveBeenCalled();
    expect(result.token).toBe("reset-token");
  });

  it("rejects reset when email not found", async () => {
    User.findOne.mockResolvedValue(null);
    await expect(
      passwordResetService.forgotPassword("missing@email.com"),
    ).rejects.toThrow("Cet email n'est pas enregistré");
  });

  it("resets password when token is valid", async () => {
    const user = {
      username: "alice",
      save: jest.fn(),
    };
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(user),
    });

    const result = await passwordResetService.resetPassword(
      "token",
      "newpassword",
    );

    expect(user.password).toBe("newpassword");
    expect(user.save).toHaveBeenCalled();
    expect(result.message).toBe("Mot de passe réinitialisé avec succès");
  });

  it("rejects reset when password is too short", async () => {
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ username: "alice" }),
    });

    await expect(
      passwordResetService.resetPassword("token", "short"),
    ).rejects.toThrow("Le mot de passe doit contenir au moins 8 caractères");
  });
});
