import React from 'react';

interface BiDiTextProps<T extends React.ElementType = 'div'> {
  text: string | null | undefined;
  className?: string;
  as?: T;
}

/**
 * BiDiText handles rendering mixed Arabic and English content correctly.
 * It parses the text to identify LTR tokens (English words, numbers, and surrounding neutral punctuation)
 * and isolates them using <bdi dir="ltr"> to prevent BiDi reordering issues (like flipped parentheses).
 * The container itself is dir="auto" to match the primary language, with textAlign="start".
 */
export function BiDiText<T extends React.ElementType = 'div'>({ 
  text, 
  className = '', 
  as
}: BiDiTextProps<T> & Omit<React.ComponentPropsWithoutRef<T>, 'as' | 'children'>) {
  if (!text) return null;

  const Component = as || 'div';

  // Matches an LTR block: optional opening brackets -> LTR word -> optional middle symbols + LTR word -> optional closing brackets
  const LTR_REGEX = /(?:[([{<]\s*)?(?:[a-zA-Z0-9]+[+#%]*(?:[-_.,:;/'"+\s]+[a-zA-Z0-9]+[+#%]*)*)(?:\s*[)\]}>])?/g;

  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = LTR_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, match.index), isLtr: false });
    }
    parts.push({ text: match[0], isLtr: true });
    lastIndex = LTR_REGEX.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isLtr: false });
  }

  return (
    <Component 
      dir="auto" 
      className={className} 
      style={{ unicodeBidi: 'plaintext', textAlign: 'start' }}
    >
      {parts.map((part, index) => 
        part.isLtr ? (
          <bdi key={index} dir="ltr">{part.text}</bdi>
        ) : (
          <React.Fragment key={index}>{part.text}</React.Fragment>
        )
      )}
    </Component>
  );
}
