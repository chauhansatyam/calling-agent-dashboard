// import { supabase } from './supabase'

// export const authService = {
//   // Sign in with email and password
//   async signIn(email, password) {
//     const { data, error } = await supabase.auth.signInWithPassword({
//       email,
//       password
//     })
//     return { data, error }
//   },

//   // Sign out
//   async signOut() {
//     const { error } = await supabase.auth.signOut()
//     return { error }
//   },

//   // Get current user
//   async getCurrentUser() {
//     const { data: { user }, error } = await supabase.auth.getUser()
//     return { user, error }
//   },

//   // Sign up new user
//   async signUp(email, password, metadata = {}) {
//     const { data, error } = await supabase.auth.signUp({
//       email,
//       password,
//       options: {
//         data: metadata
//       }
//     })
//     return { data, error }
//   },

//   // Listen to auth state changes
//   onAuthStateChange(callback) {
//     return supabase.auth.onAuthStateChange(callback)
//   }
// }
// lib/auth.js - Custom Authentication Service

///////
import { supabase } from './supabase'

// Simple session storage keys
const SESSION_KEY = 'app_user_session'
const USER_KEY = 'app_current_user'
console.log(supabase)
export const authService = {
  // Login by checking credentials against database
  signInWithPassword: async ({ email, password }) => {
    try {
      // Query the employees table to find user
      const { data: users, error } = await supabase
        .from('employees')
        .select('*')

      if (error) {
        console.error('Database query error:', error)
        return { data: { user: null }, error: { message: 'Database connection error' } }
      }

      if (!users || users.length === 0) {
        return { data: { user: null }, error: { message: 'Invalid email or password' } }
      }
      console.log('Users found:', users)
      const user = users.find(u => u.email === email) 

      // Check password (simple string comparison for now)
      // In production, you should hash passwords and compare hashed values
      if (user.password_hash !== password) {
        return { data: { user: null }, error: { message: 'Invalid email or password' } }
      }

      // Create session data
      const sessionData = {
        id: user.id,
        email: user.email,
        employee_id: user.employee_id,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        department: user.department,
        login_time: new Date().toISOString()
      }

      // Store session
      localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData))
      localStorage.setItem(USER_KEY, JSON.stringify(user))

      // Update last login time
      await supabase
        .from('employees')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id)

      return { 
        data: { 
          user: sessionData 
        }, 
        error: null 
      }

    } catch (err) {
      console.error('Login error:', err)
      return { data: { user: null }, error: { message: 'Login failed: ' + err.message } }
    }
  },

  // Sign up new user (admin only)
  signUp: async ({ email, password, options = {} }) => {
    try {
      const userData = options.data || {}
      
      // Check if user already exists
      const { data: existingUsers } = await supabase
        .from('employee')
        .select('email')
        .eq('email', email)
        .limit(1)

      if (existingUsers && existingUsers.length > 0) {
        return { data: null, error: { message: 'User already exists' } }
      }

      // Create new user record
      const newUser = {
        id: crypto.randomUUID(), // Generate UUID
        employee_id: userData.employee_id,
        first_name: userData.first_name,
        last_name: userData.last_name,
        email: email,
        phone: userData.phone || '',
        role: userData.role || 'agent',
        department: userData.department || '',
        password: password, // In production, hash this password
        status: 'active',
        created_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('employees')
        .insert([newUser])
        .select()

      if (error) {
        return { data: null, error }
      }

      return { 
        data: { 
          user: data[0] 
        }, 
        error: null 
      }

    } catch (err) {
      console.error('Signup error:', err)
      return { data: null, error: { message: 'Signup failed: ' + err.message } }
    }
  },

  // Sign out
  signOut: async () => {
    try {
      localStorage.removeItem(SESSION_KEY)
      localStorage.removeItem(USER_KEY)
      return { error: null }
    } catch (err) {
      return { error: err }
    }
  },

  // Get current user from session
  getUser: async () => {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      if (!sessionData) {
        return { data: { user: null }, error: null }
      }

      const user = JSON.parse(sessionData)
      
      // Check if session is still valid (optional - you can add expiration logic)
      return { data: { user }, error: null }
      
    } catch (err) {
      return { data: { user: null }, error: err }
    }
  },

  // Get current session
  getSession: async () => {
    try {
      const sessionData = localStorage.getItem(SESSION_KEY)
      if (!sessionData) {
        return { data: { session: null }, error: null }
      }

      const session = {
        user: JSON.parse(sessionData),
        access_token: 'custom_session_token',
        expires_at: Date.now() + (24 * 60 * 60 * 1000) // 24 hours from now
      }

      return { data: { session }, error: null }
      
    } catch (err) {
      return { data: { session: null }, error: err }
    }
  },

  // Listen to auth state changes (custom implementation)
  onAuthStateChange: (callback) => {
    // Check for storage changes
    const handleStorageChange = (e) => {
      if (e.key === SESSION_KEY) {
        const sessionData = e.newValue ? JSON.parse(e.newValue) : null
        callback(sessionData ? 'SIGNED_IN' : 'SIGNED_OUT', sessionData)
      }
    }

    window.addEventListener('storage', handleStorageChange)

    // Return unsubscribe function
    return {
      unsubscribe: () => {
        window.removeEventListener('storage', handleStorageChange)
      }
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const sessionData = localStorage.getItem(SESSION_KEY)
    return !!sessionData
  },

  // Get current user profile
  getCurrentUserProfile: () => {
    try {
      const userData = localStorage.getItem(USER_KEY)
      return userData ? JSON.parse(userData) : null
    } catch (err) {
      return null
    }
  }
}




