
export enum Role {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system',
  GAME_EVENT = 'game_event',
}

export interface ChatMessage {
  role: Role;
  content: string;
}

export enum GameStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  PLAYING = 'playing',
  WON = 'won',
  LOST = 'lost',
}
