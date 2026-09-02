import { NextRequest, NextResponse } from "next/server";

// Mock in-memory storage (จะเปลี่ยนเป็น Supabase ทีหลัง)
const customers: any[] = [];

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

    // Check duplicate phone
    const existingCustomer = customers.find((c) => c.phone === phone);
    if (existingCustomer) {
      return NextResponse.json(
        { success: false, error: "เบอร์โทรนี้เคยสมัครแล้ว" },
        { status: 400 }
      );
    }

    // Create customer
    const newCustomer = {
      id: customers.length + 1,
      full_name,
      phone,
      line_id: line_id || null,
      email: email || null,
      address,
      district: district || null,
      sub_district,
      province,
      postal_code: postal_code || null,
      total_orders: 0,
      total_spent: 0,
      created_at: new Date().toISOString(),
    };

    customers.push(newCustomer);

    // TODO: Save to Supabase
    // const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    // const { data, error } = await supabase
    //   .from('customers')
    //   .insert([newCustomer])
    //   .select()
    //   .single();

    console.log("✅ Customer registered:", newCustomer);
    console.log("📊 Total customers:", customers.length);

    return NextResponse.json({
      success: true,
      customer_id: newCustomer.id,
      message: "สมัครสมาชิกสำเร็จ!",
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    return NextResponse.json(
      { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่" },
      { status: 500 }
    );
  }
}