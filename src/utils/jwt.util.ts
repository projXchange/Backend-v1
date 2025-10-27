import jwt, { Secret } from "jsonwebtoken";
import type { StringValue } from "ms";
import { encryptToken } from "./jwe.util";

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

export const generateAccessToken = async (userId: string): Promise<string> => {
  try {
    const token = jwt.sign({ id: userId, type: "access" }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES_IN });
    
    // Only encrypt if JWE_ENCRYPTION_KEY is configured
    if (process.env.JWE_ENCRYPTION_KEY) {
      try {
        const encryptedToken = await encryptToken(token);
        return encryptedToken;
      } catch (error: any) {
        // If JWE fails, log warning and return plain JWT
        console.warn('JWE encryption failed, returning plain JWT:', error.message);
        return token;
      }
    }
    
    return token;
  } catch (error: any) {
    throw new AuthTokenError(`Failed to generate access token: ${error.message}`);
  }
};

export const generateRefreshToken = async (userId: string): Promise<string> => {
  try {
    const token = jwt.sign({ id: userId, type: "refresh" }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
    
    // Only encrypt if JWE_ENCRYPTION_KEY is configured
    if (process.env.JWE_ENCRYPTION_KEY) {
      try {
        const encryptedToken = await encryptToken(token);
        return encryptedToken;
      } catch (error: any) {
        // If JWE fails, log warning and return plain JWT
        console.warn('JWE encryption failed, returning plain JWT:', error.message);
        return token;
      }
    }
    
    return token;
  } catch (error: any) {
    throw new AuthTokenError(`Failed to generate refresh token: ${error.message}`);
  }
};

export const verifyToken = async (token: string, logger?: any): Promise<jwt.JwtPayload | string> => {
  try {
    let decryptedJWT = token;
    
    // Only try to decrypt if JWE_ENCRYPTION_KEY is configured
    if (process.env.JWE_ENCRYPTION_KEY) {
      try {
        // Import decryptTokenWithFallback dynamically to avoid circular dependencies
        const { decryptTokenWithFallback } = await import("./jwe.util");
        
        // Decrypt JWE to get JWT (with migration mode fallback)
        const result = await decryptTokenWithFallback(token, logger);
        decryptedJWT = result.jwt;
      } catch (error: any) {
        // If JWE decryption fails, try as plain JWT
        if (logger) {
          logger.warn('JWE decryption failed, trying plain JWT', { error: error.message });
        }
        decryptedJWT = token;
      }
    }
    
    // Verify the JWT
    const verified = jwt.verify(decryptedJWT, JWT_SECRET);

    return verified;
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      throw new AuthTokenError("Token expired");
    }
    if (error.name === "JsonWebTokenError") {
      throw new AuthTokenError("Invalid token");
    }
    throw new AuthTokenError("Invalid token");
  }
};
