import { useState } from "react";
import { useDebouncedValue, useLocationSearch } from "../api/hooks";
import type { Location } from "../api/types";

const EXAMPLES = ["Ericeira", "Chamonix", "Reykjavik", "Queenstown"];

function subtitle(location: Location): string {
  return [location.region, location.country].filter(Boolean).join(", ");
}

const population = new Intl.NumberFormat("en", { notation: "compact" });

type Props = {
  selected: Location | null;
  onSelect: (location: Location) => void;
};

export function LocationSearch({ selected, onSelect }: Props) {
  const [text, setText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const query = useDebouncedValue(text);
  const search = useLocationSearch(query);

  const options = search.data ?? [];

  function select(location: Location) {
    onSelect(location);
    setText(`${location.name}${location.region ? `, ${location.region}` : ""}`);
    setIsOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || options.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((i) => Math.min(i + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = options[highlighted];
      if (option) select(option);
    } else if (event.key === "Escape") {
      setIsOpen(false);
    }
  }

  const showDropdown = isOpen && query.trim().length >= 2;

  return (
    <div className="search">
      <input
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-label="Search a city or town"
        placeholder="Search a city or town…"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          setIsOpen(true);
          setHighlighted(0);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        onKeyDown={onKeyDown}
      />
      {showDropdown && (
        <div className="search-dropdown" role="listbox" aria-label="Matching places">
          {search.isLoading && <div className="search-note">Searching…</div>}
          {search.isError && <div className="search-note">Search failed — try again.</div>}
          {search.isSuccess && options.length === 0 && (
            <div className="search-note">No places found for “{query.trim()}”.</div>
          )}
          {options.map((option, index) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={index === highlighted}
              className={`search-option${index === highlighted ? " highlighted" : ""}`}
              onMouseEnter={() => setHighlighted(index)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => select(option)}
            >
              <span>{option.name}</span>
              <span className="search-option-meta">
                {subtitle(option)}
                {option.population ? ` · pop ${population.format(option.population)}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
      {selected === null && (
        <div className="chips">
          <span>Try:</span>
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              className="chip"
              onClick={() => {
                setText(example);
                setIsOpen(true);
                setHighlighted(0);
              }}
            >
              {example}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
