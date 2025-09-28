// repository/transactions.repository.ts
import { eq, and, desc, asc, sql, gte, lte, count, sum, avg } from "drizzle-orm";
import { transactions, projects, users } from "../models/schema";
import db from "./db";

class TransactionRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransactionRepositoryError";
  }
}

class TransactionNotFoundError extends TransactionRepositoryError {
  constructor(message = "Transaction not found") {
    super(message);
    this.name = "TransactionNotFoundError";
  }
}

export interface CreateTransactionData {
  transaction_id: string;
  user_id: string;
  project_id: string;
  author_id: string;
  type?: "purchase" | "refund" | "commission";
  status?: "pending" | "processing" | "completed" | "failed" | "cancelled" | "refunded";
  amount: string; // decimal fields expect string values
  currency?: "INR" | "USD";
  payment_method?: string;
  payment_gateway_response?: any;
  commission_amount?: string; // decimal fields expect string values
  author_amount?: string; // decimal fields expect string values
  metadata?: any;
}

export interface UpdateTransactionData {
  status?: "pending" | "processing" | "completed" | "failed" | "cancelled" | "refunded";
  payment_gateway_response?: any;
  metadata?: any;
  processed_at?: Date;
  refunded_at?: Date;
}

export const findById = async (id: string) => {
  try {
    if (!id || typeof id !== "string") {
      throw new TransactionRepositoryError("Invalid transaction ID parameter");
    }

    const result = await db.select().from(transactions).where(eq(transactions.id, id));
    if (!result.length) {
      throw new TransactionNotFoundError(`Transaction with ID ${id} not found`);
    }
    return result;
  } catch (error) {
    if (error instanceof TransactionRepositoryError) throw error;
    throw new TransactionRepositoryError(`Failed to find transaction by ID: ${error}`);
  }
};

export const findByTransactionId = async (transactionId: string) => {
  try {
    if (!transactionId || typeof transactionId !== "string") {
      throw new TransactionRepositoryError("Invalid transaction ID parameter");
    }

    const result = await db.select().from(transactions).where(eq(transactions.transaction_id, transactionId));
    if (!result.length) {
      throw new TransactionNotFoundError(`Transaction with ID ${transactionId} not found`);
    }
    return result;
  } catch (error) {
    if (error instanceof TransactionRepositoryError) throw error;
    throw new TransactionRepositoryError(`Failed to find transaction by transaction ID: ${error}`);
  }
};

export const findByUser = async (userId: string) => {
  try {
    if (!userId || typeof userId !== "string") {
      throw new TransactionRepositoryError("Invalid user ID parameter");
    }

    return await db.select({
      id: transactions.id,
      transaction_id: transactions.transaction_id,
      type: transactions.type,
      status: transactions.status,
      amount: transactions.amount,
      currency: transactions.currency,
      payment_method: transactions.payment_method,
      processed_at: transactions.processed_at,
      created_at: transactions.created_at,
      project: {
        id: projects.id,
        title: projects.title,
        // Remove thumbnail if it doesn't exist in schema, or add it to your schema
        // thumbnail: projects.thumbnail  
      }
    })
    .from(transactions)
    .innerJoin(projects, eq(transactions.project_id, projects.id))
    .where(eq(transactions.user_id, userId))
    .orderBy(desc(transactions.created_at));
  } catch (error) {
    throw new TransactionRepositoryError(`Failed to find user transactions: ${error}`);
  }
};

export const findByAuthor = async (authorId: string) => {
  try {
    if (!authorId || typeof authorId !== "string") {
      throw new TransactionRepositoryError("Invalid author ID parameter");
    }

    return await db.select({
      id: transactions.id,
      transaction_id: transactions.transaction_id,
      type: transactions.type,
      status: transactions.status,
      amount: transactions.amount,
      currency: transactions.currency,
      commission_amount: transactions.commission_amount,
      author_amount: transactions.author_amount,
      processed_at: transactions.processed_at,
      created_at: transactions.created_at,
      project: {
        id: projects.id,
        title: projects.title
      },
      buyer: {
        id: users.id,
        full_name: users.full_name,
        email: users.email
      }
    })
    .from(transactions)
    .innerJoin(projects, eq(transactions.project_id, projects.id))
    .innerJoin(users, eq(transactions.user_id, users.id))
    .where(eq(transactions.author_id, authorId))
    .orderBy(desc(transactions.created_at));
  } catch (error) {
    throw new TransactionRepositoryError(`Failed to find author transactions: ${error}`);
  }
};

