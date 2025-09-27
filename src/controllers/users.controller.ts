import crypto from "crypto";
import { createUser, findByEmail, findByForgotToken, updateUser, checkEmailExists, findById, findAllUsers } from "../repository/users.repository";
import { comparePassword, hashPassword } from "../utils/password.util";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.util";
import { sendPasswordResetEmail, sendPasswordResetConfirmation, sendWelcomeEmail } from "../utils/email.service";
import { uploadImage, deleteImage } from "../utils/cloudinary.util";

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
    
    // Send welcome email (optional - don't fail if it doesn't work)
    try {
      await sendWelcomeEmail(
        newUser.email,
        newUser.full_name || newUser.email.split('@')[0]
      );
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the signup if email fails
    }
    
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
  try {
    const { email } = await c.req.json();
    if (!email) {
      return c.json({ error: "Email is required" }, 400);
    }

    // Validate email format
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return c.json({ error: "Invalid email format" }, 400);
    }

    // Find user by email
    const usersFound = await findByEmail(email);
    if (!usersFound.length) {
      // Return success message even if email doesn't exist (security best practice)
      return c.json({ 
        message: "If an account with that email exists, we've sent a password reset link to it." 
      });
    }

    const user = usersFound[0];

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    
    // Set expiry (default 1 hour)
    const expiryMinutes = parseInt(process.env.RESET_TOKEN_EXPIRY_MIN || "60", 10);
    const expiry = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Save hashed token to database
    await updateUser(user.id, { 
      forgot_password_token: hashedToken, 
      forgot_password_expiry: expiry 
    });

    // Send password reset email
    const emailSent = await sendPasswordResetEmail(
      user.email, 
      resetToken, // Send unhashed token to user
      user.full_name || user.email.split('@')[0]
    );

    if (!emailSent) {
      console.error('Failed to send password reset email to:', user.email);
      // Still return success for security reasons
    }

    return c.json({ 
      message: "If an account with that email exists, we've sent a password reset link to it." 
    });
  } catch (error: any) {
    console.error("Forgot password error:", error);
    return c.json({ 
      error: "An error occurred while processing your request. Please try again." 
    }, 500);
  }
};

export const resetPassword = async (c: any) => {
  try {
    const { token } = c.req.param();
    const { password } = await c.req.json();
    
    // Validate required fields
    if (!token) {
      return c.json({ error: "Reset token is required" }, 400);
    }
    
    if (!password) {
      return c.json({ error: "New password is required" }, 400);
    }
    
    // Validate password strength
    if (password.length < 8) {
      return c.json({ error: "Password must be at least 8 characters long" }, 400);
    }

    // Hash the token to match stored version
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    
    // Find user by token
    const usersFound = await findByForgotToken(hashedToken);
    if (!usersFound.length) {
      return c.json({ error: "Invalid or expired reset token" }, 400);
    }

    const user = usersFound[0];
    
    // Check if token has expired
    if (user.forgot_password_expiry && user.forgot_password_expiry < new Date()) {
      return c.json({ error: "Reset token has expired. Please request a new password reset." }, 400);
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);
    
    // Update user with new password and clear reset token
    await updateUser(user.id, { 
      password: hashedPassword, 
      forgot_password_token: null, 
      forgot_password_expiry: null 
    });

    // Send confirmation email
    await sendPasswordResetConfirmation(
      user.email,
      user.full_name || user.email.split('@')[0]
    );

    // Generate new tokens for immediate login
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);
    
    // Remove password from response
    const { password: _, ...userResponse } = user;

    return c.json({ 
      message: "Password has been successfully reset",
      user: userResponse, 
      accessToken, 
      refreshToken 
    });
  } catch (error: any) {
    console.error("Reset password error:", error);
    return c.json({ 
      error: "An error occurred while resetting your password. Please try again." 
    }, 500);
  }
};

// Profile management functions
export const createUserProfile = async (c: any) => {
  try {
    const userId = c.get("userId");
    const { 
      rating, 
      total_sales, 
      total_purchases, 
      experience_level, 
      avatar, 
      bio, 
      location, 
      website, 
      social_links, 
      skills 
    } = await c.req.json();

    let avatarUrl: string | undefined = undefined;
    if (avatar) {
      // Assuming avatar is base64 encoded
      avatarUrl = await uploadImage(avatar, `users/${userId}`);
    }

    const profileData = {
      rating: rating || 0,
      total_sales: total_sales || 0,
      total_purchases: total_purchases || 0,
      experience_level: experience_level || "beginner",
      avatar: avatarUrl,
      bio: bio || "",
      location: location || "",
      website: website || "",
      social_links: social_links || {},
      skills: skills || []
    };

    const [updatedUser] = await updateUser(userId, profileData);
    
    return c.json({ 
      message: "User profile created successfully", 
      profile: updatedUser 
    });
  } catch (error: any) {
    console.error("Create user profile error:", error);
    return c.json({ 
      error: error.message || "Failed to create user profile" 
    }, 500);
  }
};

