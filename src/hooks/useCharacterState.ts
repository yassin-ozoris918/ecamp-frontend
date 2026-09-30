/**
 * useCharacterState — maps eCamp form/UI events to CharacterState.
 *
 * This hook is the bridge between UI state and the EcampCharacter component.
 * Keep all animation-decision logic HERE so individual pages stay clean.
 *
 * Usage:
 *   const { charState, onFocus, onBlur, onTyping, onError, onLoading, onSuccess } = useCharacterState();
 *   <EcampCharacter state={charState} />
 */

import { useState, useCallback, useRef } from 'react';
import type { CharacterState } from '../components/common/EcampCharacter';

// How long (ms) to hold a transient state before returning to idle/looking
const TRANSIENT_DURATION = {
  error:   2200,
  success: 3000,
  happy:   2400,
} as const;

// Debounce typing reaction so it doesn't fire on every keystroke
const TYPING_DEBOUNCE = 400;

export function useCharacterState(initialState: CharacterState = 'idle') {
  const [charState, setCharState] = useState<CharacterState>(initialState);

  // Tracks whether a field is focused right now
  const isFocusedRef    = useRef(false);
  const typingTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Clear any pending transient timer */
  const clearTransient = useCallback(() => {
    if (transientTimerRef.current) {
      clearTimeout(transientTimerRef.current);
      transientTimerRef.current = null;
    }
  }, []);

  /** Set a state that auto-reverts after `duration` ms */
  const setTransient = useCallback((state: CharacterState, duration: number, fallback: CharacterState = 'looking') => {
    clearTransient();
    setCharState(state);
    transientTimerRef.current = setTimeout(() => {
      setCharState(isFocusedRef.current ? fallback : 'idle');
    }, duration);
  }, [clearTransient]);

  // ── Public callbacks ──────────────────────────────────────────────────────

  /** Call when any form input gains focus */
  const onFocus = useCallback(() => {
    isFocusedRef.current = true;
    clearTransient();
    setCharState('looking');
  }, [clearTransient]);

  /** Call when any form input loses focus */
  const onBlur = useCallback(() => {
    isFocusedRef.current = false;
    clearTransient();
    setCharState('idle');
  }, [clearTransient]);

  /** Call on every onChange event (debounced) */
  const onTyping = useCallback(() => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setCharState('typing');
    typingTimerRef.current = setTimeout(() => {
      // After typing pause, return to looking (still focused)
      if (isFocusedRef.current) setCharState('looking');
    }, TYPING_DEBOUNCE);
  }, []);

  /** Call when validation errors appear */
  const onError = useCallback(() => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setTransient('confused', TRANSIENT_DURATION.error, 'worried');
  }, [setTransient]);

  /** Call when the form is loading/submitting */
  const onLoading = useCallback(() => {
    clearTransient();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setCharState('thinking');
  }, [clearTransient]);

  /** Call on successful submission */
  const onSuccess = useCallback(() => {
    clearTransient();
    setTransient('celebrating', TRANSIENT_DURATION.success, 'happy');
  }, [clearTransient, setTransient]);

  /** Call when opening/revealing the form */
  const onOpening = useCallback(() => {
    clearTransient();
    setCharState('opening');
    // After open animation, go to idle
    transientTimerRef.current = setTimeout(() => {
      setCharState('idle');
    }, 900);
  }, [clearTransient]);

  /** Call when pulling/grabbing the form */
  const onPulling = useCallback(() => {
    clearTransient();
    setCharState('pulling');
  }, [clearTransient]);

  /** Directly set any state */
  const setState = useCallback((s: CharacterState) => {
    clearTransient();
    setCharState(s);
  }, [clearTransient]);

  return {
    charState,
    setState,
    onFocus,
    onBlur,
    onTyping,
    onError,
    onLoading,
    onSuccess,
    onOpening,
    onPulling,
  };
}
