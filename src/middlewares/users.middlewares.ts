import { verifyToken } from "../utils/jwt.util";
import { findById } from "../repository/users.repository";

export const isLoggedIn = async (c: any, next: any) => {
  const auth = c.req.header("Authorization");
  if (!auth) return c.json({ error: "Authorization header missing" }, 401);

  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return c.json({ error: "Malformed Authorization header" }, 401);

  try {
    const decoded = verifyToken(token);
    const userId = (decoded as any).id;
    
    // Get full user data including role
    const userResult = await findById(userId);
    const user = userResult[0];
    
    if (user.status !== "active") {
      return c.json({ error: "Account is not active" }, 401);
    }

    c.set("user", user);
    c.set("userId", userId);
    return next();
  } catch (error: any) {
    return c.json({ error: error.message || "Token invalid" }, 401);
  }
};

export const requireRole = (roles: string[]) => {
  return async (c: any, next: any) => {
    const user = c.get("user");
    
    if (!user) {
      return c.json({ error: "Authentication required" }, 401);
    }

    if (!roles.includes(user.user_type)) {
      return c.json({ 
        error: "Insufficient permissions", 
        required_roles: roles,
        user_role: user.user_type 
      }, 403);
    }

    return next();
  };
};

export const requireAdmin = requireRole(["admin"]);
export const requireManager = requireRole(["admin", "manager"]);
export const requireSeller = requireRole(["seller", "admin", "manager"]);