export const createTransaction = async (transactionData: CreateTransactionData) => {
  try {
    if (!transactionData.transaction_id || !transactionData.user_id || 
        !transactionData.project_id || !transactionData.author_id || 
        !transactionData.amount) {
      throw new TransactionRepositoryError("Missing required fields");
    }

    // Create the insert data object with proper typing - only include defined values
    const insertData: any = {
      transaction_id: transactionData.transaction_id,
      user_id: transactionData.user_id,
      project_id: transactionData.project_id,
      author_id: transactionData.author_id,
      amount: transactionData.amount,
      type: transactionData.type || "purchase",
      status: transactionData.status || "pending",
      currency: transactionData.currency || "INR",
      commission_amount: transactionData.commission_amount || 0,
      author_amount: transactionData.author_amount || transactionData.amount,
    };

    // Only add optional fields if they are defined
    if (transactionData.payment_method !== undefined) {
      insertData.payment_method = transactionData.payment_method;
    }
    if (transactionData.payment_gateway_response !== undefined) {
      insertData.payment_gateway_response = transactionData.payment_gateway_response;
    }
    if (transactionData.metadata !== undefined) {
      insertData.metadata = transactionData.metadata;
    }

    const result = await db.insert(transactions).values(insertData).returning();

    if (!result.length) {
      throw new TransactionRepositoryError("Failed to create transaction");
    }
    return result;
  } catch (error: any) {
    if (error.code === '23505') {
      throw new TransactionRepositoryError("Transaction ID already exists");
    }
    if (error instanceof TransactionRepositoryError) throw error;
    throw new TransactionRepositoryError(`Failed to create transaction: ${error.message}`);
  }
};

export const updateTransaction = async (id: string, updateData: UpdateTransactionData) => {
  try {
    if (!id || typeof id !== "string") {
      throw new TransactionRepositoryError("Invalid transaction ID parameter");
    }
    if (!updateData || Object.keys(updateData).length === 0) {
      throw new TransactionRepositoryError("No update data provided");
    }

    const result = await db.update(transactions)
      .set(updateData)
      .where(eq(transactions.id, id))
      .returning();

    if (!result.length) {
      throw new TransactionNotFoundError(`Transaction with ID ${id} not found or no changes made`);
    }
    return result;
  } catch (error) {
    if (error instanceof TransactionRepositoryError) throw error;
    throw new TransactionRepositoryError(`Failed to update transaction: ${error}`);
  }
};

export const getTransactionStats = async (authorId?: string, startDate?: Date, endDate?: Date) => {
  try {
    const whereConditions = [];
    
    if (authorId) {
      whereConditions.push(eq(transactions.author_id, authorId));
    }
    
    if (startDate) {
      whereConditions.push(gte(transactions.created_at, startDate));
    }
    
    if (endDate) {
      whereConditions.push(lte(transactions.created_at, endDate));
    }

    // Only include completed transactions
    whereConditions.push(eq(transactions.status, "completed"));

    // Build the base query
    let baseQuery = db.select({
      total_transactions: count().as('total_transactions'),
      total_revenue: sum(transactions.amount).as('total_revenue'),
      total_commission: sum(transactions.commission_amount).as('total_commission'),
      total_author_earnings: sum(transactions.author_amount).as('total_author_earnings'),
      avg_transaction_amount: avg(transactions.amount).as('avg_transaction_amount'),
      // For currency breakdown, you might want to handle this differently
      // depending on your database. This is a simplified version:
      currency_breakdown: sql<any>`json_object_agg(${transactions.currency}, COUNT(*))`.as('currency_breakdown'),
    }).from(transactions);

    // Apply where conditions if any exist
    const finalQuery = whereConditions.length > 0 
      ? baseQuery.where(and(...whereConditions))
      : baseQuery;

    const result = await finalQuery;
    return result[0];
  } catch (error) {
    throw new TransactionRepositoryError(`Failed to get transaction stats: ${error}`);
  }
};

export const getRecentTransactions = async (limit = 10) => {
  try {
    return await db.select({
      id: transactions.id,
      transaction_id: transactions.transaction_id,
      type: transactions.type,
      status: transactions.status,
      amount: transactions.amount,
      currency: transactions.currency,
      created_at: transactions.created_at,
      buyer: {
        id: users.id,
        full_name: users.full_name
      },
      project: {
        id: projects.id,
        title: projects.title
      }
    })
    .from(transactions)
    .innerJoin(users, eq(transactions.user_id, users.id))
    .innerJoin(projects, eq(transactions.project_id, projects.id))
    .orderBy(desc(transactions.created_at))
    .limit(limit);
  } catch (error) {
    throw new TransactionRepositoryError(`Failed to get recent transactions: ${error}`);
  }
};

export { TransactionRepositoryError, TransactionNotFoundError };