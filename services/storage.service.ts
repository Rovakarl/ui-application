import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  SCORES: '@pipcam:scores',
  SCORE_LIMIT: '@pipcam:scoreLimit',
  CURRENT_PLAYER: '@pipcam:currentPlayer',
  GAME_FINISHED: '@pipcam:gameFinished',
  HISTORY: '@pipcam:history',
} as const;

export interface GameScores {
  A: number;
  B: number;
  C: number;
}

export interface GameHistoryEntry {
  id: string;
  date: string;
  scores: GameScores;
  winner?: string;
  scoreLimit: number;
}

class StorageService {
  /**
   * Sauvegarde les scores actuels
   */
  async saveScores(scores: GameScores): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(scores));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des scores:', error);
      throw error;
    }
  }

  /**
   * Récupère les scores sauvegardés
   */
  async getScores(): Promise<GameScores | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SCORES);
      if (data) {
        return JSON.parse(data) as GameScores;
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération des scores:', error);
      return null;
    }
  }

  /**
   * Sauvegarde le score limite
   */
  async saveScoreLimit(limit: number): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SCORE_LIMIT, limit.toString());
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du score limite:', error);
      throw error;
    }
  }

  /**
   * Récupère le score limite sauvegardé
   */
  async getScoreLimit(): Promise<number | null> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.SCORE_LIMIT);
      return data ? parseInt(data, 10) : null;
    } catch (error) {
      console.error('Erreur lors de la récupération du score limite:', error);
      return null;
    }
  }

  /**
   * Sauvegarde le joueur actuel
   */
  async saveCurrentPlayer(player: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_PLAYER, player);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du joueur actuel:', error);
      throw error;
    }
  }

  /**
   * Récupère le joueur actuel sauvegardé
   */
  async getCurrentPlayer(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_PLAYER);
    } catch (error) {
      console.error('Erreur lors de la récupération du joueur actuel:', error);
      return null;
    }
  }

  /**
   * Sauvegarde l'état de fin de partie
   */
  async saveGameFinished(finished: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.GAME_FINISHED, finished.toString());
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de l\'état de partie:', error);
      throw error;
    }
  }

  /**
   * Récupère l'état de fin de partie
   */
  async getGameFinished(): Promise<boolean> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.GAME_FINISHED);
      return data === 'true';
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'état de partie:', error);
      return false;
    }
  }

  /**
   * Ajoute une entrée à l'historique
   */
  async addToHistory(entry: Omit<GameHistoryEntry, 'id' | 'date'>): Promise<void> {
    try {
      const history = await this.getHistory();
      const newEntry: GameHistoryEntry = {
        ...entry,
        id: Date.now().toString(),
        date: new Date().toISOString(),
      };
      history.unshift(newEntry);
      // Garder seulement les 50 dernières parties
      const limitedHistory = history.slice(0, 50);
      await AsyncStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(limitedHistory));
    } catch (error) {
      console.error('Erreur lors de l\'ajout à l\'historique:', error);
      throw error;
    }
  }

  /**
   * Récupère l'historique des parties
   */
  async getHistory(): Promise<GameHistoryEntry[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.HISTORY);
      if (data) {
        return JSON.parse(data) as GameHistoryEntry[];
      }
      return [];
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'historique:', error);
      return [];
    }
  }

  /**
   * Réinitialise tous les scores
   */
  async resetScores(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.SCORES,
        STORAGE_KEYS.CURRENT_PLAYER,
        STORAGE_KEYS.GAME_FINISHED,
      ]);
    } catch (error) {
      console.error('Erreur lors de la réinitialisation des scores:', error);
      throw error;
    }
  }

  /**
   * Réinitialise complètement toutes les données
   */
  async clearAll(): Promise<void> {
    try {
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
    } catch (error) {
      console.error('Erreur lors de la suppression de toutes les données:', error);
      throw error;
    }
  }
}

export const storageService = new StorageService();
