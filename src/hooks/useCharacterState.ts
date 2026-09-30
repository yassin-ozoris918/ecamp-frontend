/**
 * useCharacterState — maps eCamp form/UI events to CharacterState.
 *
 * This is the bridge between UI state and the EcampCharacter component.
 * All animation-decision logic lives HERE so individual pages stay clean.
 *
 * Usage:
 *   const char = useCharacterState('idle');
 *   <EcampCharacter state={char.charState} />
 */

import { useState, useCallback, useRef } from 'react';
import type { CharacterState } from '../components/common/EcampCharacter';

// How long (ms) to hold a transient state before reverting
const TRANSIENT = {
  error:      2200,
  success:    3000,
  pushing:    1100,   // matches CSS animation duration
  opening:    800,
} as const;

// Debounce delay — typing reaction reverts after this long with no keys
const TYPING_DEBOUNCE = 420;

export function useCharacterState(initialState: CharacterState = 'idle') {
  const [charState, setCharState] = useState<CharacterState>(initialState);

  const isFocusedRef      = useRef(false);
  const typingTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transientTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Clear any pending transient revert timer */
  const clearTransient = useCallback(() => {
    if (transientTimerRef.current) {
      clearTimeout(transientTimerRef.current);
      transientTimerRef.current = null;
    }
  }, []);

  /** Set a state that auto-reverts after `duration` ms */
  const setTransient = useCallback((
    state: CharacterState,
    duration: number,
    fallback: CharacterState = 'idle',
  ) => {
    clearTransient();
    setCharState(state);
    transientTimerRef.current = setTimeout(() => {
      setCharState(isFocusedRef.current ? 'looking' : fallback);
    }, duration);
  }, [clearTransient]);

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Input gained focus */
  const onFocus = useCallback(() => {
    isFocusedRef.current = true;
    clearTransient();
    setCharState('looking');
  }, [clearTransient]);

  /** Input lost focus */
  const onBlur = useCallback(() => {
    isFocusedRef.current = false;
    clearTransient();
    setCharState('idle');
  }, [clearTransient]);

  /** onChange event (debounced — call on every keystroke) */
  const onTyping = useCallback(() => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setCharState('typing');
    typingTimerRef.current = setTimeout(() => {
      if (isFocusedRef.current) setCharState('looking');
    }, TYPING_DEBOUNCE);
  }, []);

  /** Validation error occurred */
  const onError = useCallback(() => {
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setTransient('confused', TRANSIENT.error, 'worried');
  }, [setTransient]);

  /** Form is submitting */
  const onLoading = useCallback(() => {
    clearTransient();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setCharState('thinking');
  }, [clearTransient]);

  /** Registration / action succeeded */
  const onSuccess = useCallback(() => {
    clearTransient();
    setTransient('celebrating', TRANSIENT.success, 'happy');
  }, [clearTransient, setTransient]);

  /**
   * PUSHING: Yassin pushes the form panel in from the right.
   * Duration matches the CSS animation (1.1s), then calls `onOpening`.
   */
  const onPushing = useCallback((afterPush?: () => void) => {
    clearTransient();
    setCharState('pushing');
    transientTimerRef.current = setTimeout(() => {
      setCharState('opening');
      if (afterPush) afterPush();
      // After the opening step-back, settle into idle
      transientTimerRef.current = setTimeout(() => {
        setCharState('idle');
      }, TRANSIENT.opening);
    }, TRANSIENT.pushing);
  }, [clearTransient]);

  /** Step back after the form slides in */
  const onOpening = useCallback(() => {
    clearTransient();
    setCharState('opening');
    transientTimerRef.current = setTimeout(() => {
      setCharState('idle');
    }, TRANSIENT.opening);
  }, [clearTransient]);

  /** Directly set any state */
  const setState = useCallback((s: CharacterState) => {
    clearTransient();
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
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
    onPushing,
    onOpening,
  };
}
