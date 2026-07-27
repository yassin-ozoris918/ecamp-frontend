import { useCallback } from 'react';
import { useAuth } from '../lib/authContext';
import type { Profile } from '../lib/types';

export function useCurrentUser() {
  const { profile, loading, signOut, refetchProfile } = useAuth();

  const logout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const refresh = useCallback(async () => {
    await refetchProfile();
  }, [refetchProfile]);

  return {
    user: profile as Profile | null,
    loading,
    refresh,
    logout,
  };
}
