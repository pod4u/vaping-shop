import { NextRequest, NextResponse } from "next/server";
import { getAllCustomers } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const customers = await getAllCustomers();

    // Transform data for frontend
    const transformedCustomers = customers.map((customer: any) => ({
      id: customer.id,
      full_name: customer.name,
      phone: customer.phone,
      line_id: customer.line_user_id,
      email: customer.email,
      total_orders: customer.total_orders || 0,
      total_spent: customer.total_spent || 0,
      created_at: customer.created_at,
    }));

    return NextResponse.json({
      customers: transformedCustomers,
    });
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    return NextResponse.json(
      { customers: [] },
      { status: 500 }
    );
  }
}