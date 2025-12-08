import { createClient } from '@supabase/supabase-js'

// IMPORTANT: Replace these with your actual Supabase credentials
// Get them from: Supabase Dashboard → Settings → API

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL_HERE'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY_HERE'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper functions for common operations

// Create a new customer account
export async function createCustomer(email, password, companyName, contactName) {
  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) throw authError

    // 2. Create customer record
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .insert([
        {
          id: authData.user.id,
          email,
          company_name: companyName,
          contact_name: contactName,
        }
      ])
      .select()

    if (customerError) throw customerError

    return { success: true, customer: customerData[0] }
  } catch (error) {
    console.error('Error creating customer:', error)
    return { success: false, error: error.message }
  }
}

// Sign in customer
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

// Sign out customer
export async function signOutCustomer() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error signing out:', error)
    return { success: false, error: error.message }
  }
}

// Get current user
export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Error getting user:', error)
    return null
  }
}

// Create a new order
export async function createOrder(customerId, orderData) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          customer_id: customerId,
          product_type: orderData.product,
          quantity: orderData.quantity,
          paper_type: orderData.paper,
          finishing_options: orderData.finishing,
          turnaround: orderData.turnaround,
          location: orderData.location,
          standard_price: orderData.standardPrice,
          rush_price: orderData.rushPrice,
          final_price: orderData.finalPrice,
          status: 'quote',
        }
      ])
      .select()

    if (error) throw error

    return { success: true, order: data[0] }
  } catch (error) {
    console.error('Error creating order:', error)
    return { success: false, error: error.message }
  }
}

// Get customer's orders
export async function getCustomerOrders(customerId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, orders: data }
  } catch (error) {
    console.error('Error fetching orders:', error)
    return { success: false, error: error.message }
  }
}

// Get customer profile
export async function getCustomerProfile(customerId) {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (error) throw error

    return { success: true, customer: data }
  } catch (error) {
    console.error('Error fetching customer:', error)
    return { success: false, error: error.message }
  }
}

// Update order status
export async function updateOrderStatus(orderId, status) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()

    if (error) throw error

    return { success: true, order: data[0] }
  } catch (error) {
    console.error('Error updating order:', error)
    return { success: false, error: error.message }
  }
}

// Calculate quote using pricing rules
export async function calculateQuote(productType, quantity, paperType, finishing, turnaround) {
  try {
    // Get pricing rule
    const { data: pricingRule, error } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('product_type', productType)
      .eq('paper_type', paperType)
      .eq('active', true)
      .single()

    if (error || !pricingRule) {
      // Fallback to simple calculation if no rule found
      const basePrice = quantity * 0.25
      return {
        success: true,
        quote: {
          standard: basePrice.toFixed(2),
          rush: (basePrice * 1.5).toFixed(2),
        }
      }
    }

    // Calculate based on pricing rule
    const sheetsNeeded = Math.ceil(quantity / 8) // Assuming 8-up
    const paperCost = sheetsNeeded * pricingRule.paper_cost_per_sheet
    
    const setupTime = pricingRule.setup_time_minutes / 60 // Convert to hours
    const runTime = sheetsNeeded / pricingRule.run_speed_per_hour
    const totalTime = setupTime + runTime
    const pressCost = totalTime * pricingRule.press_rate_per_hour
    
    const finishingCost = finishing.length > 0 ? 25 : 0 // Simple finishing cost
    
    const totalCost = paperCost + pressCost + finishingCost
    const standardPrice = totalCost * pricingRule.markup_percentage
    const rushPrice = standardPrice * pricingRule.rush_multiplier

    return {
      success: true,
      quote: {
        standard: standardPrice.toFixed(2),
        rush: rushPrice.toFixed(2),
        breakdown: {
          paperCost: paperCost.toFixed(2),
          pressCost: pressCost.toFixed(2),
          finishingCost: finishingCost.toFixed(2),
          sheets: sheetsNeeded,
          pressTime: `${totalTime.toFixed(1)} hours`
        }
      }
    }
  } catch (error) {
    console.error('Error calculating quote:', error)
    return { success: false, error: error.message }
  }
}