export const updateUserProfile = async (c: any) => {
  try {
    const { id } = c.req.param();
    const userId = c.get("userId");
    const userRole = c.get("user").user_type;

    // Check if user is updating their own profile or is admin/manager
    if (id !== userId && !["admin", "manager"].includes(userRole)) {
      return c.json({ error: "Unauthorized to update this profile" }, 403);
    }

    const { 
      rating, 
      total_sales, 
      total_purchases, 
      experience_level, 
      avatar, 
      bio, 
      location, 
      website, 
      social_links, 
      skills 
    } = await c.req.json();

    // Get current user to handle avatar replacement
    let currentUser = null;
    try {
      const result = await findById(id);
      currentUser = result[0];
    } catch (error) {
      return c.json({ error: "User not found" }, 404);
    }

    const updateData: any = {};
    
    if (rating !== undefined) updateData.rating = rating;
    if (total_sales !== undefined) updateData.total_sales = total_sales;
    if (total_purchases !== undefined) updateData.total_purchases = total_purchases;
    if (experience_level !== undefined) updateData.experience_level = experience_level;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website;
    if (social_links !== undefined) updateData.social_links = social_links;
    if (skills !== undefined) updateData.skills = skills;

    // Handle avatar update
    if (avatar) {
      // Delete old avatar if exists
      if (currentUser.avatar) {
        await deleteImage(currentUser.avatar);
      }
      
      // Upload new avatar
      updateData.avatar = await uploadImage(avatar, `users/${id}`);
    }

    if (Object.keys(updateData).length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }

    const [updatedUser] = await updateUser(id, updateData);
    
    return c.json({ 
      message: "User profile updated successfully", 
      profile: updatedUser 
    });
  } catch (error: any) {
    console.error("Update user profile error:", error);
    return c.json({ 
      error: error.message || "Failed to update user profile" 
    }, 500);
  }
};

export const getUserProfile = async (c: any) => {
  try {
    const { id } = c.req.param();

    const result = await findById(id);
    const user = result[0];
    
    return c.json({ profile: user });
  } catch (error: any) {
    console.error("Get user profile error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch user profile" 
    }, 500);
  }
};

export const getAllUserProfiles = async (c: any) => {
  try {
    const { include_deleted } = c.req.query();
    const includeDeleted = include_deleted === "true";
    
    const users = await findAllUsers(includeDeleted);
    
    return c.json({ 
      profiles: users,
      total: users.length 
    });
  } catch (error: any) {
    console.error("Get all user profiles error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch user profiles" 
    }, 500);
  }
};

export const deleteUserProfile = async (c: any) => {
  try {
    const { id } = c.req.param();
    const userId = c.get("userId");
    const userRole = c.get("user").user_type;

    // Check if user is deleting their own profile or is admin/manager
    if (id !== userId && !["admin", "manager"].includes(userRole)) {
      return c.json({ error: "Unauthorized to delete this profile" }, 403);
    }

    // Get current user to delete avatar
    try {
      const result = await findById(id);
      const currentUser = result[0];
      
      // Delete avatar from cloudinary
      if (currentUser.avatar) {
        await deleteImage(currentUser.avatar);
      }
    } catch (error) {
      // User doesn't exist, continue with deletion attempt
    }

    await updateUser(id, { 
      status: "deleted", 
      deleted_at: new Date() 
    });
    
    return c.json({ 
      message: "User profile deleted successfully" 
    });
  } catch (error: any) {
    console.error("Delete user profile error:", error);
    return c.json({ 
      error: error.message || "Failed to delete user profile" 
    }, 500);
  }
};

export const getMyProfile = async (c: any) => {
  try {
    const userId = c.get("userId");

    const result = await findById(userId);
    const user = result[0];
    
    return c.json({ profile: user });
  } catch (error: any) {
    console.error("Get my profile error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch profile" 
    }, 500);
  }
};
