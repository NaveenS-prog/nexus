import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { execFile, exec } from "child_process";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { filePath } = body;

    if (!filePath || typeof filePath !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing required parameter: filePath" },
        { status: 400 }
      );
    }

    const cleanPath = filePath.replace(/^file:\/\//, "").trim();
    const resolved = path.resolve(cleanPath);

    if (!fs.existsSync(resolved)) {
      return NextResponse.json(
        { success: false, error: `File not found on disk: ${resolved}` },
        { status: 404 }
      );
    }

    const isDir = fs.statSync(resolved).isDirectory();

    if (process.platform === "win32") {
      if (isDir) {
        execFile("explorer.exe", [resolved]);
      } else {
        // Reveal the file with selection in Windows Explorer
        execFile("explorer.exe", ["/select,", resolved], (err) => {
          if (err) {
            execFile("explorer.exe", [path.dirname(resolved)]);
          }
        });
      }
    } else if (process.platform === "darwin") {
      if (isDir) {
        exec(`open "${resolved}"`);
      } else {
        exec(`open -R "${resolved}"`);
      }
    } else {
      // Linux desktop
      const target = isDir ? resolved : path.dirname(resolved);
      exec(`xdg-open "${target}"`);
    }

    return NextResponse.json({
      success: true,
      message: `Revealed "${path.basename(resolved)}" in file manager.`,
      path: resolved,
    });
  } catch (err: any) {
    console.error("[AcademicOpen] Error revealing file:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
