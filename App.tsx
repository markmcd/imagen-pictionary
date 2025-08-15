
import React, { useRef, useCallback, useState, useEffect } from 'react';
import ChatPanel, { ChatPanelRef } from './components/ChatPanel';
import GamePanel from './components/GamePanel';
import AboutModal from './components/AboutModal';
import { GameStatus } from './types';
import { getNewGameData } from './services/geminiService';
import { playCorrectSound, playGameOverSound, playWrongGuessSound, initAudio, playDrawingReadySound } from './services/soundService';
import { HelpCircle } from 'lucide-react';
import StyleSelector from './components/StyleSelector';

const ROUND_TIME = 30;

// Header component moved outside of App to prevent re-creation on every render.
// This fixes the input focus loss bug in StyleSelector.
const Header = ({ imageStyle, onStyleChange, gameStatus, onAboutClick }: {
  imageStyle: string;
  onStyleChange: (style: string) => void;
  gameStatus: GameStatus;
  onAboutClick: () => void;
}) => (
  <>
    <div className="px-4 pt-4 pb-3 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-sm text-white uppercase tracking-widest">Image Pictionary</h1>
        <StyleSelector 
          selectedStyle={imageStyle}
          onStyleChange={onStyleChange}
          isDisabled={gameStatus === GameStatus.PLAYING || gameStatus === GameStatus.LOADING}
        />
      </div>
      <button
        onClick={onAboutClick}
        className="text-neutral-400 hover:text-white transition-colors"
        aria-label="About this app"
        title="About this app"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
    </div>
    <hr className="border-neutral-700 w-full" />
  </>
);