export default supabase    if (customerError) throw customerError

    return { success: true, customer: customerData[0] }
  } catch (error) {
    console.error('Error creating customer:', error)
    return { success: false, error: error.message }
  }
}

// Sign in customer
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

// Sign out customer
export async function signOutCustomer() {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('Error signing out:', error)
    return { success: false, error: error.message }
  }
}

// Get current user
export async function getCurrentUser() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Error getting user:', error)
    return null
  }
}

// Create a new order
export async function createOrder(customerId, orderData) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          customer_id: customerId,
          product_type: orderData.product,
          quantity: orderData.quantity,
          paper_type: orderData.paper,
          finishing_options: orderData.finishing,
          turnaround: orderData.turnaround,
          location: orderData.location,
          standard_price: orderData.standardPrice,
          rush_price: orderData.rushPrice,
          final_price: orderData.finalPrice,
          status: 'quote',
        }
      ])
      .select()

    if (error) throw error

    return { success: true, order: data[0] }
  } catch (error) {
    console.error('Error creating order:', error)
    return { success: false, error: error.message }
  }
}

// Get customer's orders
export async function getCustomerOrders(customerId) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, orders: data }
  } catch (error) {
    console.error('Error fetching orders:', error)
    return { success: false, error: error.message }
  }
}

// Get customer profile
export async function getCustomerProfile(customerId) {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (error) throw error

    return { success: true, customer: data }
  } catch (error) {
    console.error('Error fetching customer:', error)
    return { success: false, error: error.message }
  }
}

// Update order status
export async function updateOrderStatus(orderId, status) {
  try {
    const { data, error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)
      .select()

    if (error) throw error

    return { success: true, order: data[0] }
  } catch (error) {
    console.error('Error updating order:', error)
    return { success: false, error: error.message }
  }
}

// Calculate quote using pricing rules
export async function calculateQuote(productType, quantity, paperType, finishing, turnaround) {
  try {
    // Get pricing rule
    const { data: pricingRule, error } = await supabase
      .from('pricing_rules')
      .select('*')
      .eq('product_type', productType)
      .eq('paper_type', paperType)
      .eq('active', true)
      .single()

    if (error || !pricingRule) {
      // Fallback to simple calculation if no rule found
      const basePrice = quantity * 0.25
      return {
        success: true,
        quote: {
          standard: basePrice.toFixed(2),
          rush: (basePrice * 1.5).toFixed(2),
        }
      }
    }

    // Calculate based on pricing rule
    const sheetsNeeded = Math.ceil(quantity / 8) // Assuming 8-up
    const paperCost = sheetsNeeded * pricingRule.paper_cost_per_sheet
    
    const setupTime = pricingRule.setup_time_minutes / 60 // Convert to hours
    const runTime = sheetsNeeded / pricingRule.run_speed_per_hour
    const totalTime = setupTime + runTime
    const pressCost = totalTime * pricingRule.press_rate_per_hour
    
    const finishingCost = finishing.length > 0 ? 25 : 0 // Simple finishing cost
    
    const totalCost = paperCost + pressCost + finishingCost
    const standardPrice = totalCost * pricingRule.markup_percentage
    const rushPrice = standardPrice * pricingRule.rush_multiplier

    return {
      success: true,
      quote: {
        standard: standardPrice.toFixed(2),
        rush: rushPrice.toFixed(2),
        breakdown: {
          paperCost: paperCost.toFixed(2),
          pressCost: pressCost.toFixed(2),
          finishingCost: finishingCost.toFixed(2),
          sheets: sheetsNeeded,
          pressTime: `${totalTime.toFixed(1)} hours`
        }
      }
    }
  } catch (error) {
    console.error('Error calculating quote:', error)
    return { success: false, error: error.message }
  }
}

export default supabase
