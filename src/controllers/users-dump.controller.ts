import { 
  createUsersDump, 
  updateUsersDump, 
  findById, 
  findAll, 
  softDeleteUsersDump 
} from "../repository/users-dump.repository";
import { uploadImage, deleteImage } from "../utils/cloudinary.util";

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
      id: userId,
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

    const [newProfile] = await createUsersDump(profileData);
    
    return c.json({ 
      message: "User profile created successfully", 
      profile: newProfile 
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

    // Get current profile to handle avatar replacement
    let currentProfile = null;
    try {
      const result = await findById(id);
      currentProfile = result[0];
    } catch (error) {
      return c.json({ error: "Profile not found" }, 404);
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
      if (currentProfile.avatar) {
        await deleteImage(currentProfile.avatar);
      }
      
      // Upload new avatar
      updateData.avatar = await uploadImage(avatar, `users/${id}`);
    }

    if (Object.keys(updateData).length === 0) {
      return c.json({ error: "No valid fields to update" }, 400);
    }

    const [updatedProfile] = await updateUsersDump(id, updateData);
    
    return c.json({ 
      message: "User profile updated successfully", 
      profile: updatedProfile 
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
    const profile = result[0];
    
    return c.json({ profile });
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
    
    const profiles = await findAll(includeDeleted);
    
    return c.json({ 
      profiles,
      total: profiles.length 
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

    // Get current profile to delete avatar
    try {
      const result = await findById(id);
      const currentProfile = result[0];
      
      // Delete avatar from cloudinary
      if (currentProfile.avatar) {
        await deleteImage(currentProfile.avatar);
      }
    } catch (error) {
      // Profile doesn't exist, continue with deletion attempt
    }

    await softDeleteUsersDump(id);
    
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
    const profile = result[0];
    
    return c.json({ profile });
  } catch (error: any) {
    console.error("Get my profile error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch profile" 
    }, 500);
  }
};
