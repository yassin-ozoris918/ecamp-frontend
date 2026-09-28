import React, { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from 'react';

export const AutoDirectionInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', dir = 'auto', ...props }, ref) => {
    return <input ref={ref} dir={dir} className={className} {...props} />;
  }
);
AutoDirectionInput.displayName = 'AutoDirectionInput';

export const AutoDirectionTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', dir = 'auto', ...props }, ref) => {
    return <textarea ref={ref} dir={dir} className={className} {...props} />;
  }
);
AutoDirectionTextarea.displayName = 'AutoDirectionTextarea';
