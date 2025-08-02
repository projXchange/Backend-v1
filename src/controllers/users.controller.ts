
import crypto from "crypto";
import { createUser, findByEmail, findByForgotToken, updateUser } from "../repository/users.repository";
import { comparePassword, hashPassword } from "../utils/password.util";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.util";
import { sendMail } from "../utils/email.utils";

export const signup = async (c: any) => {
  const { email, password, username, full_name } = await c.req.json();
  if (!(email && password && username)) return c.json({ error: "Missing fields" }, 400);
  if ((await findByEmail(email)).length) return c.json({ error: "Email exists" }, 400);

  const hashed = await hashPassword(password);
  const [newUser] = await createUser({ email, password: hashed, username, full_name });
  const accessToken = generateAccessToken(newUser.id);
  const refreshToken = generateRefreshToken(newUser.id);

  return c.json({ user: newUser, accessToken, refreshToken });
};

export const signin = async (c: any) => {
  const { email, password } = await c.req.json();
  const usersFound = await findByEmail(email);
  if (!usersFound.length) return c.json({ error: "Invalid credentials" }, 400);
  const user = usersFound[0];
  if (!(await comparePassword(password, user.password))) return c.json({ error: "Invalid credentials" }, 400);
  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  return c.json({ user, accessToken, refreshToken });
};

export const logout = async (c: any) => {
  c.header("Set-Cookie", [
    "accessToken=; HttpOnly; Path=/; Max-Age=0",
    "refreshToken=; HttpOnly; Path=/; Max-Age=0",
  ]);
  return c.json({ message: "Logout successful" });
};

export const forgotPassword = async (c: any) => {
  const { email } = await c.req.json();
  const usersFound = await findByEmail(email);
  if (!usersFound.length) return c.json({ error: "Email not registered" }, 400);
  const user = usersFound[0];

  const resetToken = crypto.randomBytes(20).toString("hex");
  const hashed = crypto.createHash("sha256").update(resetToken).digest("hex");
  const expiry = new Date( Date.now() + (parseInt(process.env.RESET_TOKEN_EXPIRY_MIN || "20", 10)) * 60 * 1000 );

  await updateUser(user.id, { forgot_password_token: hashed, forgot_password_expiry: expiry });

  // Email with reset link (frontend URL)
  const resetUrl = `http://yourfrontend/reset-password/${resetToken}`;
  await sendMail(user.email, "Password reset", `Reset password: ${resetUrl}`);
  return c.json({ message: "Reset email sent" });
};

export const resetPassword = async (c: any) => {
  const { token } = c.req.param();
  const { password } = await c.req.json();
  const hashed = crypto.createHash("sha256").update(token).digest("hex");
  const usersFound = await findByForgotToken(hashed);
  if (!usersFound.length) return c.json({ error: "Invalid/expired token" }, 400);
  const user = usersFound[0];
  if (user.forgot_password_expiry && user.forgot_password_expiry < new Date()) return c.json({ error: "Token expired" }, 400);

  const newHashed = await hashPassword(password);
  await updateUser(user.id, { password: newHashed, forgot_password_token: null, forgot_password_expiry: null });

  const accessToken = generateAccessToken(user.id);
  const refreshToken = generateRefreshToken(user.id);
  return c.json({ user, accessToken, refreshToken });
};
