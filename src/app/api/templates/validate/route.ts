import { NextResponse } from "next/server";
import { annotationTemplateSchema } from "@/lib/schema/annotation-schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = annotationTemplateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          valid: false,
          issues: result.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      valid: true,
      schemaVersion: result.data.schemaVersion,
      fieldCount: result.data.fields.length,
    });
  } catch {
    return NextResponse.json(
      { valid: false, issues: [{ path: "", message: "Invalid JSON body" }] },
      { status: 400 },
    );
  }
}
