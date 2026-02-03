import { jest } from "@jest/globals";

const User = {
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
};

const jwt = {
  sign: jest.fn(() => "test-token"),
  verify: jest.fn(() => ({ id: "user-id" })),
};

jest.unstable_mockModule("../../src/models/User.js", () => ({
  default: User,
}));

jest.unstable_mockModule("jsonwebtoken", () => ({
  default: jwt,
}));

const { default: authService } = await import(
  "../../src/services/authService.js"
);

beforeEach(() => {
  jest.clearAllMocks();
});

describe("authService", () => {
  it("generates a JWT token", () => {
    const token = authService.generateToken("user-id");
    expect(token).toBe("test-token");
    expect(jwt.sign).toHaveBeenCalledWith(
      { id: "user-id" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
  });

  it("verifies a JWT token", () => {
    const decoded = authService.verifyToken("token");
    expect(decoded).toEqual({ id: "user-id" });
    expect(jwt.verify).toHaveBeenCalledWith("token", process.env.JWT_SECRET);
  });

  it("throws when token is invalid", () => {
    jwt.verify.mockImplementationOnce(() => {
      throw new Error("invalid");
    });

    expect(() => authService.verifyToken("bad-token")).toThrow(
      "Token invalide ou expiré",
    );
  });

  it("registers a new user", async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({
      _id: "user-id",
      getPublicProfile: () => ({ id: "user-id", username: "alice" }),
    });

    const result = await authService.register({
      username: "alice",
      email: "Alice@Email.com",
      password: "password",
    });

    expect(User.findOne).toHaveBeenCalled();
    expect(User.create).toHaveBeenCalledWith({
      username: "alice",
      email: "alice@email.com",
      password: "password",
      name: "alice",
    });
    expect(result.token).toBe("test-token");
    expect(result.user).toEqual({ id: "user-id", username: "alice" });
  });

  it("rejects register when email exists", async () => {
    User.findOne.mockResolvedValue({ email: "test@email.com" });

    await expect(
      authService.register({
        username: "alice",
        email: "test@email.com",
        password: "password",
      }),
    ).rejects.toThrow("Cet email est déjà utilisé");
  });

  it("rejects register when username exists", async () => {
    User.findOne.mockResolvedValue({ email: "other", username: "alice" });

    await expect(
      authService.register({
        username: "alice",
        email: "test@email.com",
        password: "password",
      }),
    ).rejects.toThrow("Ce nom d'utilisateur est déjà pris");
  });

  it("logs in a user with valid credentials", async () => {
    const user = {
      _id: "user-id",
      comparePassword: jest.fn().mockResolvedValue(true),
      getPublicProfile: () => ({ id: "user-id", username: "alice" }),
    };
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(user),
    });

    const result = await authService.login("test@email.com", "password");

    expect(user.comparePassword).toHaveBeenCalledWith("password");
    expect(result.token).toBe("test-token");
    expect(result.user).toEqual({ id: "user-id", username: "alice" });
  });

  it("rejects login when user not found", async () => {
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    await expect(authService.login("a@b.com", "pw")).rejects.toThrow(
      "Email ou mot de passe incorrect",
    );
  });

  it("rejects login when password mismatch", async () => {
    const user = {
      comparePassword: jest.fn().mockResolvedValue(false),
    };
    User.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(user),
    });

    await expect(authService.login("a@b.com", "pw")).rejects.toThrow(
      "Email ou mot de passe incorrect",
    );
  });

  it("gets user from token", async () => {
    User.findById.mockResolvedValue({ id: "user-id" });
    const user = await authService.getUserFromToken("token");
    expect(user).toEqual({ id: "user-id" });
  });

  it("throws when user not found from token", async () => {
    User.findById.mockResolvedValue(null);
    await expect(authService.getUserFromToken("token")).rejects.toThrow(
      "Utilisateur non trouvé",
    );
  });
});
