// lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadArtFileForJob(jobId, file) {
  // 1) Make sure we have a logged-in user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("No authenticated user", userError);
    throw new Error("You must be logged in to upload files.");
  }

  // 2) Build a path inside the bucket
  const bucket = "art-files";
  const safeName = file.name.replace(/\s+/g, "_");
  const filePath = `job-${jobId}/${Date.now()}-${safeName}`;

  // 3) Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    throw uploadError;
  }

  // 4) Insert metadata row into public.files
  const { error: dbError } = await supabase.from("files").insert({
    bucket,
    path: filePath,
    job_id: jobId,   // must be 'job_id', NOT 'jobId'
    user_id: user.id,
  });

  if (dbError) {
    console.error("DB insert error:", dbError);
    throw dbError;
  }

  return { bucket, path: filePath };
}