// import { supabase } from "./supabase"

// class AuthService {
//   constructor() {
//     this.currentUser = null
//     this.currentUserProfile = null
//   }

//   async signInWithPassword({ email, password }) {
//     try {
//       const { data, error } = await supabase.auth.signInWithPassword({
//         email,
//         password,
//       })

//       if (error) {
//         return { data: null, error }
//       }

//       if (data.user) {
//         this.currentUser = data.user
//         // Load user profile from employees table
//         await this.loadUserProfile(data.user.id)
//       }

//       return { data, error: null }
//     } catch (err) {
//       return { data: null, error: { message: err.message } }
//     }
//   }

//   async signUp({ email, password, options = {} }) {
//     try {
//       const { data, error } = await supabase.auth.signUp({
//         email,
//         password,
//         options,
//       })

//       if (error) {
//         return { data: null, error }
//       }

//       // Create employee profile if signup successful
//       if (data.user && options.data) {
//         const profileData = {
//           id: data.user.id,
//           email: data.user.email,
//           employee_id: options.data.employee_id,
//           first_name: options.data.first_name,
//           last_name: options.data.last_name,
//           phone: options.data.phone,
//           role: options.data.role,
//           department: options.data.department,
//           status: "active",
//           created_at: new Date().toISOString(),
//           updated_at: new Date().toISOString(),
//         }

//         const { error: profileError } = await supabase.from("employees").insert([profileData])

//         if (profileError) {
//           console.error("Profile creation error:", profileError)
//         }
//       }

//       return { data, error: null }
//     } catch (err) {
//       return { data: null, error: { message: err.message } }
//     }
//   }

//   async signOut() {
//     try {
//       const { error } = await supabase.auth.signOut()
//       this.currentUser = null
//       this.currentUserProfile = null
//       return { error }
//     } catch (err) {
//       return { error: { message: err.message } }
//     }
//   }

//   async loadUserProfile(userId) {
//     try {
//       const { data, error } = await supabase.from("employees").select("*").eq("id", userId).single()

//       if (error) {
//         console.error("Load user profile error:", error)
//         return null
//       }

//       this.currentUserProfile = data
//       return data
//     } catch (err) {
//       console.error("Load user profile error:", err)
//       return null
//     }
//   }

//   isAuthenticated() {
//     return this.currentUser !== null
//   }

//   getCurrentUser() {
//     return this.currentUser
//   }

//   getCurrentUserProfile() {
//     return this.currentUserProfile
//   }

//   async getCurrentSession() {
//     try {
//       const {
//         data: { session },
//         error,
//       } = await supabase.auth.getSession()

//       if (error) {
//         return { session: null, error }
//       }

//       if (session) {
//         this.currentUser = session.user
//         await this.loadUserProfile(session.user.id)
//       }

//       return { session, error: null }
//     } catch (err) {
//       return { session: null, error: { message: err.message } }
//     }
//   }

//   async refreshSession() {
//     try {
//       const {
//         data: { session },
//         error,
//       } = await supabase.auth.refreshSession()

//       if (error) {
//         return { session: null, error }
//       }

//       if (session) {
//         this.currentUser = session.user
//       }

//       return { session, error: null }
//     } catch (err) {
//       return { session: null, error: { message: err.message } }
//     }
//   }
// }

// export const authService = new AuthService()
