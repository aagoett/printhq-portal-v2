import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/admin";

const ALLOWED_STATUSES = new Set(["pending", "approved", "rejected"]);

type CardPayload = {
  organization_id?: string | null;
  contact_id?: string | null;
  source_filename?: string | null;
  raw_text?: string | null;
  parsed_json?: any;
  review_status?: string;
  image_path?: string | null;
};

function normalizeParsedJson(value: any) {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (_err) {
      return value;
    }
  }
  return value;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    const tokenBypass = Boolean(
      process.env.CARD_IMPORT_TOKEN && req.headers.get("x-import-token") === process.env.CARD_IMPORT_TOKEN
    );

    const { data: userResp } = tokenBypass ? { data: { user: null } } : await supabase.auth.getUser();
    const authedUser = userResp?.user;
    let ingestedBy: string | null = authedUser?.id || null;

    if (!tokenBypass) {
      if (!authedUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authedUser.id)
        .single();

      if (!profile || !["admin", "staff"].includes(profile.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const contentType = req.headers.get("content-type") || "";
    let cards: CardPayload[] = [];
    let files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const cardsRaw = formData.get("cards");
      if (!cardsRaw) {
        return NextResponse.json({ error: "Missing cards payload" }, { status: 400 });
      }

      try {
        cards = JSON.parse(String(cardsRaw)) as CardPayload[];
      } catch (_err) {
        return NextResponse.json({ error: "cards payload must be valid JSON" }, { status: 400 });
      }

      files = formData
        .getAll("files")
        .filter((f): f is File => f instanceof File && typeof f.arrayBuffer === "function");
    } else {
      const body = await req.json().catch(() => null);
      if (!body?.cards) {
        return NextResponse.json({ error: "Missing cards payload" }, { status: 400 });
      }
      cards = body.cards as CardPayload[];
    }

    if (!Array.isArray(cards) || cards.length === 0) {
      return NextResponse.json({ error: "cards must be a non-empty array" }, { status: 400 });
    }

    const admin = createServiceRoleClient();
    const inserted = [] as any[];

    for (let idx = 0; idx < cards.length; idx++) {
      const card = cards[idx] || {};
      const file = files[idx];
      let image_path = card.image_path || null;

      if (file && file.size > 0) {
        const ext = file.name?.split(".").pop() || "jpg";
        const fileName = `card-imports/${Date.now()}-${randomUUID()}.${ext}`;
        const { data: uploadData, error: uploadError } = await admin
          .storage
          .from("uploads")
          .upload(fileName, file, { upsert: false });

        if (uploadError) throw uploadError;
        image_path = uploadData?.path || fileName;
      }

      const payload = {
        organization_id: card.organization_id || null,
        contact_id: card.contact_id || null,
        source_filename: card.source_filename || file?.name || `card-${idx + 1}`,
        raw_text: card.raw_text || null,
        parsed_json: normalizeParsedJson(card.parsed_json),
        review_status: ALLOWED_STATUSES.has(card.review_status || "") ? card.review_status : "pending",
        image_path,
        ingested_by: ingestedBy,
      };

      const { data: insertedRow, error } = await admin
        .from("organization_card_imports")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      inserted.push(insertedRow);
    }

    return NextResponse.json({ success: true, count: inserted.length, imports: inserted });
  } catch (error: any) {
    console.error("Card import API failed", error?.message || error);
    return NextResponse.json({ error: error?.message || "Unexpected error" }, { status: 500 });
  }
}
