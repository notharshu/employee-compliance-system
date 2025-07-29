import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting initial session:', error)
          setLoading(false)
          return
        }

        console.log('Initial session:', initialSession)
        setSession(initialSession)
        setUser(initialSession?.user ?? null)
        
        if (initialSession?.user) {
          await fetchUserProfile(initialSession.user.id)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('Error in getInitialSession:', error)
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes with enhanced token refresh handling
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth state changed:', event, currentSession)
      
      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      switch (event) {
        case 'SIGNED_IN':
          console.log('User signed in successfully')
          if (currentSession?.user) {
            await fetchUserProfile(currentSession.user.id)
          }
          break
          
        case 'TOKEN_REFRESHED':
          console.log('Token refreshed successfully')
          if (currentSession?.user) {
            await fetchUserProfile(currentSession.user.id)
          }
          break
          
        case 'SIGNED_OUT':
          console.log('User signed out')
          setUserProfile(null)
          setLoading(false)
          break
          
        case 'USER_UPDATED':
          console.log('User updated')
          if (currentSession?.user) {
            await fetchUserProfile(currentSession.user.id)
          }
          break
          
        default:
          if (currentSession?.user) {
            await fetchUserProfile(currentSession.user.id)
          } else {
            setUserProfile(null)
            setLoading(false)
          }
      }
    })

    return () => {
      console.log('Cleaning up auth subscription')
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserProfile = async (userId) => {
    try {
      console.log('Fetching user profile for:', userId)
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
      } else {
        console.log('User profile fetched successfully:', data?.email)
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
    } finally {
      setLoading(false)
    }
  }

  // Enhanced signUp with better error handling
  const signUp = async (email, password) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      
      if (error) {
        console.error('SignUp error:', error)
      } else {
        console.log('SignUp successful for:', email)
      }
      
      return { data, error }
    } catch (error) {
      console.error('Unexpected signUp error:', error)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  // Enhanced signIn with automatic profile creation fallback
  const signIn = async (email, password) => {
    try {
      setLoading(true)
      console.log('Attempting to sign in:', email)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('SignIn error:', error)
        throw error
      }

      console.log('SignIn successful for:', email)

      if (data.user) {
        // Check if profile exists
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()

        if (profileError && profileError.code === 'PGRST116') {
          // Profile doesn't exist, create a basic one
          console.log('Profile not found, creating basic profile...')
          
          const { error: createError } = await supabase
            .from('profiles')
            .insert([{
              id: data.user.id,
              email: data.user.email,
              profile_completed: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])

          if (createError) {
            console.error('Error creating profile on login:', createError)
          } else {
            console.log('Basic profile created successfully on login')
          }
        } else if (profileError) {
          console.error('Error checking profile:', profileError)
        }
      }

      return { data, error: null }
    } catch (error) {
      console.error('SignIn failed:', error)
      return { data: null, error }
    } finally {
      setLoading(false)
    }
  }

  // Enhanced signOut with cleanup
  const signOut = async () => {
    try {
      console.log('Signing out user')
      setLoading(true)
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('SignOut error:', error)
      } else {
        console.log('SignOut successful')
        // Clear local state
        setUser(null)
        setUserProfile(null)
        setSession(null)
      }
      
      return { error }
    } catch (error) {
      console.error('Unexpected signOut error:', error)
      return { error }
    } finally {
      setLoading(false)
    }
  }

  // Helper function to check if current session is valid
  const isSessionValid = () => {
    if (!session) return false
    
    const expiresAt = session.expires_at * 1000 // Convert to milliseconds
    const now = Date.now()
    const isExpired = now > expiresAt
    
    if (isExpired) {
      console.warn('Session has expired')
    }
    
    return !isExpired
  }

  // Helper function to manually refresh token if needed
  const refreshSession = async () => {
    try {
      console.log('Manually refreshing session...')
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Error refreshing session:', error)
        return { error }
      }
      
      console.log('Session refreshed successfully')
      return { data, error: null }
    } catch (error) {
      console.error('Unexpected error refreshing session:', error)
      return { error }
    }
  }

  const value = {
    user,
    userProfile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    isSessionValid,
    refreshSession,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
