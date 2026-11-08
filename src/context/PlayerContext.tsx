import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import type { Song, RepeatMode, PlayerState } from '@/types/music';
import DatabaseService from '@/services/DatabaseService';
import PlayerService, { PlaybackStatus } from '@/services/PlayerService';

/* ─── Initial State ─── */
const initialState: PlayerState = {
  currentSong: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  position: 0,
  duration: 0,
  volume: 1,
  repeatMode: 'off',
  shuffleMode: 'off',
  isBuffering: false,
};

/* ─── Actions ─── */
type PlayerAction =
  | { type: 'SET_SONG'; song: Song; queue?: Song[]; index?: number }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'NEXT' }
  | { type: 'PREVIOUS' }
  | { type: 'SET_POSITION'; position: number }
  | { type: 'SET_DURATION'; duration: number }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'SET_REPEAT'; mode: RepeatMode }
  | { type: 'TOGGLE_SHUFFLE' }
  | { type: 'SET_QUEUE'; queue: Song[]; index: number }
  | { type: 'TOGGLE_FAVORITE' }
  | { type: 'SYNC_STATUS'; status: PlaybackStatus }
  | { type: 'RESTORE_LAST_PLAYED'; song: Song; position: number }
  | { type: 'CLEAR' };

/* ─── Reducer ─── */
function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'SET_SONG':
      return {
        ...state,
        currentSong: action.song,
        queue: action.queue ?? state.queue,
        queueIndex: action.index ?? 0,
        isPlaying: true,
        position: 0,
        duration: action.song.duration,
      };

    case 'TOGGLE_PLAY':
      return { ...state, isPlaying: !state.isPlaying };

    case 'PLAY':
      return { ...state, isPlaying: true };

    case 'PAUSE':
      return { ...state, isPlaying: false };

    case 'SYNC_STATUS':
      return {
        ...state,
        isPlaying: action.status.isPlaying,
        position: action.status.position,
        duration: action.status.duration || state.duration,
        isBuffering: action.status.isBuffering,
        volume: action.status.volume,
      };

    case 'RESTORE_LAST_PLAYED':
      return {
        ...state,
        currentSong: action.song,
        queue: [action.song],
        queueIndex: 0,
        isPlaying: false,
        position: action.position,
        duration: action.song.duration,
      };

    case 'NEXT': {
      if (state.repeatMode === 'one' && state.currentSong) {
        return { ...state, position: 0, isPlaying: true };
      }

      let nextIndex: number;
      if (state.shuffleMode === 'on' && state.queue.length > 1) {
        do {
          nextIndex = Math.floor(Math.random() * state.queue.length);
        } while (nextIndex === state.queueIndex);
      } else {
        nextIndex = state.queueIndex + 1;
      }

      if (nextIndex >= state.queue.length) {
        if (state.repeatMode === 'all' && state.queue.length > 0) {
          return {
            ...state,
            queueIndex: 0,
            currentSong: state.queue[0],
            position: 0,
            duration: state.queue[0].duration,
            isPlaying: true,
          };
        }
        return { ...state, isPlaying: false };
      }
      return {
        ...state,
        queueIndex: nextIndex,
        currentSong: state.queue[nextIndex],
        position: 0,
        duration: state.queue[nextIndex].duration,
        isPlaying: true,
      };
    }

    case 'PREVIOUS': {
      if (state.position > 3) {
        return { ...state, position: 0 };
      }
      const prevIndex = state.queueIndex - 1;
      if (prevIndex < 0) return { ...state, position: 0 };
      return {
        ...state,
        queueIndex: prevIndex,
        currentSong: state.queue[prevIndex],
        position: 0,
        duration: state.queue[prevIndex].duration,
        isPlaying: true,
      };
    }

    case 'SET_POSITION':
      return { ...state, position: action.position };

    case 'SET_DURATION':
      return { ...state, duration: action.duration };

    case 'SET_VOLUME':
      return { ...state, volume: Math.max(0, Math.min(1, action.volume)) };

    case 'SET_REPEAT':
      return { ...state, repeatMode: action.mode };

    case 'TOGGLE_SHUFFLE':
      return {
        ...state,
        shuffleMode: state.shuffleMode === 'off' ? 'on' : 'off',
      };

    case 'TOGGLE_FAVORITE':
      if (!state.currentSong) return state;
      return {
        ...state,
        currentSong: {
          ...state.currentSong,
          isFavorite: !state.currentSong.isFavorite,
        },
      };

    case 'SET_QUEUE':
      return { ...state, queue: action.queue, queueIndex: action.index };

    case 'CLEAR':
      return initialState;

    default:
      return state;
  }
}

