import { NextRequest, NextResponse } from "next/server";
import { registerCustomer } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate
    const { full_name, phone, line_id, email, address, district, sub_district, province, postal_code } = body;

    if (!full_name || !phone || !address || !sub_district || !province) {
      return NextResponse.json(
        { success: false, error: "กรุณากรอกข้อมูลที่จำเป็นให้ครบ" },
        { status: 400 }
      );
    }

    // Register customer in Supabase
    const customer = await registerCustomer({
      full_name,
      phone,
      line_id,
      email,
      address,
      district,
      sub_district,
      province,
      postal_code,
    });

    console.log("✅ Customer registered:", customer);

    return NextResponse.json({
      success: true,
      customer_id: customer.id,
      message: "สมัครสมาชิกสำเร็จ!",
    });
  } catch (error: any) {
    console.error("❌ Registration error:", error);

    // Handle duplicate phone
    if (error.message === "เบอร์โทรนี้เคยสมัครแล้ว") {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่" },
      { status: 500 }
    );
  }
}