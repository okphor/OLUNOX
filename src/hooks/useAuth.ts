import { useState, useEffect } from 'react';

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Check for existing user in localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('olubox_user');
    const savedProfile = localStorage.getItem('olubox_profile');
    
    if (savedUser && savedProfile) {
      try {
        const userData = JSON.parse(savedUser);
        const profileData = JSON.parse(savedProfile);
        setUser(userData);
        setProfile(profileData);
        setSession({ user: userData });
        console.log('Loaded existing user from localStorage:', profileData.full_name);
      } catch (error) {
        console.error('Error loading saved user data:', error);
        // Clear corrupted data
        localStorage.removeItem('olubox_user');
        localStorage.removeItem('olubox_profile');
      }
    }
  }, []);

  const generateUsername = () => {
    const adjectives = [
      'Amazing', 'Brilliant', 'Creative', 'Dynamic', 'Energetic', 'Fantastic',
      'Graceful', 'Happy', 'Inspiring', 'Joyful', 'Kind', 'Lively',
      'Magnificent', 'Noble', 'Optimistic', 'Peaceful', 'Quick', 'Radiant',
      'Stellar', 'Thoughtful', 'Unique', 'Vibrant', 'Wise', 'Zealous'
    ];
    
    const nouns = [
      'Explorer', 'Dreamer', 'Thinker', 'Creator', 'Builder', 'Leader',
      'Innovator', 'Visionary', 'Pioneer', 'Champion', 'Artist', 'Mentor',
      'Storyteller', 'Adventurer', 'Philosopher', 'Designer', 'Strategist',
      'Catalyst', 'Connector', 'Transformer', 'Achiever', 'Motivator'
    ];

    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 999) + 1;
    
    return `${adjective}${noun}${number}`;
  };

  const createAccount = async (username: string) => {
    try {
      setLoading(true);
      
      // Generate a unique user ID
      const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      const email = `${username.toLowerCase().replace(/\s+/g, '')}_${Date.now()}@olubox.local`;
      
      const userData = {
        id: userId,
        email: email,
        created_at: new Date().toISOString()
      };

      const profileData: UserProfile = {
        id: userId,
        email: email,
        full_name: username,
        avatar_url: null,
        is_admin: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save to localStorage
      localStorage.setItem('olubox_user', JSON.stringify(userData));
      localStorage.setItem('olubox_profile', JSON.stringify(profileData));

      // Update state
      setUser(userData);
      setProfile(profileData);
      setSession({ user: userData });

      console.log('Account created successfully:', username);
      return { user: userData, username };
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // Clear localStorage
      localStorage.removeItem('olubox_user');
      localStorage.removeItem('olubox_profile');
      
      // Clear state
      setUser(null);
      setProfile(null);
      setSession(null);
      
      console.log('User signed out');
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return;

    try {
      const updatedProfile = {
        ...profile,
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Save to localStorage
      localStorage.setItem('olubox_profile', JSON.stringify(updatedProfile));
      
      // Update state
      setProfile(updatedProfile);
      
      console.log('Profile updated:', updates);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  return {
    user,
    profile,
    session,
    loading,
    createAccount,
    signOut,
    updateProfile,
    generateUsername
  };
}