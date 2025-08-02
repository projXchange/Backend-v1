import { verifyToken } from "../utils/jwt.util";


export const isLoggedIn = async (c: any, next: any) => {
  const auth = c.req.header("Authorization");
  const token = auth?.replace("Bearer ", "");
  if (!token) return c.json({ error: "Unauthorized" }, 401);

  try {
    const decoded = verifyToken(token);
    c.set("user", (decoded as any).id);
    return next();
  } catch {
    return c.json({ error: "Token expired or invalid" }, 401);
  }
};
