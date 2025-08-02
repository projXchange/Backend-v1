import bcrypt from "bcryptjs";

export const hashPassword = async (password: string) => {
    try {
        return await bcrypt.hash(password, 10);
    } catch (error) {
        console.error("Error hashing password:", error);
        throw new Error("Error hashing password");
    }
};
export const comparePassword = async (plain: string, hashed: string) => {
    try {
        return await bcrypt.compare(plain, hashed);
    } catch (error) {
        console.error("Error comparing password:", error);
        throw new Error("Error comparing password");
    }
};
