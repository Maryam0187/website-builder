import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { adminAccountStats } from "@/lib/admin-users";

/** Admin: every owner account plus dashboard counts. */
export async function GET() {
  const user = await requireUser(["admin"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stats = await adminAccountStats();
  return NextResponse.json({
    users: stats.owners,
    stats: {
      users: stats.users,
      stuck: stats.stuck,
      sites: stats.sites,
      liveSites: stats.liveSites,
      conversations: stats.conversations,
      unread: stats.unread,
    },
  });
}
