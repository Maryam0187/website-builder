import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";

export async function POST(request) {
  const form = await request.formData();
  const files = form.getAll("files").filter(Boolean);

  if (!files.length) {
    return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  const urls = [];
  for (const file of files.slice(0, 8)) {
    if (typeof file === "string") continue;
    const type = file.type || "";
    if (!type.startsWith("image/")) {
      return NextResponse.json({ error: "Only images are allowed" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Each image must be under 5MB" }, { status: 400 });
    }

    const ext = type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const filename = `${nanoid(12)}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(uploadDir, filename), buffer);
    urls.push(`/uploads/${filename}`);
  }

  return NextResponse.json({ urls });
}
