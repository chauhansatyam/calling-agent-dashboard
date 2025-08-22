// import { createClient } from '@supabase/supabase-js'

// const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
// const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// if (!supabaseUrl || !supabaseAnonKey) {
//   throw new Error('Missing Supabase environment variables')
// }
// console.log('Supabase URL:', supabaseUrl)
// export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// lib/supabase.js - Admin Supabase Client
// import { createClient } from '@supabase/supabase-js'

// const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://cwsiowcjeurzjeykcppm.supabase.co'
// // Use service role key for admin access (replace with your actual service role key)
// const supabaseServiceKey = process.env.REACT_APP_SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3c2lvd2NqZXVyempleWtjcHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDM4MzgsImV4cCI6MjA2ODMxOTgzOH0.6BLg8jhc7k_LzcSAsRlkL797860AcNBQyX1fw_F7GDU'

// // Single admin client for all database operations
// export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
//   auth: {
//     persistSession: false,
//     autoRefreshToken: false
//   }
// })





import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || "https://cwsiowcjeurzjeykcppm.supabase.co"
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3c2lvd2NqZXVyempleWtjcHBtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3NDM4MzgsImV4cCI6MjA2ODMxOTgzOH0.6BLg8jhc7k_LzcSAsRlkL797860AcNBQyX1fw_F7GDU"
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
})
