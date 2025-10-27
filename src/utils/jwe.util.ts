import { CompactEncrypt, compactDecrypt } from "jose";

if (!process.env.JWE_ENCRYPTION_KEY) {
  throw new Error("JWE_ENCRYPTION_KEY environment variable is not set");
}

// Get encryption key from environment
const getEncryptionKey = (): Uint8Array => {
  const keyBuffer = Buffer.from(process.env.JWE_ENCRYPTION_KEY!, "base64");
  if (keyBuffer.length !== 32) {
    throw new Error(`JWE_ENCRYPTION_KEY must be 32 bytes (256 bits), got ${keyBuffer.length} bytes`);
  }
  return new Uint8Array(keyBuffer);
};

/**
 * Encrypts a JWT string into a JWE compact serialization format
 * @param jwt - The JWT string to encrypt
 * @returns JWE encrypted token string
 */
export const encryptToken = async (jwt: string): Promise<string> => {
  try {
    if (!jwt || typeof jwt !== "string") {
      throw new Error("Invalid JWT input: must be a non-empty string");
    }

    const encryptionKey = getEncryptionKey();
    const encoder = new TextEncoder();
    const jwtBytes = encoder.encode(jwt);

    // Encrypt using A256GCM (AES-256-GCM) with direct key agreement
    const jwe = await new CompactEncrypt(jwtBytes)
      .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
      .encrypt(encryptionKey);

    return jwe;
  } catch (error: any) {
    throw new Error(`Failed to encrypt token: ${error.message}`);
  }
};

/**
 * Decrypts a JWE string back to the original JWT
 * @param jwe - The JWE encrypted token string
 * @returns Decrypted JWT string
 */
export const decryptToken = async (jwe: string): Promise<string> => {
  try {
    if (!jwe || typeof jwe !== "string") {
      throw new Error("Invalid JWE input: must be a non-empty string");
    }

    const encryptionKey = getEncryptionKey();

    // Decrypt the JWE token
    const { plaintext } = await compactDecrypt(jwe, encryptionKey);
    
    const decoder = new TextDecoder();
    const jwt = decoder.decode(plaintext);

    return jwt;
  } catch (error: any) {
    throw new Error(`Failed to decrypt token: ${error.message}`);
  }
};

/**
 * Checks if a token string is in JWE format (5 parts) vs JWT format (3 parts)
 * @param token - The token string to check
 * @returns true if token appears to be JWE format, false otherwise
 */
export const isJWE = (token: string): boolean => {
  if (!token || typeof token !== "string") {
    return false;
  }

  // JWE compact serialization has 5 parts separated by dots
  // JWT has 3 parts separated by dots
  const parts = token.split(".");
  return parts.length === 5;
};

/**
 * Checks if migration mode is enabled (allows plain JWT tokens)
 * @returns true if JWE_ALLOW_PLAIN_JWT environment variable is set to 'true'
 */
export const isMigrationModeEnabled = (): boolean => {
  return process.env.JWE_ALLOW_PLAIN_JWT === "true";
};

/**
 * Attempts to decrypt a token with JWE, falling back to plain JWT in migration mode
 * @param token - The token string (JWE or JWT)
 * @param logger - Optional logger instance for warnings
 * @returns Decrypted JWT string
 */
export const decryptTokenWithFallback = async (
  token: string,
  logger?: any
): Promise<{ jwt: string; wasPlainJWT: boolean }> => {
  // First, try to decrypt as JWE
  if (isJWE(token)) {
    try {
      const jwt = await decryptToken(token);
      return { jwt, wasPlainJWT: false };
    } catch (error: any) {
      // If it looks like JWE but fails to decrypt, don't fall back
      throw error;
    }
  }

  // Token doesn't look like JWE (might be plain JWT)
  if (isMigrationModeEnabled()) {
    // Check if it looks like a JWT (3 parts)
    const parts = token.split(".");
    if (parts.length === 3) {
      // Log warning about plain JWT usage
      if (logger) {
        logger.warn("Plain JWT detected in migration mode", {
          operation: "jwe_decrypt_fallback",
          tokenFormat: "jwt",
          migrationMode: true
        });
      }
      
      // Return the plain JWT
      return { jwt: token, wasPlainJWT: true };
    }
  }

  // Token is neither valid JWE nor plain JWT in migration mode
  throw new Error(
    isMigrationModeEnabled()
      ? "Invalid token format: not a valid JWE or JWT"
      : "Invalid token format: JWE encryption required"
  );
};
