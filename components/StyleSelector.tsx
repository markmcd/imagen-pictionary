
import React, { useState, useEffect } from 'react';

const STYLES = [
  { value: 'wood carving', label: 'Wood Carving' },
  { value: 'pixel art', label: 'Pixel Art' },
  { value: 'claymation', label: 'Claymation' },
  { value: 'charcoal sketch', label: 'Charcoal Sketch' },
];
const CUSTOM_VALUE_KEY = 'custom-style';

interface StyleSelectorProps {
  selectedStyle: string;
  onStyleChange: (style: string) => void;
  isDisabled: boolean;
}

const StyleSelector: React.FC<StyleSelectorProps> = ({ selectedStyle, onStyleChange, isDisabled }) => {
  const [lastCustomStyle, setLastCustomStyle] = useState('');
  
  const isPredefined = STYLES.some(s => s.value === selectedStyle);

  // Keep track of the last valid custom style entered.
  // Don't save an empty string as the "last" style.
  useEffect(() => {
    if (!isPredefined && selectedStyle) {
      setLastCustomStyle(selectedStyle);
    }
  }, [selectedStyle, isPredefined]);

  const selectValue = isPredefined ? selectedStyle : CUSTOM_VALUE_KEY;

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value !== CUSTOM_VALUE_KEY) {
      onStyleChange(value);
    } else {
      // When switching to custom, restore the last custom style.
      onStyleChange(lastCustomStyle || '');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onStyleChange(e.target.value);
  };
  
  // Custom arrow SVG for the select dropdown
  const customArrow = `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`;

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <select
          value={selectValue}
          onChange={handleSelectChange}
          disabled={isDisabled}
          className="bg-neutral-800 border border-neutral-700 text-white text-xs rounded-md pl-2 pr-7 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors appearance-none"
          style={{
            backgroundImage: customArrow,
            backgroundPosition: 'right 0.5rem center',
            backgroundSize: '1em',
            backgroundRepeat: 'no-repeat',
          }}
          aria-label="Select image generation style"
        >
          {STYLES.map((style) => (
            <option key={style.value} value={style.value}>
              {style.label}
            </option>
          ))}
          <option value={CUSTOM_VALUE_KEY}>Custom...</option>
        </select>
      </div>
      
      {!isPredefined && (
        <input
          type="text"
          value={selectedStyle}
          onChange={handleInputChange}
          disabled={isDisabled}
          className="bg-neutral-800 border border-neutral-700 text-white text-xs rounded-md pl-2 pr-3 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          placeholder="Type a style..."
          aria-label="Enter custom image generation style"
        />
      )}
    </div>
  );
};

export default StyleSelector;
