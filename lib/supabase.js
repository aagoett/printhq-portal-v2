import { createClient } from "@supabase/supabase-js";

/**
 * ENV
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

/**
 * CLIENT
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * SIGN IN
 */
export async function signInCustomer(email, password) {
  // 🔒 HARD TYPE GUARD
  const cleanEmail = typeof email === "string" ? email.trim() : "";
  const cleanPassword = typeof password === "string" ? password : "";

  if (!cleanEmail) {
    throw new Error("Email must be a string");
  }

  if (!cleanPassword) {
    throw new Error("Password must be a string");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: cleanPassword,
  });

  if (error) {
    console.error("Supabase sign-in error:", error);
    throw error;
  }

  return data;
}

/**
 * SIGN UP
 */
export async function createCustomer({
  email,
  password,
  companyName,
  contactName,
}) {
  if (typeof email !== "string" || typeof password !== "string") {
    throw new Error("Email and password must be strings");
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        company_name: companyName ?? null,
        contact_name: contactName ?? null,
      },
    },
  });

  if (error) {
    console.error("Supabase sign-up error:", error);
    throw error;
  }

  return data;
}

/**
 * SIGN OUT
 */
export async function signOutCustomer() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
