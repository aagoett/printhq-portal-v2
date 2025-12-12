"use client";

import { createClient } from "@supabase/supabase-js";

// ---- Core Supabase client ----

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase env vars are missing");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ------------------------------------------------
// AUTH HELPERS
// ------------------------------------------------

// SIGN UP: create auth user + row in public.customers
// Your auth page calls: createCustomer(formData)
export async function createCustomer({
  companyName,
  contactName,
  email,
  password,
}) {
  // 1) Create auth user
  const { data: signUpData, error: signUpError } =
    await supabase.auth.signUp({
      email,
      password,
    });

  if (signUpError) {
    console.error("signUp error", signUpError);
    throw signUpError;
  }

  const user = signUpData.user ?? signUpData.session?.user;
  if (!user) {
    throw new Error("No user returned from Supabase signUp");
  }

  // 2) Insert into customers table
  // Assumes public.customers has:
  // id (uuid, pk), company_name, contact_name, email
  const { error: customerError } = await supabase.from("customers").insert({
    id: user.id,
    company_name: companyName,
    contact_name: contactName,
    email,
  });

  if (customerError) {
    console.error("customers insert error", customerError);
    throw customerError;
  }

  return { user };
}

// LOGIN: your auth page calls: signInCustomer(email, password)
export async function signInCustomer(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("signIn error", error);
    throw error;
  }

  return data; // contains session + user
}

// ------------------------------------------------
// FILE UPLOAD HELPERS
// ------------------------------------------------

// Upload a single art file for a job
// Dashboard button should call: uploadJobArtFile(file, jobId)
export async function uploadJobArtFile(file, jobId) {
  if (!file) {
    throw new Error("No file provided");
  }
  if (!jobId) {
    throw new Error("No jobId provided");
  }

  // Ensure user is logged in
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    console.error("getUser error", userError);
    throw userError;
  }
  if (!user) {
    throw new Error("User not logged in");
  }

  const ext = file.name.split(".").pop();
  const safeName = file.name.replace(/\s+/g, "-").toLowerCase();
  const fileName = `${Date.now()}-${safeName}`;
  const filePath = `job-${jobId}/${fileName}`;

  // 1) Upload to storage bucket "art-files"
  const { error: storageError } = await supabase.storage
    .from("art-files")
    .upload(filePath, file);

  if (storageError) {
    console.error("storage upload error", storageError);
    throw storageError;
  }

  // 2) Insert metadata into public.files
  // Assumes public.files has columns:
  // id (uuid, default), bucket (text), path (text), job_id (text), user_id (uuid)
  const { error: dbError } = await supabase.from("files").insert({
    bucket: "art-files",
    path: filePath,
    job_id: jobId,
    user_id: user.id,
  });

  if (dbError) {
    console.error("files insert error", dbError);
    throw dbError;
  }

  return { filePath };
}
