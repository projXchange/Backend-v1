import { updateUser, findById, softDeleteUser, findAllUsers } from "../repository/users.repository";

export const updateUserStatus = async (c: any) => {
  try {
    const { id } = c.req.param();
    const { verification_status, email_verified } = await c.req.json();

    if (!id) {
      return c.json({ error: "User ID is required" }, 400);
    }

    const updateData: any = {};
    
    if (verification_status !== undefined) {
      if (!["pending", "verified", "rejected"].includes(verification_status)) {
        return c.json({ error: "Invalid verification_status" }, 400);
      }
      updateData.verification_status = verification_status;
    }
    
    if (email_verified !== undefined) {
      if (typeof email_verified !== "boolean") {
        return c.json({ error: "email_verified must be boolean" }, 400);
      }
      updateData.email_verified = email_verified;
    }

    if (Object.keys(updateData).length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }

    const [updatedUser] = await updateUser(id, updateData);
    const { password: _, ...userResponse } = updatedUser;
    
    return c.json({ 
      message: "User updated successfully", 
      user: userResponse 
    });
  } catch (error: any) {
    console.error("Update user status error:", error);
    return c.json({ 
      error: error.message || "Failed to update user" 
    }, 500);
  }
};

export const deleteUser = async (c: any) => {
  try {
    const { id } = c.req.param();

    if (!id) {
      return c.json({ error: "User ID is required" }, 400);
    }

    await softDeleteUser(id);
    
    return c.json({ 
      message: "User deleted successfully" 
    });
  } catch (error: any) {
    console.error("Delete user error:", error);
    return c.json({ 
      error: error.message || "Failed to delete user" 
    }, 500);
  }
};

export const getAllUsers = async (c: any) => {
  try {
    const { include_deleted } = c.req.query();
    const includeDeleted = include_deleted === "true";
    
    const users = await findAllUsers(includeDeleted);
    
    // Remove passwords from response
    const usersResponse = users.map(user => {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    return c.json({ 
      users: usersResponse,
      total: usersResponse.length 
    });
  } catch (error: any) {
    console.error("Get all users error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch users" 
    }, 500);
  }
};

export const getUserById = async (c: any) => {
  try {
    const { id } = c.req.param();

    if (!id) {
      return c.json({ error: "User ID is required" }, 400);
    }

    const userResult = await findById(id);
    const user = userResult[0];
    
    const { password: _, ...userResponse } = user;
    
    return c.json({ user: userResponse });
  } catch (error: any) {
    console.error("Get user by ID error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch user" 
    }, 500);
  }
};
