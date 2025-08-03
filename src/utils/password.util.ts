import bcrypt from "bcryptjs";

class PasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasswordError";
  }
}

export const hashPassword = async (password: string) => {
  if (!password || typeof password !== "string" || password.length < 6) {
    throw new PasswordError("Password must be at least 6 characters");
  }
  try {
    return await bcrypt.hash(password, 12);
  } catch (error) {
    throw new PasswordError("Failed to hash password");
  }
};

export const comparePassword = async (plain: string, hashed: string) => {
  try {
    return await bcrypt.compare(plain, hashed);
  } catch (error) {
    throw new PasswordError("Password comparison failed");
  }
};
