import { verifyToken } from "../utils/jwt.util";

export const isLoggedIn = async (c: any, next: any) => {
  const auth = c.req.header("Authorization");
  if (!auth) return c.json({ error: "Authorization header missing" }, 401);

  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return c.json({ error: "Malformed Authorization header" }, 401);

  try {
    const decoded = verifyToken(token);
    c.set("user", (decoded as any).id);
    return next();
  } catch (error: any) {
    return c.json({ error: error.message || "Token invalid" }, 401);
  }
};
