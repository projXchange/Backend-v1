
import { eq } from "drizzle-orm";
import { users } from "../models/schema";
import db from "./db";

export const findByEmail = async (email: string) =>
  db.select().from(users).where(eq(users.email, email));

export const findById = async (id: string) =>
  db.select().from(users).where(eq(users.id, id));

export const createUser = (userData: any) =>
  db.insert(users).values(userData).returning().execute();

export const updateUser = (id: string, updateObj: any) =>
  db.update(users).set(updateObj).where(eq(users.id, id)).returning().execute();

export const findByForgotToken = async (token: string) => 
  db.select().from(users).where(eq(users.forgot_password_token, token));
