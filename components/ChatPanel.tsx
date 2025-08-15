import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { ChatMessage, Role, GameStatus } from '../types';
import { createChat } from '../services/geminiService';
import type { Chat, GenerateContentResponse } from '@google/genai';
import { ChevronRight, RotateCcw, ArrowRight, MessageSquare } from 'lucide-react';

const GuessInput: React.FC<{
  gameStatus: GameStatus;
  answer: string;
  guessValue: string;
  isWrongGuess: boolean;
  onGuessChange: (value: string) => void;
}> = ({ gameStatus, answer, guessValue, isWrongGuess, onGuessChange }) => {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const answerSanitized = answer.replace(/\s/g, '');
  const answerSanitizedLength = answerSanitized.length;
  const isDisabled = gameStatus === GameStatus.IDLE || gameStatus === GameStatus.LOADING || gameStatus === GameStatus.WON || gameStatus === GameStatus.LOST;

  // When the game becomes disabled, ensure the hidden input is blurred.
  useEffect(() => {
    if (isDisabled) {
      inputRef.current?.blur();
    }
  }, [isDisabled]);

  const handleInputFocus = useCallback(() => {
    setIsFocused(true);
    // On mobile, the virtual keyboard can cover the input.
    // This ensures the guess area scrolls into view when it's focused.
    // We use a timeout to allow the keyboard animation to start and the
    // viewport to resize before scrolling.
    setTimeout(() => {
      containerRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'center', // Use 'center' to ensure the element is visible above the mobile keyboard.
      });
    }, 300);
  }, []);

  const handleInputBlur = useCallback(() => {
    setIsFocused(false);
  }, []);
  
  // This new handler simplifies logic by treating the hidden input
  // as a standard controlled component. It fixes an issue where backspace
  // did not work on some mobile keyboards because the input field was always empty.
  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    if (isDisabled || isWrongGuess) return;

    const rawValue = e.currentTarget.value;
    const sanitizedValue = rawValue.replace(/[^a-zA-Z0-9]/g, '');
    const truncatedValue = sanitizedValue.slice(0, answerSanitizedLength);
    
    // Update the state with the sanitized and truncated value.
    onGuessChange(truncatedValue);
  };


  // When the user clicks our custom component, focus the hidden input
  const handleContainerClick = () => {
    if (!isDisabled) {
      inputRef.current?.focus();
    }
  };

  const renderInputArea = () => {
    const isInitialState = gameStatus === GameStatus.IDLE || gameStatus === GameStatus.LOADING;
    if (isInitialState) {
      const borderColors = ['border-neutral-700', 'border-neutral-800', 'border-neutral-900'];
      return (
        <div className="flex justify-start items-center flex-wrap gap-x-1 gap-y-2">
          {[...Array(3)].map((_, index) => (
            <div key={index} className={`w-7 h-9 md:w-8 md:h-10 rounded-md border bg-black ${borderColors[index]}`} />
          ))}
        </div>
      );
    }

    const words = answer.split(' ');
    let cumulativeCharIndex = -1;

    return (
      <div className="flex justify-start items-center flex-wrap gap-y-2">
        {words.map((word, wordIndex) => {
          if (word === '') return null;
          return (
            <div key={wordIndex} className="flex items-center gap-x-1 mr-5 last:mr-0">
              {word.split('').map((char, charIndex) => {
                cumulativeCharIndex++;
                const guessCharIndex = cumulativeCharIndex;

                let charToShow = '';
                if (gameStatus === GameStatus.WON || gameStatus === GameStatus.LOST) {
                  charToShow = char;
                } else if (guessValue[guessCharIndex]) {
                  charToShow = guessValue[guessCharIndex];
                }

                const isCurrent = isFocused && guessValue.length === guessCharIndex && gameStatus === GameStatus.PLAYING && !isWrongGuess;
                
                let stateClasses = "border-neutral-700 text-white";
                if (gameStatus === GameStatus.WON) {
                  stateClasses = "border-green-500 text-green-300";
                } else if (isWrongGuess) {
                  stateClasses = "border-red-500 text-red-300 animate-shake";
                } else if (isCurrent) {
                  stateClasses = "border-blue-500 text-white";
                } else if(isDisabled) {
                  stateClasses = "border-neutral-800 bg-black";
                }

                return (
                  <div key={charIndex} className={`w-7 h-9 md:w-8 md:h-10 text-lg flex items-center justify-center rounded-md border transition-all duration-300 relative ${stateClasses}`}>
                    {charToShow.toUpperCase()}
                  </div>
                );
              })}
            </div>
          )
        })}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="w-full flex flex-col items-start justify-center" data-testid="guess-input-container">
      <div 
        className={`relative w-full ${isDisabled ? 'cursor-not-allowed' : 'cursor-text'} outline-none`} 
        onClick={handleContainerClick} 
        role="textbox" 
        tabIndex={isDisabled ? -1 : 0}
        onFocus={handleContainerClick} // Ensure focus is delegated to hidden input
        aria-label={`Guess input. ${isFocused ? 'Selected.' : ''}`}
      >
        <input
            ref={inputRef}
            type="text"
            value={guessValue}
            onInput={handleInput}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                border: 'none',
                padding: 0,
                margin: 0,
                color: 'transparent',
                backgroundColor: 'transparent',
                caretColor: 'transparent',
                pointerEvents: 'none',
            }}
            // Prevent mobile keyboards from trying to be "smart"
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            aria-hidden="true"
            tabIndex={-1} // Not reachable with Tab key
        />
        {renderInputArea()}
      </div>
    </div>
  );
};


