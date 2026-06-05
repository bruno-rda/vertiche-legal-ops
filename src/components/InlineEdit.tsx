import React, { useState, useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';
import { clsx } from 'clsx';

interface InlineEditProps {
  value: string;
  onSave: (newValue: string) => void;
  className?: string;
  inputClassName?: string;
}

export function InlineEdit({ value, onSave, className, inputClassName }: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      // Optional: select all text on focus
      // inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (currentValue.trim() !== value && currentValue.trim() !== '') {
      onSave(currentValue.trim());
    } else {
      setCurrentValue(value); // Revert if empty or unchanged
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setCurrentValue(value);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={currentValue}
        onChange={(e) => setCurrentValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={clsx(
          "px-2 py-1 border border-text-primary rounded focus:outline-none focus:ring-1 focus:ring-text-primary bg-surface",
          inputClassName || "text-sm w-full max-w-[300px]"
        )}
      />
    );
  }

  return (
    <div
      className={clsx("group flex items-center gap-2 cursor-pointer hover:bg-neutral-light px-2 py-1 -ml-2 rounded transition-colors", className)}
      onClick={() => setIsEditing(true)}
      title="Click to edit"
    >
      <span className="truncate">{value}</span>
      <Pencil className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
    </div>
  );
}
