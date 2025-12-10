import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.https://tvvryifrviiodhanacun.supabase.co
const supabaseAnonKey = process.env.sb_publishable_tc29o_iby3npa7grMpTfjQ_onLmcKbG

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function createCustomer(email, password, companyName, contactName) {
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) throw authError

    if (authData.user) {
      const { error: customerError } = await supabase
        .from('customers')
        .insert([
          {
            id: authData.user.id,
            email,
            company_name: companyName,
            contact_name: contactName,
          }
        ])

      if (customerError) throw customerError
    }

    return { success: true, user: authData.user }
  } catch (error) {
    console.error('Error creating customer:', error)
    return { success: false, error: error.message }
  }
}

export async function signInCustomer(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    return { success: true, user: data.user }
  } catch (error) {
    console.error('Error signing in:', error)
    return { success: false, error: error.message }
  }
}

export async function signOutCustomer() {
  const { error } = await supabase.auth.signOut()
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}
```

---

## Fix 2: Disable Email Confirmation in Supabase

1. Go to Supabase Dashboard
2. Click **Authentication** → **Providers** → **Email**
3. Scroll to **Email Settings**
4. **UNCHECK** "Confirm email"
5. Click **Save**

---

## Fix 3: Verify Environment Variables in Vercel

Go to Vercel → Settings → Environment Variables and confirm you have:
```
NEXT_PUBLIC_SUPABASE_URL = https://[your-project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGc... [your key]
