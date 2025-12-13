import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.https://tvvryifrviiodhanacun.supabase.co;
const supabaseAnonKey = process.env.sb_publishable_tc29o_iby3npa7grMpTfjQ_onLmcKbG;

if (!supabaseUrl || !supabaseAnonKey) {
  // Don’t crash build silently:
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signInCustomer(email, password) {
  const cleanEmail = String(email ?? '').trim();
  const cleanPassword = String(password ?? '');

  if (!cleanEmail) throw new Error('Email is missing');
  if (!cleanPassword) throw new Error('Password is missing');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: cleanPassword,
  });

  if (error) throw error;
  return data;
}

export async function createCustomer({ email, password, companyName, contactName }) {
  const cleanEmail = String(email ?? '').trim();
  const cleanPassword = String(password ?? '');
  const cleanCompany = String(companyName ?? '').trim();
  const cleanContact = String(contactName ?? '').trim();

  if (!cleanEmail) throw new Error('Email is missing');
  if (!cleanPassword) throw new Error('Password is missing');
  if (!cleanCompany) throw new Error('Company name is missing');
  if (!cleanContact) throw new Error('Contact name is missing');

  // Create auth user
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password: cleanPassword,
  });
  if (error) throw error;

  // Optional: insert into your customers table if you have it
  // (Only do this if your schema matches!)
  // await supabase.from('customers').insert([{ email: cleanEmail, company_name: cleanCompany, contact_name: cleanContact }]);

  return data;
}

export async function signOutCustomer() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
