import { jest } from "@jest/globals";

const createTransport = jest.fn(() => ({
  verify: jest.fn().mockResolvedValue(true),
  sendMail: jest.fn().mockResolvedValue({ messageId: "id" }),
}));

jest.unstable_mockModule("nodemailer", () => ({
  default: { createTransport },
}));

const { default: emailService } = await import(
  "../../src/services/emailService.js"
);

beforeEach(() => {
  jest.clearAllMocks();
  emailService.transporter = null;
  process.env.EMAIL_USER = "apikey";
  process.env.EMAIL_PASSWORD = "secret";
  process.env.EMAIL_SERVICE = "sendgrid";
});

describe("emailService", () => {
  it("creates transporter once", () => {
    const transporter = emailService.getTransporter();
    const transporter2 = emailService.getTransporter();
    expect(transporter).toBe(transporter2);
    expect(createTransport).toHaveBeenCalledTimes(1);
  });

  it("verifies connection", async () => {
    const result = await emailService.verifyConnection();
    expect(result).toBe(true);
  });
});
