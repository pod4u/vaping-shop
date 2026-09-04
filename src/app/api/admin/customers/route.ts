import { NextRequest, NextResponse } from "next/server";
import { getAllCustomers } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const customers = await getAllCustomers();

    const transformedCustomers = customers.map((customer: any) => ({
      id: customer.id,
      full_name: customer.full_name,
      phone: customer.phone,
      line_id: customer.line_id,
      email: customer.email,
      address: customer.address,
      district: customer.district,
      sub_district: customer.sub_district,
      province: customer.province,
      postal_code: customer.postal_code,
      total_orders: customer.total_orders || 0,
      total_spent: customer.total_spent || 0,
      last_order_date: customer.last_order_date,
      is_active: customer.is_active,
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
