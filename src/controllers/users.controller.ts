import crypto from "crypto";
import { createUser, findByEmail, findByForgotToken, updateUser, checkEmailExists } from "../repository/users.repository";
import { comparePassword, hashPassword } from "../utils/password.util";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.util";
import { sendMail } from "../utils/email.utils";

export const signup = async (c: any) => {
  try {
    const { email, password, full_name } = await c.req.json();
    
    // Validate required fields
    if (!(email && password)) {
      return c.json({ error: "Missing required fields: email, password" }, 400);
    }

    // Validate email format
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return c.json({ error: "Invalid email format" }, 400);
    }

    // Validate password strength
    if (password.length < 8) {
      return c.json({ error: "Password must be at least 8 characters" }, 400);
    }

    // Check if email already exists
    if (await checkEmailExists(email)) {
      return c.json({ error: "Email already exists" }, 400);
    }

    // Create user
    const hashed = await hashPassword(password);
    const [newUser] = await createUser({ 
      email, 
      password: hashed, 
      full_name 
    });
    
    const accessToken = generateAccessToken(newUser.id);
    const refreshToken = generateRefreshToken(newUser.id);

    // Remove password from response
    const { password: _, ...userResponse } = newUser;
    
    return c.json({ 
      user: userResponse, 
      accessToken, 
      refreshToken 
    });
    
  } catch (error: any) {
    console.error("Signup error:", error);
    return c.json({ 
      error: error.message || "Failed to create account" 
    }, 500);
  }
};

export const signin = async (c: any) => {
  try{
    const { email, password } = await c.req.json();
    if (!(email && password)) return c.json({ error: "Missing required fields" }, 400);

    const usersFound = await findByEmail(email);
    if (!usersFound.length) return c.json({ error: "Invalid credentials, user not found" }, 400);
    const user = usersFound[0];

    if (!(await comparePassword(password, user.password))) {
      return c.json({ error: "Invalid credentials, password mismatch" }, 400);
    }
    // Remove password from response
    const { password: _, ...userResponse } = user;
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    return c.json({  user: userResponse, accessToken, refreshToken });
  }catch(error:any){  
    return c.json({ error: error.message || "Failed to sign in" }, 500);
  }
};

export const logout = async (c: any) => {
  try {
    c.header("Set-Cookie", [
      "accessToken=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict; Secure",
      "refreshToken=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict; Secure"
    ]);
    return c.json({ message: "Logout successful" });
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to log out" }, 500);
  }
};

export const forgotPassword = async (c: any) => {
  const { email } = await c.req.json();
  if (!email) return c.json({ error: "Email required" }, 400);

  // Could rate-limit on IP/email here
  const usersFound = await findByEmail(email);
  if (!usersFound.length) return c.json({ message: "If this email exists, a reset link will be sent." });

  const user = usersFound[0];

  const resetToken = crypto.randomBytes(32).toString("hex");
  const hashed = crypto.createHash("sha256").update(resetToken).digest("hex");
  const expiry = new Date(Date.now() + (parseInt(process.env.RESET_TOKEN_EXPIRY_MIN || "20", 10)) * 60 * 1000);

  await updateUser(user.id, { forgot_password_token: hashed, forgot_password_expiry: expiry });

  const resetUrl = `http://yourfrontend/reset-password/${resetToken}`;
  await sendMail(user.email, "Password reset", `Reset password: ${resetUrl}`);

  return c.json({ message: "If this email exists, a reset link will be sent." });
};

export const resetPassword = async (c: any) => {
  const { token } = c.req.param();
  const { password } = await c.req.json();
  if (!password || password.length < 8) return c.json({ error: "Password must be at least 8 characters" }, 400);

  const hashed = crypto.createHash("sha256").update(token).digest("hex");
  const usersFound = await findByForgotToken(hashed);
  if (!usersFound.length) return c.json({ error: "Invalid or expired token" }, 400);

  const user = usersFound[0];
  if (user.forgot_password_expiry && user.forgot_password_expiry < new Date()) {
    return c.json({ error: "Token expired" }, 400);
  }

  const newHashed = await hashPassword(password);
  await updateUser(user.id, { password: newHashed, forgot_password_token: null, forgot_password_expiry: null });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  return c.json({ user, accessToken, refreshToken });
};
