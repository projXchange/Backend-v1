import crypto from "crypto";
import { createUser, findByEmail, findByForgotToken, updateUser, checkEmailExists, findById, findAllUsers } from "../repository/users.repository";
import { comparePassword, hashPassword } from "../utils/password.util";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt.util";
import { sendPasswordResetEmail, sendPasswordResetConfirmationEmail } from "../utils/email.utils";
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

    const accessToken = await generateAccessToken(newUser.id);
    const refreshToken = await generateRefreshToken(newUser.id);

    // Remove password from response
    const { password: _, ...userResponse } = newUser;

    // Auth success logged in middleware

    return c.json({
      user: userResponse,
      accessToken,
      refreshToken
    });

  } catch (error: any) {
    c.logger.error('User signup failed', error, {
      email: c.req.json?.()?.email,
      action: 'signup'
    });
    return c.json({
      error: error.message || "Failed to create account"
    }, 500);
  }
};

export const signin = async (c: any) => {
  try {
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
    const accessToken = await generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);

    // Auth success logged in middleware

    return c.json({ user: userResponse, accessToken, refreshToken });
  } catch (error: any) {
    c.logger.error('User signin failed', error, {
      email: c.req.json?.()?.email,
      action: 'signin'
    });
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
    if (!email) return c.json({ error: "Email required" }, 400);

    // Could rate-limit on IP/email here
    const usersFound = await findByEmail(email);
    if (!usersFound.length) {
      c.logger.security('Password reset attempted for non-existent email', {
        email,
        action: 'forgot_password',
        result: 'user_not_found'
      });
      return c.json({ message: "If this email exists, a reset link will be sent." });
    }

    const user = usersFound[0];

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashed = crypto.createHash("sha256").update(resetToken).digest("hex");
    const expiry = new Date(Date.now() + (parseInt(process.env.RESET_TOKEN_EXPIRY_MIN || "60", 10)) * 60 * 1000);

    await updateUser(user.id, { forgot_password_token: hashed, forgot_password_expiry: expiry });

    // Send password reset email via Brevo
    try {
      await sendPasswordResetEmail(user.email, resetToken);
      c.logger.info('Password reset email sent successfully', {
        userId: user.id,
        email: user.email,
        action: 'forgot_password',
        result: 'email_sent'
      });
    } catch (emailError: any) {
      c.logger.error('Failed to send password reset email', emailError, {
        userId: user.id,
        email: user.email,
        action: 'forgot_password',
        result: 'email_failed'
      });
      // Don't expose email sending failure to user for security
    }

    // Auth action logged in middleware

    return c.json({ message: "If this email exists, a reset link will be sent." });
  } catch (error: any) {
    c.logger.error('Password reset request failed', error, {
      action: 'forgot_password'
    });
    return c.json({ error: error.message || "Failed to process password reset" }, 500);
  }
};

export const resetPassword = async (c: any) => {
  try {
    const { token } = c.req.param();
    const { password } = await c.req.json();
    if (!password || password.length < 8) return c.json({ error: "Password must be at least 8 characters" }, 400);

    const hashed = crypto.createHash("sha256").update(token).digest("hex");
    const usersFound = await findByForgotToken(hashed);
    if (!usersFound.length) {
      c.logger.security('Invalid password reset token used', {
        token: token.substring(0, 8) + '...',
        action: 'reset_password',
        result: 'invalid_token'
      });
      return c.json({ error: "Invalid or expired token" }, 400);
    }

    const user = usersFound[0];
    if (user.forgot_password_expiry && user.forgot_password_expiry < new Date()) {
      c.logger.security('Expired password reset token used', {
        userId: user.id,
        email: user.email,
        action: 'reset_password',
        result: 'expired_token',
        expiry: user.forgot_password_expiry
      });
      return c.json({ error: "Token expired" }, 400);
    }

    const newHashed = await hashPassword(password);
    await updateUser(user.id, { password: newHashed, forgot_password_token: null, forgot_password_expiry: null });

    // Send password reset confirmation email
    try {
      await sendPasswordResetConfirmationEmail(user.email, user.full_name || undefined);
      c.logger.info('Password reset confirmation email sent successfully', {
        userId: user.id,
        email: user.email,
        action: 'reset_password',
        result: 'confirmation_email_sent'
      });
    } catch (emailError: any) {
      c.logger.error('Failed to send password reset confirmation email', emailError, {
        userId: user.id,
        email: user.email,
        action: 'reset_password',
        result: 'confirmation_email_failed'
      });
      // Don't fail the password reset if email fails
    }

    const accessToken = await generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);

    // Auth action logged in middleware

    return c.json({ user, accessToken, refreshToken });
  } catch (error: any) {
    c.logger.error('Password reset failed', error, {
      action: 'reset_password'
    });
    return c.json({ error: error.message || "Failed to reset password" }, 500);
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
    c.logger.error("Failed to create user profile", error, {
      userId: c.get("userId"),
      action: 'create_profile'
    });
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
    const { id } = c.req.param();
    c.logger.error("Failed to update user profile", error, {
      userId: c.get("userId"),
      targetUserId: id,
      action: 'update_profile'
    });
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
    const { id } = c.req.param();
    c.logger.error("Failed to fetch user profile", error, {
      targetUserId: id,
      action: 'get_user_profile'
    });
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
    const { include_deleted } = c.req.query();
    const includeDeleted = include_deleted === "true";
    c.logger.error("Failed to fetch all user profiles", error, {
      action: 'get_all_profiles',
      includeDeleted
    });
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
    const { id } = c.req.param();
    c.logger.error("Failed to delete user profile", error, {
      userId: c.get("userId"),
      targetUserId: id,
      action: 'delete_profile'
    });
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
    c.logger.error("Failed to fetch user profile", error, {
      userId: c.get("userId"),
      action: 'get_my_profile'
    });
    return c.json({
      error: error.message || "Failed to fetch profile"
    }, 500);
  }
};
