import jwt, { Secret, SignOptions } from "jsonwebtoken";
import type { StringValue } from "ms";

const JWT_SECRET: Secret = process.env.JWT_ACCESS_SECRET as Secret;
const JWT_ACCESS_EXPIRES_IN: StringValue = (process.env.JWT_ACCESS_EXPIRY || "15m") as StringValue;
const JWT_REFRESH_EXPIRES_IN: StringValue = (process.env.JWT_REFRESH_EXPIRY || "7d") as StringValue;

export const generateAccessToken = (userId: string): string => {
  try {
    const payload = { id: userId, type: "access" };
    const options: SignOptions = { expiresIn: JWT_ACCESS_EXPIRES_IN };

    return jwt.sign(payload, JWT_SECRET, options);
  } catch (error) {
    console.error("Error generating access token:", error);
    throw new Error("Error generating access token");
  }
};

export const generateRefreshToken = (userId: string): string => {
  try {
    const payload = { id: userId, type: "refresh" };
    const options: SignOptions = { expiresIn: JWT_REFRESH_EXPIRES_IN };

    return jwt.sign(payload, JWT_SECRET, options);
  } catch (error) {
    console.error("Error generating refresh token:", error);
    throw new Error("Error generating refresh token");
  }
};

export const verifyToken = (token: string): jwt.JwtPayload | string => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error("Error verifying token:", error);
    throw new Error("Invalid token");
  }
};