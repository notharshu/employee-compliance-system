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

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        fetchUserProfile(currentSession.user.id)
      } else {
        setUserProfile(null)
        setLoading(false)
      }
    })

    // Cleanup subscription on unmount
    return () => subscription.unsubscribe()
  }, [])

  const fetchUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        setUserProfile(null)
      } else {
        setUserProfile(data)
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
      setUserProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email, password) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    return { data, error }
  }

  const signIn = async (email, password) => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (data?.user) {
      await fetchUserProfile(data.user.id)
    }

    setLoading(false)
    return { data, error }
  }

  const signOut = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
    setSession(null)
    setLoading(false)
    return { error }
  }

  const value = {
    user,
    userProfile,
    session,
    loading,
    signUp,
    signIn,
    signOut
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
