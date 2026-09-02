import { NextRequest, NextResponse } from "next/server";

// Mock in-memory storage (shared with register route)
// TODO: Replace with Supabase
declare global {
  var customersStorage: any[];
}

// Initialize global storage if not exists
if (!global.customersStorage) {
  global.customersStorage = [];
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Fetch from Supabase
    // const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    // const { data, error } = await supabase
    //   .from('customers')
    //   .select('*')
    //   .order('created_at', { ascending: false });

    const customers = global.customersStorage || [];

    return NextResponse.json({
      customers,
    });
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    return NextResponse.json(
      { customers: [] },
      { status: 500 }
    );
  }
}