const App: React.FC = () => {
  const chatPanelRef = useRef<ChatPanelRef>(null);
  const appContainerRef = useRef<HTMLDivElement>(null);
  const [pastConcepts, setPastConcepts] = useState<string[]>([]);

  // Game state lifted from GamePanel and centralized here
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.IDLE);
  const [imageUrl, setImageUrl] = useState<string>(''); // Changed from p5Code
  const [imageStyle, setImageStyle] = useState('pixel art');
  const [answer, setAnswer] = useState<string>('');
  const [explanation, setExplanation] = useState<string>('');
  const [guessValue, setGuessValue] = useState<string>('');
  const [isWrongGuess, setIsWrongGuess] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  
  // State for pre-fetching next round
  const [prefetchedGameData, setPrefetchedGameData] = useState<any | null>(null);
  const nextGamePromiseRef = useRef<Promise<any> | null>(null);

  // New ref to track game rounds and prevent race conditions
  const roundIdRef = useRef(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMounted = useRef(true);
  const isInitialMount = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      cleanupTimer();
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (appContainerRef.current) {
        appContainerRef.current.style.height = `${window.innerHeight}px`;
      }
    };
    handleResize(); // Set initial height
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // This effect keeps the AI updated on the score and level.
  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return; // Skips the very first app load before any game is started.
    }

    if (chatPanelRef.current) {
        // Send an invisible message to the AI with the current stats.
        const contextForAI = `Game Context Update: The user's score is now ${score}, and they are on Level ${level}.`;
        chatPanelRef.current.sendSystemContext(contextForAI);
    }
  }, [score, level]); // Only depends on score and level changes

  // This effect invalidates prefetched data if the style changes.
  useEffect(() => {
    if (prefetchedGameData || nextGamePromiseRef.current) {
      setPrefetchedGameData(null);
      nextGamePromiseRef.current = null;
    }
  }, [imageStyle]);


  const cleanupTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleGameEvent = useCallback(async (event: { forUser?: string; forAI?: string }) => {
    if (chatPanelRef.current) {
      await chatPanelRef.current.sendGameEvent(event);
    }
  }, []);

  const handleCorrectGuess = useCallback(async () => {
    if (gameStatus !== GameStatus.PLAYING) return;
    setGameStatus(GameStatus.WON);
    playCorrectSound();
    cleanupTimer();

    const newScore = score + 1;
    setScore(newScore);

    const oldLevel = level;
    const newLevel = Math.floor(newScore / 5) + 1;
    
    // Display "Correct" message to user immediately
    await handleGameEvent({ forUser: '✅ Correct.' });
    
    let aiCongratulation = "";
    if (newLevel > oldLevel) {
        setLevel(newLevel);
        // Display level up message to user immediately
        await handleGameEvent({ forUser: `⭐️ You've reached Level ${newLevel}!` });
        aiCongratulation = ` The user also just reached Level ${newLevel}! After explaining the image, congratulate them in a fun, celebratory way about this achievement.`;
    }

    const eventForAI = `Game Event: User guessed correctly. The answer was "${answer}". Here's the explanation for the image: ${explanation}.${aiCongratulation}`;
    // Trigger the AI's full response (explanation + potential congrats)
    await handleGameEvent({ forAI: eventForAI });

  }, [answer, cleanupTimer, explanation, gameStatus, handleGameEvent, score, level]);

  const handleIncorrectGuess = useCallback(() => {
    playWrongGuessSound();
    setIsWrongGuess(true);
    setTimeout(() => {
      if (!isMounted.current) return;
      setGuessValue('');
      setIsWrongGuess(false);
    }, 1000);
  }, []);
  
  const handleTimeUp = useCallback(async () => {
    setGameStatus(GameStatus.LOST);
    playGameOverSound();
    cleanupTimer();
    const eventForUser = `Time ran out.`;
    const eventForAI = `Game Event: Time ran out. The answer was "${answer}". Here's the explanation for the image: ${explanation}`;
    await handleGameEvent({ forUser: eventForUser, forAI: eventForAI });
  }, [answer, cleanupTimer, explanation, handleGameEvent]);
  
  useEffect(() => {
    if (gameStatus === GameStatus.PLAYING && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft <= 0 && gameStatus === GameStatus.PLAYING) {
      handleTimeUp();
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [gameStatus, timeLeft, handleTimeUp]);
  
  useEffect(() => {
    if (gameStatus !== GameStatus.PLAYING || !answer || isWrongGuess) return;
    const answerSanitized = answer.replace(/\s/g, '');
    if (guessValue.length === answerSanitized.length) {
      if (guessValue.toLowerCase() === answerSanitized.toLowerCase()) {
        handleCorrectGuess();
      } else {
        handleIncorrectGuess();
      }
    }
  }, [guessValue, answer, gameStatus, handleCorrectGuess, handleIncorrectGuess, isWrongGuess]);

  const prefetchNextRound = useCallback(() => {
    // A prefetch is already in progress or completed. Do nothing.
    if (nextGamePromiseRef.current) {
        return;
    }
    
    // The concepts to exclude should include the one that just finished.
    const conceptsToExclude = answer ? [...pastConcepts, answer] : pastConcepts;

    const promise = getNewGameData(conceptsToExclude, imageStyle);
    nextGamePromiseRef.current = promise;

    promise.then(data => {
        // Only set data if this is still the current promise. Avoids race conditions.
        if (isMounted.current && nextGamePromiseRef.current === promise) {
            setPrefetchedGameData(data);
        }
    }).catch(e => {
        console.error("Failed to prefetch next round:", e);
        // If it fails, clear the ref so a new attempt can be made on next "Next" click
        if (isMounted.current && nextGamePromiseRef.current === promise) {
            nextGamePromiseRef.current = null;
        }
    });
  }, [pastConcepts, answer, imageStyle]);

  // Effect to trigger the prefetch when a round finishes.
  useEffect(() => {
    if (gameStatus === GameStatus.WON || gameStatus === GameStatus.LOST) {
        prefetchNextRound();
    }
  }, [gameStatus, prefetchNextRound]);


  const startNewGame = useCallback(async () => {
    const roundId = ++roundIdRef.current;
    if (gameStatus === GameStatus.LOADING) return;

    const wasRoundFinished = gameStatus === GameStatus.WON || gameStatus === GameStatus.LOST;
    const isFirstGame = pastConcepts.length === 0;

    setGameStatus(GameStatus.LOADING);
    setLoadingMessage('thinking');

    if (wasRoundFinished) {
        await handleGameEvent({ forUser: 'Next round.' });
    }

    initAudio();
    cleanupTimer();
    setError(null);
    setGuessValue('');
    setIsWrongGuess(false);
    setImageUrl('');

    const handleGameData = (gameData: any) => {
        if (!isMounted.current || roundIdRef.current !== roundId) return;

        setImageUrl(gameData.imageUrl);
        playDrawingReadySound();
        setAnswer(gameData.concept);
        setExplanation(gameData.explanation);
        setTimeLeft(ROUND_TIME);
        setPastConcepts(prev => [...prev, gameData.concept]);
        const eventForAI = `Game Event: I have just created an image. The concept is "${gameData.concept}". My idea for creating it was: ${gameData.explanation}. Now, please provide a short, engaging, first-person message to the user to kick off the guessing round.`;
        handleGameEvent({ forAI: eventForAI });
        setGameStatus(GameStatus.PLAYING);
    };

    if (isFirstGame) {
        await handleGameEvent({ forUser: 'Starting on Level 1.' });
    }
    const eventForAI_thinking = `Game Event: The user wants a new round. Please respond with a short message (3-6 words) saying you're thinking of a new movie to create an image for.`;
    handleGameEvent({ forAI: eventForAI_thinking });

    try {
        let promiseToAwait: Promise<any>;

        if (prefetchedGameData) {
            const data = prefetchedGameData;
            setPrefetchedGameData(null);
            nextGamePromiseRef.current = null;
            promiseToAwait = Promise.resolve(data);
        } else if (nextGamePromiseRef.current) {
            promiseToAwait = nextGamePromiseRef.current;
            nextGamePromiseRef.current = null;
        } else {
            promiseToAwait = getNewGameData(pastConcepts, imageStyle);
        }

        if (!isMounted.current || roundIdRef.current !== roundId) return;
        setLoadingMessage('generating');

        const data = await promiseToAwait;
        if (!isMounted.current || roundIdRef.current !== roundId) return;
        
        handleGameData(data);
    } catch (e) {
        if (!isMounted.current || roundIdRef.current !== roundId) {
            console.log(`Stale request error from round ${roundId} ignored.`);
            return;
        }
        console.error(e);
        setError(e instanceof Error ? e.message : "An unknown error occurred.");
        setGameStatus(GameStatus.IDLE);
        setPrefetchedGameData(null);
        nextGamePromiseRef.current = null;
    }
}, [
    gameStatus,
    cleanupTimer,
    pastConcepts,
    handleGameEvent,
    prefetchedGameData,
    imageStyle,
]);

  const handleResetGame = useCallback(() => {
    roundIdRef.current += 1;
    cleanupTimer();
    setGameStatus(GameStatus.IDLE);
    setImageUrl('');
    setAnswer('');
    setExplanation('');
    setGuessValue('');
    setIsWrongGuess(false);
    setTimeLeft(ROUND_TIME);
    setError(null);
    setLoadingMessage('');
    setPastConcepts([]);
    setScore(0);
    setLevel(1);
    if (chatPanelRef.current) {
      chatPanelRef.current.reset();
    }
  }, [cleanupTimer]);

  const handleGuessChange = useCallback((value: string) => {
    if (isWrongGuess) return;
    setGuessValue(value);
  }, [isWrongGuess]);
  
  return (
    <>
      <div ref={appContainerRef} className="bg-black text-neutral-300 flex flex-col md:flex-row items-stretch overflow-hidden">
        
        {/* Game Panel Column (Top on sm, Right on md) */}
        <div className="flex flex-col p-4 md:flex-1 order-1 md:order-2 h-1/2 md:h-full min-h-0">
           {/* Header for mobile view */}
          <div className="block md:hidden -mx-4 -mt-4 mb-4">
            <Header 
              imageStyle={imageStyle}
              onStyleChange={setImageStyle}
              gameStatus={gameStatus}
              onAboutClick={() => setIsAboutModalOpen(true)}
            />
          </div>
          <div className="flex-1 flex justify-center items-center min-h-0">
            <GamePanel
              gameStatus={gameStatus}
              imageUrl={imageUrl}
              error={error}
              loadingMessage={loadingMessage}
              onStartNewGame={startNewGame}
            />
          </div>
        </div>

        {/* Chat Panel Column (Bottom on sm, Left on md) */}
        <div className="flex flex-col md:w-[450px] flex-shrink-0 order-2 md:order-1 h-1/2 md:h-full min-h-0 border-t md:border-t-0 md:border-r border-neutral-700">
          {/* Header for desktop view */}
          <div className="hidden md:block">
            <Header
              imageStyle={imageStyle}
              onStyleChange={setImageStyle}
              gameStatus={gameStatus}
              onAboutClick={() => setIsAboutModalOpen(true)}
            />
          </div>
          <div className="flex-1 min-h-0">
              <ChatPanel
                ref={chatPanelRef}
                gameStatus={gameStatus}
                answer={answer}
                guessValue={guessValue}
                isWrongGuess={isWrongGuess}
                timeLeft={timeLeft}
                score={score}
                onGuessChange={handleGuessChange}
                onNextGame={startNewGame}
                onResetGame={handleResetGame}
              />
          </div>
        </div>

      </div>
      <AboutModal
        isOpen={isAboutModalOpen}
        onClose={() => setIsAboutModalOpen(false)}
      />
    </>
  );
};

export default App;
