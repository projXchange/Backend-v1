// controllers/transactions.controller.ts
import { 
  findById,
  findByTransactionId, 
  findByUser, 
  findBySeller,
  createTransaction, 
  updateTransaction,
  getTransactionStats,
  getRecentTransactions
} from "../repository/transactions.repository";
import { addBuyer } from "../repository/projects.repository";

export const getUserTransactions = async (c: any) => {
  try {
    const userId = c.get("userId");
    
    const transactions = await findByUser(userId);
    
    return c.json({ 
      transactions,
      total: transactions.length 
    });
  } catch (error: any) {
    console.error("Get user transactions error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch transactions" 
    }, 500);
  }
};

export const getSellerTransactions = async (c: any) => {
  try {
    const userId = c.get("userId");
    
    const transactions = await findBySeller(userId);
    
    return c.json({ 
      transactions,
      total: transactions.length 
    });
  } catch (error: any) {
    console.error("Get seller transactions error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch seller transactions" 
    }, 500);
  }
};

export const getTransactionById = async (c: any) => {
  try {
    const { id } = c.req.param();
    const userId = c.get("userId");
    const user = c.get("user");

    if (!id) {
      return c.json({ error: "Transaction ID is required" }, 400);
    }

    let transaction;
    try {
      const result = await findById(id);
      transaction = result[0];
    } catch (error) {
      return c.json({ error: "Transaction not found" }, 404);
    }

    // Check if user has permission to view this transaction
    const canView = transaction.user_id === userId || 
                   transaction.seller_id === userId || 
                   ["admin", "manager"].includes(user.user_type);

    if (!canView) {
      return c.json({ error: "Unauthorized to view this transaction" }, 403);
    }

    return c.json({ 
      transaction
    });
  } catch (error: any) {
    console.error("Get transaction by ID error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch transaction" 
    }, 500);
  }
};

export const createTransactionHandler = async (c: any) => {
  try {
    const { 
      transaction_id, 
      project_id, 
      seller_id, 
      amount, 
      currency, 
      payment_method,
      payment_gateway_response,
      metadata 
    } = await c.req.json();
    
    const userId = c.get("userId");

    if (!transaction_id || !project_id || !seller_id || !amount) {
      return c.json({ error: "Missing required fields" }, 400);
    }

    // Calculate commission (e.g., 10% platform fee)
    const commissionRate = 0.10;
    const commissionAmount = amount * commissionRate;
    const sellerAmount = amount - commissionAmount;

    const [newTransaction] = await createTransaction({
      transaction_id,
      user_id: userId,
      project_id,
      seller_id,
      amount: amount.toString(), // Convert to string for decimal field
      currency: currency || "INR",
      payment_method,
      payment_gateway_response,
      commission_amount: commissionAmount.toString(), // Convert to string for decimal field
      seller_amount: sellerAmount.toString(), // Convert to string for decimal field
      metadata
    });
    
    return c.json({ 
      message: "Transaction created successfully",
      transaction: newTransaction
    });
  } catch (error: any) {
    console.error("Create transaction error:", error);
    const status = error.message.includes("already exists") ? 409 : 500;
    return c.json({ 
      error: error.message || "Failed to create transaction" 
    }, status);
  }
};

export const updateTransactionStatus = async (c: any) => {
  try {
    const { id } = c.req.param();
    const { status, payment_gateway_response, metadata } = await c.req.json();
    const user = c.get("user");

    if (!id) {
      return c.json({ error: "Transaction ID is required" }, 400);
    }

    // Only admin/manager can update transaction status
    if (!["admin", "manager"].includes(user.user_type)) {
      return c.json({ error: "Unauthorized to update transaction status" }, 403);
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (payment_gateway_response) updateData.payment_gateway_response = payment_gateway_response;
    if (metadata) updateData.metadata = metadata;

    // Set processed_at timestamp when status becomes completed
    if (status === "completed") {
      updateData.processed_at = new Date();
      
      // Add buyer to project when transaction is completed
      const transaction = await findById(id);
      await addBuyer(transaction[0].project_id, transaction[0].user_id);
    }

    // Set refunded_at timestamp when status becomes refunded
    if (status === "refunded") {
      updateData.refunded_at = new Date();
    }

    const [updatedTransaction] = await updateTransaction(id, updateData);
    
    return c.json({ 
      message: "Transaction status updated successfully",
      transaction: updatedTransaction
    });
  } catch (error: any) {
    console.error("Update transaction status error:", error);
    return c.json({ 
      error: error.message || "Failed to update transaction status" 
    }, 500);
  }
};

export const getTransactionStatsHandler = async (c: any) => {
  try {
    const { seller_id, start_date, end_date } = c.req.query();
    const user = c.get("user");
    const userId = c.get("userId");

    // If seller_id is provided, check permissions
    if (seller_id) {
      const canViewSellerStats = seller_id === userId || ["admin", "manager"].includes(user.user_type);
      if (!canViewSellerStats) {
        return c.json({ error: "Unauthorized to view seller stats" }, 403);
      }
    }

    const startDate = start_date ? new Date(start_date) : undefined;
    const endDate = end_date ? new Date(end_date) : undefined;

    const stats = await getTransactionStats(seller_id, startDate, endDate);
    
    return c.json({ 
      stats,
      filters: {
        seller_id,
        start_date: startDate,
        end_date: endDate
      }
    });
  } catch (error: any) {
    console.error("Get transaction stats error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch transaction stats" 
    }, 500);
  }
};

// Admin only
export const getRecentTransactionsHandler = async (c: any) => {
  try {
    const { limit } = c.req.query();
    const limitNum = limit ? parseInt(limit) : 10;
    
    const transactions = await getRecentTransactions(limitNum);
    
    return c.json({ 
      transactions,
      total: transactions.length
    });
  } catch (error: any) {
    console.error("Get recent transactions error:", error);
    return c.json({ 
      error: error.message || "Failed to fetch recent transactions" 
    }, 500);
  }
};
