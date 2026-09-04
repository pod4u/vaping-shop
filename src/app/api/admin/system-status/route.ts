import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  let databaseConnected = false;
  let ordersStorageConnected = false;

  try {
    const { error } = await getServerSupabase().from("brands").select("id").limit(1);
    databaseConnected = !error;
  } catch {
    databaseConnected = false;
  }

  if (databaseConnected) {
    const { error } = await getServerSupabase().from("orders").select("id").limit(1);
    ordersStorageConnected = !error;
  }

  return NextResponse.json({
    success: true,
    services: {
      admin: {
        configured: Boolean(process.env.ADMIN_PASSWORD && (process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_PASSWORD)),
      },
      database: {
        configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
        connected: databaseConnected,
      },
      line: {
        configured: Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_SECRET),
      },
      orders: {
        connected: ordersStorageConnected,
        channel: "LINE",
      },
    },
    checkedAt: new Date().toISOString(),
  });
}