/* ─── Context Type ─── */
interface PlayerContextType {
  state: PlayerState;
  dispatch: React.Dispatch<PlayerAction>;
  playSong: (song: Song, queue?: Song[], index?: number) => Promise<void>;
  togglePlay: () => Promise<void>;
  next: () => Promise<void>;
  previous: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  toggleFavorite: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextType | null>(null);

/* ─── Provider ─── */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(playerReducer, initialState);
  const stateRef = useRef<PlayerState>(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Inicializar base de datos y restaurar última canción reproducida
  useEffect(() => {
    async function init() {
      const db = DatabaseService.getInstance();
      await db.initialize();
      const last = await db.getLastPlayed();
      if (last.songId) {
        const song = await db.getSongById(last.songId);
        if (song) {
          dispatch({ type: 'RESTORE_LAST_PLAYED', song, position: last.position });
        }
      }
    }
    init();
  }, []);

  // Suscribirse a las actualizaciones reales de PlayerService
  useEffect(() => {
    const playerService = PlayerService.getInstance();

    const unsubscribe = playerService.addListener((status) => {
      dispatch({ type: 'SYNC_STATUS', status });
    });

    playerService.setOnTrackEnded(() => {
      // Avanzar automáticamente a la siguiente canción al terminar
      next();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Guardar periódicamente la posición de reproducción actual
  useEffect(() => {
    if (state.currentSong && state.isPlaying) {
      DatabaseService.getInstance().saveLastPlayed(state.currentSong.id, state.position);
    }
  }, [state.currentSong, state.isPlaying, state.position]);

  const playSong = async (song: Song, queue?: Song[], index?: number) => {
    const targetQueue = queue ?? stateRef.current.queue;
    const targetIndex = index ?? (targetQueue.length > 0 ? targetQueue.findIndex((s) => s.id === song.id) : 0);
    dispatch({ type: 'SET_SONG', song, queue: targetQueue, index: Math.max(0, targetIndex) });
    await DatabaseService.getInstance().recordPlay(song.id);
    await PlayerService.getInstance().loadSong(song);
  };

  const togglePlay = async () => {
    const playerService = PlayerService.getInstance();
    const currentState = stateRef.current;
    if (currentState.isPlaying) {
      await playerService.pause();
    } else {
      if (currentState.currentSong) {
        await playerService.play();
      }
    }
  };

  const next = async () => {
    const currentState = stateRef.current;

    // 1. Modo repetir 1 canción activa
    if (currentState.repeatMode === 'one' && currentState.currentSong) {
      await PlayerService.getInstance().seekTo(0);
      await PlayerService.getInstance().play();
      dispatch({ type: 'SET_POSITION', position: 0 });
      return;
    }

    if (!currentState.queue || currentState.queue.length === 0) {
      const allSongs = await DatabaseService.getInstance().getAllSongs();
      if (allSongs.length > 0) {
        await playSong(allSongs[0], allSongs, 0);
      }
      return;
    }

    let nextIndex: number;
    if (currentState.shuffleMode === 'on' && currentState.queue.length > 1) {
      do {
        nextIndex = Math.floor(Math.random() * currentState.queue.length);
      } while (nextIndex === currentState.queueIndex);
    } else {
      nextIndex = currentState.queueIndex + 1;
    }

    // 2. Si se llega al final de la cola o solo había 1 canción:
    if (nextIndex >= currentState.queue.length) {
      if (currentState.queue.length > 1) {
        // Reiniciar la cola automáticamente para reproducción continua
        nextIndex = 0;
      } else {
        // Si solo había 1 canción, buscar automáticamente otra de la biblioteca para que nunca se detenga
        const allSongs = await DatabaseService.getInstance().getAllSongs();
        const otherSongs = allSongs.filter((s) => s.id !== currentState.currentSong?.id);
        if (otherSongs.length > 0) {
          const autoNext = otherSongs[Math.floor(Math.random() * otherSongs.length)];
          await playSong(autoNext, allSongs);
          return;
        } else {
          nextIndex = 0;
        }
      }
    }

    const nextSong = currentState.queue[nextIndex];
    if (nextSong) {
      dispatch({
        type: 'SET_SONG',
        song: nextSong,
        queue: currentState.queue,
        index: nextIndex,
      });
      await DatabaseService.getInstance().recordPlay(nextSong.id);
      await PlayerService.getInstance().loadSong(nextSong);
    }
  };

  const previous = async () => {
    const currentState = stateRef.current;
    if (!currentState.queue || currentState.queue.length === 0) return;

    if (currentState.position > 3) {
      await PlayerService.getInstance().seekTo(0);
      dispatch({ type: 'SET_POSITION', position: 0 });
      return;
    }

    const prevIndex = currentState.queueIndex - 1;
    if (prevIndex < 0) {
      await PlayerService.getInstance().seekTo(0);
      return;
    }

    const prevSong = currentState.queue[prevIndex];
    if (prevSong) {
      dispatch({
        type: 'SET_SONG',
        song: prevSong,
        queue: currentState.queue,
        index: prevIndex,
      });
      await DatabaseService.getInstance().recordPlay(prevSong.id);
      await PlayerService.getInstance().loadSong(prevSong);
    }
  };

  const seekTo = async (position: number) => {
    dispatch({ type: 'SET_POSITION', position });
    await PlayerService.getInstance().seekTo(position);
  };

  const setVolume = async (volume: number) => {
    dispatch({ type: 'SET_VOLUME', volume });
    await PlayerService.getInstance().setVolume(volume);
  };

  const toggleRepeat = () => {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const idx = modes.indexOf(state.repeatMode);
    dispatch({ type: 'SET_REPEAT', mode: modes[(idx + 1) % modes.length] });
  };

  const toggleShuffle = () => dispatch({ type: 'TOGGLE_SHUFFLE' });

  const toggleFavorite = async () => {
    if (state.currentSong) {
      await DatabaseService.getInstance().toggleFavorite(state.currentSong.id);
    }
    dispatch({ type: 'TOGGLE_FAVORITE' });
  };

  return (
    <PlayerContext.Provider
      value={{
        state,
        dispatch,
        playSong,
        togglePlay,
        next,
        previous,
        seekTo,
        setVolume,
        toggleRepeat,
        toggleShuffle,
        toggleFavorite,
      }}>
      {children}
    </PlayerContext.Provider>
  );
}

/* ─── Hook ─── */
export function usePlayer(): PlayerContextType {
  const ctx = useContext(PlayerContext);
  if (!ctx) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return ctx;
}
