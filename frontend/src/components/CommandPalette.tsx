import { useEffect, useState } from "react";
import type { KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { fetchSites } from "../api/client";
import useDebouncedValue from "../hooks/useDebouncedValue";
import type { Site } from "../types/site";

// Deliberately smaller than the 300ms filter-bar debounce -- the entire
// point of a command palette is that it feels instantaneous, and 8 results
// is a small enough request that firing it slightly more eagerly doesn't
// meaningfully add request volume.
const SEARCH_DEBOUNCE_MS = 150;
const RESULT_LIMIT = 8;

interface CommandPaletteProps {
  onClose: () => void;
}

// The parent renders this only while open ({isPaletteOpen && <CommandPalette/>}),
// so every open starts from a fresh mount: blank query, empty results, and --
// critically -- a fresh debounce timer. The earlier isOpen-prop version kept
// the component mounted while hidden, and the debounced query surviving a
// close/reopen caused a brief re-fetch and flash of the *previous* search's
// results on reopen (the reset effect cleared `query`, but `debouncedQuery`
// lagged it by 150ms). Mount-on-open removes that whole class of stale-state
// bug instead of guarding against it, and it's also exactly the condition
// that makes the input's `autoFocus` reliable.
export default function CommandPalette({ onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const [results, setResults] = useState<Site[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetchSites({ search: debouncedQuery }, 1, RESULT_LIMIT)
      .then((data) => {
        if (cancelled) return;
        setResults(data.items);
        setActiveIndex(0);
      })
      .catch((err) => {
        if (cancelled) return;
        // Logged with a component tag so it's identifiable in the console
        // alongside whatever else might be logging -- not just a bare
        // "failed to fetch" with no origin.
        console.error("[CommandPalette] search failed:", err);
        setError("Couldn't load results. Is the API running?");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  function selectResult(site: Site) {
    navigate(`/sites/${site.site_code}`);
    onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      onClose();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const site = results[activeIndex];
      if (site) selectResult(site);
    }
  }

  const trimmedQuery = debouncedQuery.trim();

  return (
    <div className="command-palette-overlay" onClick={onClose}>
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Search sites"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <input
          autoFocus
          type="text"
          className="command-palette-input"
          placeholder="Search sites by name, project, or code…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="command-palette-results" role="listbox">
          {error && <p className="command-palette-message error-note">{error}</p>}

          {!error && !trimmedQuery && (
            <p className="command-palette-message">Type to search all sites.</p>
          )}

          {!error && trimmedQuery && isLoading && results.length === 0 && (
            <p className="command-palette-message">Searching…</p>
          )}

          {!error && trimmedQuery && !isLoading && results.length === 0 && (
            <p className="command-palette-message">No sites match &quot;{trimmedQuery}&quot;.</p>
          )}

          {!error &&
            results.map((site, index) => (
              <button
                key={site.site_code}
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                data-site-code={site.site_code}
                className={`command-palette-result${index === activeIndex ? " is-active" : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectResult(site)}
              >
                <span className="command-palette-result-title">{site.title ?? site.site_code}</span>
                <span className="command-palette-result-meta">
                  {site.project_title ?? "—"} · {site.stage ?? "—"}
                </span>
              </button>
            ))}
        </div>

        <div className="command-palette-hint">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
