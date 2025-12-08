// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
      'Make sure NEXT_PUBLIC_SUPABASE_URL and ' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Vercel.'
  );
}

// Main Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper: create a new customer + auth user
export async function createCustomer(email, password, companyName, contactName) {
  try {
    // 1) Create auth user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          company_name: companyName || null,
          contact_name: contactName || null,
        },
      },
    });

    if (signUpError) {
      return { success: false, error: signUpError.message };
    }

    const user = signUpData.user;

    // 2) Optionally insert into a "customers" table, if you have one
    //    (safe even if you don't – just comment this out if not needed)
    if (user) {
      await supabase.from('customers').upsert(
        {
          auth_user_id: user.id,
          email,
          company_name: companyName || null,
          contact_name: contactName || null,
        },
        { onConflict: 'auth_user_id' }
      );
    }

    return { success: true, user };
  } catch (err) {
    console.error('createCustomer error:', err);
    return { success: false, error: 'Unexpected error creating customer.' };
  }
}

// Helper: sign in existing customer
export async function signInCustomer(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, session: data.session, user: data.user };
  } catch (err) {
    console.error('signInCustomer error:', err);
    return { success: false, error: 'Unexpected error signing in.' };
  }
}

// Default export for convenience (in case something imports `default`)
export default supabase;
