import { useCallback, useEffect, useRef } from 'react';
import { Keyboard, ScrollView, type TextInputProps } from 'react-native';

type FocusEvent = Parameters<NonNullable<TextInputProps['onFocus']>>[0];

export function useKeyboardScroll() {
  const scrollRef = useRef<ScrollView>(null);
  const focusedInput = useRef<FocusEvent['target'] | null>(null);
  const focusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const revealFocusedInput = useCallback(() => {
    if (focusedInput.current !== null) {
      scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(focusedInput.current, 24, true);
    }
  }, []);

  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', revealFocusedInput);
    return () => {
      shown.remove();
      if (focusTimer.current) clearTimeout(focusTimer.current);
    };
  }, [revealFocusedInput]);

  const onInputFocus = useCallback((event: FocusEvent) => {
    focusedInput.current = event.target;
    if (focusTimer.current) clearTimeout(focusTimer.current);
    focusTimer.current = setTimeout(revealFocusedInput, 120);
  }, [revealFocusedInput]);

  return { scrollRef, onInputFocus };
}
