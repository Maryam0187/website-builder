import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * POST /api/admin/backup
 * Trigger a database backup to R2
 * Protected by BACKUP_SECRET env var
 */
export async function POST(request) {
  try {
    // Verify secret
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.BACKUP_SECRET;

    if (!secret) {
      return NextResponse.json(
        { error: "Backup not configured (BACKUP_SECRET missing)" },
        { status: 503 }
      );
    }

    if (!authHeader || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check R2 configuration
    const r2Endpoint = process.env.R2_ENDPOINT;
    const r2Bucket = process.env.R2_BUCKET;
    const r2AccessKey = process.env.R2_ACCESS_KEY_ID;
    const r2SecretKey = process.env.R2_SECRET_ACCESS_KEY;

    if (!r2Endpoint || !r2Bucket || !r2AccessKey || !r2SecretKey) {
      return NextResponse.json(
        { error: "R2 not configured (missing R2_* env vars)" },
        { status: 503 }
      );
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupFilename = `backup-${timestamp}.sql`;

    // Create pg_dump backup
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json(
        { error: "DATABASE_URL not set" },
        { status: 503 }
      );
    }

    // Export database
    const dumpCommand = `pg_dump "${databaseUrl}" > /tmp/${backupFilename}`;
    await execAsync(dumpCommand);

    // Upload to R2 using aws-cli (R2 is S3-compatible)
    const uploadCommand = `AWS_ACCESS_KEY_ID="${r2AccessKey}" AWS_SECRET_ACCESS_KEY="${r2SecretKey}" aws s3 cp /tmp/${backupFilename} s3://${r2Bucket}/backups/${backupFilename} --endpoint-url ${r2Endpoint}`;
    await execAsync(uploadCommand);

    // Clean up local file
    await execAsync(`rm /tmp/${backupFilename}`);

    // Log backup in database
    await query(
      `INSERT INTO system_logs (event_type, message, metadata) VALUES ($1, $2, $3)`,
      ["backup", "Database backup completed", JSON.stringify({ filename: backupFilename, timestamp })]
    ).catch(() => {
      // If system_logs table doesn't exist, just log to console
      console.log(`Backup completed: ${backupFilename}`);
    });

    return NextResponse.json({
      success: true,
      filename: backupFilename,
      timestamp,
    });
  } catch (error) {
    console.error("Backup error:", error);
    return NextResponse.json(
      { error: error.message || "Backup failed" },
      { status: 500 }
    );
  }
}
