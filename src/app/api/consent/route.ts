import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customer_id, consent_type, accepted, ip_address, user_agent } = body;

    // Validate
    if (!customer_id || !consent_type) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = getServerSupabase();

    // Insert consent log
    const { data, error } = await supabase
      .from("consent_logs")
      .insert({
        customer_id,
        consent_type,
        accepted: accepted ?? true,
        ip_address: ip_address || null,
        user_agent: user_agent || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to save consent log:", error);
      return NextResponse.json(
        { success: false, error: "Failed to save consent log" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      log_id: data.id,
    });
  } catch (error) {
    console.error("Consent log error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customer_id");

    const supabase = getServerSupabase();

    let query = supabase
      .from("consent_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (customerId) {
      query = query.eq("customer_id", customerId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      consent_logs: data,
    });
  } catch (error) {
    console.error("Failed to fetch consent logs:", error);
    return NextResponse.json(
      { consent_logs: [] },
      { status: 500 }
    );
  }
}