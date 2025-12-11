// lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Create a new customer account:
 * 1) Create Supabase auth user (email + password)
 * 2) Create a row in the `customers` table linked to that user
 */
export async function createCustomer({
  email,
  password,
  companyName,
  contactName,
}) {
  // --- STEP 1: Auth user ---
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    // This is what shows up in the red banner on the auth form
    throw signUpError;
  }

  const user = signUpData.user ?? signUpData.session?.user;
  if (!user) {
    throw new Error("No user returned from Supabase signUp");
  }

  // --- STEP 2: Customer row ---
  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({
      user_id: user.id,
      company_name: companyName,
      contact_name: contactName,
      email,
    })
    .select()
    .single();

  if (customerError) {
    throw customerError;
  }

  return { user, customer };
}

/**
 * Log an existing customer in with email + password
 */
export async function signInCustomer({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  return data;
}
