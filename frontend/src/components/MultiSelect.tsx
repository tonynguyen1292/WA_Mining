import { useEffect, useRef, useState } from "react";

interface MultiSelectProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
}

export default function MultiSelect({ label, options, selected, onChange }: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((value) => value !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  const buttonLabel =
    selected.length === 0
      ? `All ${label}`
      : selected.length <= 2
        ? selected.join(", ")
        : `${selected.length} ${label} selected`;

  return (
    <div className="multiselect" ref={rootRef}>
      <button
        type="button"
        className={`multiselect-trigger${selected.length > 0 ? " is-active" : ""}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
      >
        {buttonLabel}
        <span className="multiselect-caret">▾</span>
      </button>

      {isOpen && (
        <div className="multiselect-panel" role="listbox">
          {options.length === 0 ? (
            <p className="multiselect-empty">No options</p>
          ) : (
            options.map((option) => (
              <label key={option} className="multiselect-option">
                <input
                  type="checkbox"
                  checked={selected.includes(option)}
                  onChange={() => toggle(option)}
                />
                {option}
              </label>
            ))
          )}
          {selected.length > 0 && (
            <button type="button" className="multiselect-reset" onClick={() => onChange([])}>
              Clear {label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
