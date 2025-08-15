
import React from 'react';
import { GameStatus } from '../types';
import { Repeat, ArrowRight } from 'lucide-react';

interface GamePanelProps {
  gameStatus: GameStatus;
  imageUrl: string;
  error: string | null;
  loadingMessage: string;
  onStartNewGame: () => void;
}

const GamePanel: React.FC<GamePanelProps> = ({
  gameStatus,
  imageUrl,
  error,
  loadingMessage,
  onStartNewGame,
}) => {
  const showInitialOverlay = gameStatus === GameStatus.IDLE || gameStatus === GameStatus.LOADING;
  const showImage = gameStatus === GameStatus.PLAYING || gameStatus === GameStatus.WON || gameStatus === GameStatus.LOST;

  return (
    <div className="w-full h-full flex justify-center items-center bg-black rounded-lg relative shadow-2xl shadow-blue-500/10 overflow-hidden border border-neutral-800">
      
      {showImage && imageUrl && (
        <img 
          src={imageUrl} 
          alt="A pictionary image representing a movie title" 
          className="max-w-full max-h-full object-contain aspect-square animate-fade-in"
        />
      )}
      
      {showInitialOverlay && (
        <div className="absolute inset-0 z-30 flex justify-center items-center bg-black">
          {gameStatus === GameStatus.IDLE && (
            <div className="text-center text-neutral-500 flex flex-col items-center gap-4 p-4">
              {error ? (
                <>
                  <p className="text-white max-w-sm">{error}</p>
                  <button onClick={onStartNewGame} className="mt-4 h-10 px-6 flex items-center justify-center gap-2 bg-transparent border border-neutral-400 text-white rounded-md hover:bg-neutral-800 transition-colors">
                    <Repeat className="w-5 h-5" />
                    <span>Try Again</span>
                  </button>
                </>
              ) : (
                <button onClick={onStartNewGame} className="h-12 px-6 flex items-center justify-center gap-3 bg-transparent border border-neutral-400 text-white rounded-md hover:bg-neutral-800 transition-colors">
                  <ArrowRight className="w-5 h-5" />
                  <span>Start game</span>
                </button>
              )}
            </div>
          )}
          {gameStatus === GameStatus.LOADING && (
            <div className="text-center text-white flex flex-col items-center gap-4">
              {loadingMessage === 'thinking' ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-5xl animate-spin-slow">💭</span>
                  <p className="text-3xl animate-pulse">Thinking...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-5xl animate-spin-slow">🖼️</span>
                  <p className="text-3xl animate-pulse">Generating...</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GamePanel;