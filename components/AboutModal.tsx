
import React from 'react';
import { X } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative bg-neutral-900 border border-neutral-700 rounded-lg shadow-xl max-w-md w-full p-6 md:p-8"
        onClick={(e) => e.stopPropagation()}
        role="document"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
          aria-label="Close about dialog"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="text-neutral-300 space-y-4 leading-relaxed">
            <p>
                <b>Image Pictionary</b> is a game where AI generates an image based on a movie's notable visual aspects. You can choose a suggested art style from the dropdown, or select "Custom..." to type your own. This changes how the image is rendered. I made it as a fun way to see how AI visualizes different concepts. It's a quick prototype, so it will probably break a lot.
            </p>
            <p>
                Built with Gemini 2.5 Flash and Imagen 4. Code is <a href="https://aistudio.google.com/app/prompts?state=%7B%22ids%22:%5B%221YyBklOBtlwDoyGiT9mTR7QYB1oBpSH8I%22%5D,%22action%22:%22open%22,%22userId%22:%22101358132915387811680%22,%22resourceKeys%22:%7B%7D%7D&usp=sharing" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">open-source</a>. Made by <a href="https://x.com/alexanderchen" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">@alexanderchen</a>.
            </p>
        </div>
        <div className="mt-6 text-right">
            <p className="text-xs text-neutral-600">v0.082</p>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;