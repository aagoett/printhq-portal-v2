import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * AUTH HELPERS
 */

export async function createCustomer({ email, password, companyName, contactName }) {
  // 1) Create auth user
  const { data: auth, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });
  if (authError) throw authError;

  const user = auth.user ?? auth.session?.user;
  if (!user) throw new Error("No user returned from signUp");

  // 2) Create a customer/company row linked to this user
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

  if (customerError) throw customerError;

  return { user, customer };
}


export async function signInCustomer({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOutCustomer() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  return true;
}

/**
 * QUOTING & ORDERS
 * These can be improved later; for now they just give you
 * working exports so the app builds and can hit Supabase.
 */

export async function calculateQuote(quoteInput) {
  // Example: call a Supabase function or table – adjust to your schema later
  // For now, return a simple placeholder structure so the UI works.
  return {
    totalPrice: 0,
    currency: 'USD',
    breakdown: [],
    rawInput: quoteInput,
  };
}

export async function createOrder(orderInput) {
  // Example insert into "orders" table – adjust table/columns to your real schema.
  const { data, error } = await supabase
    .from('orders')
    .insert(orderInput)
    .select()
    .single();

  if (error) throw error;
  return data;
}
