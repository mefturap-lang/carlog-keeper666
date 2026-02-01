import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Info, Check, AlertCircle } from "lucide-react";
import { getDTCDescription, searchDTCCodes, DTCCode } from "@/utils/dtcCodeParser";
import { cn } from "@/lib/utils";

interface DTCCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onRemove?: () => void;
  showRemove?: boolean;
  placeholder?: string;
}

const DTCCodeInput = ({
  value,
  onChange,
  onRemove,
  showRemove = true,
  placeholder = "Örn: P0420, C1234",
}: DTCCodeInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<DTCCode[]>([]);
  const [description, setDescription] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Kod değiştiğinde açıklama ve önerileri güncelle
  useEffect(() => {
    const trimmedValue = value.trim().toUpperCase();
    
    if (trimmedValue.length >= 2) {
      // Tam eşleşme varsa açıklamayı göster
      const exactDesc = getDTCDescription(trimmedValue);
      setDescription(exactDesc);
      
      // Önerileri getir (sadece focus'tayken ve yazarken)
      if (isFocused) {
        const results = searchDTCCodes(trimmedValue, 8);
        // Sadece tam eşleşme YOKSA veya başka öneriler de varsa göster
        if (!exactDesc || results.length > 1) {
          setSuggestions(results.filter(r => r.code !== trimmedValue));
        } else {
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
      }
    } else {
      setDescription(null);
      setSuggestions([]);
    }
  }, [value, isFocused]);

  // Dışarı tıklanınca önerileri kapat
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (code: string) => {
    onChange(code);
    setSuggestions([]);
    inputRef.current?.blur();
  };

  const isValidCode = description !== null;
  const showSuggestions = isFocused && suggestions.length > 0;

  return (
    <div ref={containerRef} className="space-y-1">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            className={cn(
              "font-mono pr-8",
              isValidCode && value.trim() && "border-green-500 focus-visible:ring-green-500"
            )}
          />
          {value.trim() && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              {isValidCode ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : value.trim().length >= 3 ? (
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              ) : null}
            </div>
          )}
          
          {/* Suggestions Dropdown */}
          {showSuggestions && (
            <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-auto">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.code}
                  type="button"
                  className="w-full px-3 py-2 text-left hover:bg-accent/50 transition-colors border-b border-border/50 last:border-0"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(suggestion.code)}
                >
                  <span className="font-mono font-semibold text-primary">
                    {suggestion.code}
                  </span>
                  <p className="text-xs text-muted-foreground truncate">
                    {suggestion.description}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {showRemove && onRemove && (
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Description Display */}
      {description && value.trim() && (
        <div className="flex items-start gap-2 px-2 py-1.5 bg-accent/20 rounded-md border border-accent/30">
          <Info className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
          <p className="text-xs text-foreground leading-relaxed">
            {description}
          </p>
        </div>
      )}
    </div>
  );
};

export default DTCCodeInput;
