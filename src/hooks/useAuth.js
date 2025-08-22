import { useState, useEffect } from 'react'
import { authService } from '../lib/auth'
import { dbService } from '../lib/database'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check current session
    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user)
          await loadProfile(session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }
        setLoading(false)
      }
    )

    return () => subscription?.unsubscribe()
  }, [])

  const checkUser = async () => {
    const { user } = await authService.getCurrentUser()
    if (user) {
      setUser(user)
      await loadProfile(user.id)
    }
    setLoading(false)
  }

  const loadProfile = async (userId) => {
    const { data, error } = await dbService.getUserProfile(userId)
    if (data && !error) {
      setProfile(data)
    }
  }

  const signIn = async (email, password) => {
    const { data, error } = await authService.signIn(email, password)
    if (data.user && !error) {
      await dbService.logActivity('Login')
    }
    return { data, error }
  }

  const signOut = async () => {
    await dbService.logActivity('Logout')
    await authService.signOut()
  }

  return {
    user,
    profile,
    loading,
    signIn,
    signOut,
    isAuthenticated: !!user
  }
}