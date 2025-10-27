import jwt, { Secret, SignOptions } from "jsonwebtoken";
import type { StringValue } from "ms";

if (!process.env.JWT_ACCESS_SECRET) throw new Error("JWT_ACCESS_SECRET env not set");

const JWT_SECRET: Secret = process.env.JWT_ACCESS_SECRET as Secret;
const JWT_ACCESS_EXPIRES_IN: StringValue = (process.env.JWT_ACCESS_EXPIRY || "15m") as StringValue;
const JWT_REFRESH_EXPIRES_IN: StringValue = (process.env.JWT_REFRESH_EXPIRY || "7d") as StringValue;

class AuthTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthTokenError";
  }
}

export const generateAccessToken = (userId: string): string => {
  try {
    return jwt.sign({ id: userId, type: "access" }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES_IN });
  } catch (error) {
    throw new AuthTokenError("Failed to generate access token");
  }
};

export const generateRefreshToken = (userId: string): string => {
  try {
    return jwt.sign({ id: userId, type: "refresh" }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
  } catch (error) {
    throw new AuthTokenError("Failed to generate refresh token");
  }
};

export const verifyToken = (token: string): jwt.JwtPayload | string => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      throw new AuthTokenError("Token expired");
    }
    throw new AuthTokenError("Invalid token");
  }
};