interface ChatPanelProps {
  gameStatus: GameStatus;
  answer: string;
  guessValue: string;
  isWrongGuess: boolean;
  timeLeft: number;
  score: number;
  onGuessChange: (value: string) => void;
  onNextGame: () => void;
  onResetGame: () => void;
}

export interface ChatPanelRef {
  reset: () => void;
  sendGameEvent: (event: { forUser?: string; forAI?: string }) => Promise<void>;
  sendSystemContext: (context: string) => Promise<void>;
}

const MessageContent: React.FC<{ content: string }> = ({ content }) => {
  return (
    <div className="max-w-full break-words rounded-md text-white text-lg whitespace-pre-wrap">
      {content}
    </div>
  );
};


const ChatPanel = forwardRef<ChatPanelRef, ChatPanelProps>((props, ref) => {
  const { gameStatus, answer, guessValue, isWrongGuess, timeLeft, score, onGuessChange, onNextGame, onResetGame } = props;
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: Role.MODEL, content: "Hi! 👋 I'll think of a movie and create an image of it. You guess what it is. Ready?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatRef.current = createChat();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleReset = useCallback(() => {
    setMessages([
        { role: Role.MODEL, content: "Hi! 👋 I'll think of a movie and create an image of it. You guess what it is. Ready?" }
    ]);
    setInput('');
    setIsLoading(false);
    chatRef.current = createChat();
  }, []);
  
  const sendMessage = useCallback(async (message: string, isUserMessage: boolean = false): Promise<void> => {
    if (isLoading || !chatRef.current) return;

    setIsLoading(true);
    if (isUserMessage) {
        setInput('');
        setMessages(prev => [...prev, { role: Role.USER, content: message }]);
    }
    
    try {
      const response: GenerateContentResponse = await chatRef.current.sendMessage({ message });
      const responseText = response.text;
      if (responseText && responseText.trim()) {
        setMessages(prev => [...prev, { role: Role.MODEL, content: responseText }]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = error instanceof Error ? error.message : "Sorry, I encountered an error.";
      setMessages(prev => [...prev, { role: Role.SYSTEM, content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  const sendGameEvent = useCallback(async (event: { forUser?: string; forAI?: string }) => {
    if (event.forUser) {
        setMessages(prev => [...prev, { role: Role.GAME_EVENT, content: event.forUser }]);
    }
    if (event.forAI) {
        await sendMessage(event.forAI, false);
    }
  }, [sendMessage]);
  
  const sendSystemContext = useCallback(async (context: string) => {
    if (!chatRef.current) return;
    try {
      // This sends a message to the AI but does not add it to the visible chat history
      await chatRef.current.sendMessage({ message: context });
    } catch (error) {
      console.error("Error sending system context to AI:", error);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    reset: handleReset,
    sendGameEvent: sendGameEvent,
    sendSystemContext: sendSystemContext,
  }), [handleReset, sendGameEvent, sendSystemContext]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      sendMessage(input.trim(), true);
    }
  };

  const handleClue = () => {
    if (!isLoading && gameStatus === GameStatus.PLAYING) {
      sendMessage("give me a clue", true);
    }
  };

  const renderNextButton = () => {
    return (
      <div className="w-full">
          <button onClick={onNextGame} className="h-12 w-full px-6 flex items-center justify-center gap-3 bg-transparent border border-neutral-600 text-white rounded-md hover:bg-neutral-800 transition-colors">
            <ArrowRight className="w-5 h-5" />
            <span>Next</span>
          </button>
      </div>
    );
  }
  
  const renderClueButton = () => (
    <button
      type="button"
      onClick={handleClue}
      disabled={isLoading || gameStatus !== GameStatus.PLAYING}
      className="h-12 w-full px-6 flex items-center justify-center gap-3 bg-transparent border border-neutral-600 text-white rounded-md hover:enabled:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      <MessageSquare className="w-5 h-5" />
      <span>Give me a clue</span>
    </button>
  );

  const isGameOver = gameStatus === GameStatus.WON || gameStatus === GameStatus.LOST;
  const isInputAreaDisabled = gameStatus === GameStatus.IDLE || isGameOver || gameStatus === GameStatus.LOADING;


  return (
    <div className="flex flex-col h-full bg-black">
      {/* Scrollable chat messages */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-4 min-h-0">
        {messages.map((msg, index) => {
           if (msg.role === Role.SYSTEM) {
            return ( <div key={index} className="text-center text-red-400 text-sm p-2">{msg.content}</div> );
          }

          if (msg.role === Role.GAME_EVENT) {
            return ( <div key={index} className="text-center text-neutral-500 text-sm py-2">{msg.content}</div> );
          }

          const containerClasses = `flex flex-col ${msg.role === Role.USER ? 'items-end' : 'items-start w-full'}`;
          const contentClasses = `max-w-full break-words rounded-md ${msg.role === Role.MODEL ? 'text-white w-full' : 'text-white text-lg'}`;

          return (
            <div key={index} className={containerClasses}>
                <div className={contentClasses}>
                    {msg.role === Role.MODEL ? <MessageContent content={msg.content} /> : msg.content}
                </div>
            </div>
          );
        })}
        {isLoading && (
           <div className="flex items-start">
             <div className="text-lg text-white animate-pulse">...</div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Fixed input area */}
      <div className="flex-shrink-0 flex flex-col gap-3 px-4 pt-3 pb-4 border-t border-neutral-700">
        <div className="flex justify-between items-baseline w-full">
            <div className={`transition-colors text-xs uppercase tracking-wider ${isInputAreaDisabled ? 'text-neutral-600' : 'text-neutral-400'}`}>
                Guess the movie
            </div>
            <div className="flex items-center gap-3 font-mono text-sm">
              <span className={`text-neutral-400 transition-opacity duration-300 ${gameStatus === GameStatus.PLAYING ? 'opacity-100' : 'opacity-0'}`} title="Time Left">
                {`0:${timeLeft.toString().padStart(2, '0')}`}
              </span>
              <span className={`text-green-400 transition-opacity duration-300 ${(gameStatus !== GameStatus.IDLE || score > 0) ? 'opacity-100' : 'opacity-0'}`} title="Correct Guesses">
                {score}
              </span>
            </div>
        </div>

        <GuessInput 
          gameStatus={gameStatus}
          answer={answer}
          guessValue={guessValue}
          isWrongGuess={isWrongGuess}
          onGuessChange={onGuessChange}
        />
        
        {isGameOver && renderNextButton()}

        {!isGameOver && renderClueButton()}

        <form onSubmit={handleSubmit} className="flex items-center gap-2 flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send message..."
            disabled={isLoading}
            className="flex-grow h-10 px-3 bg-transparent border border-neutral-600 rounded-md focus:outline-none focus:border-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="h-10 w-10 flex-shrink-0 flex items-center justify-center bg-transparent border border-neutral-600 rounded-md hover:enabled:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Send message"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
          <button
            type="button"
            onClick={onResetGame}
            disabled={isLoading}
            className="h-10 w-10 flex-shrink-0 flex items-center justify-center bg-transparent border border-neutral-600 text-white rounded-md hover:enabled:bg-neutral-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Restart game"
            title="Restart Game"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
});

export default ChatPanel;