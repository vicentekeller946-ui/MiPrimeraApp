/**
 * VicentMusic — Storage Service
 *
 * Administra el almacenamiento persistente de archivos de música en el dispositivo
 * utilizando expo-file-system.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

class StorageService {
  private static instance: StorageService;
  private musicDir: string;

  private constructor() {
    this.musicDir = `${FileSystem.documentDirectory ?? ''}music/`;
  }

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Asegura que el directorio de música exista
   */
  async ensureMusicDirectory(): Promise<string> {
    if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
      return '';
    }

    try {
      const dirInfo = await FileSystem.getInfoAsync(this.musicDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.musicDir, { intermediates: true });
      }
      return this.musicDir;
    } catch (e) {
      console.warn('[StorageService] Error creando directorio de música:', e);
      return '';
    }
  }

  /**
   * Guarda un archivo de música importado en el almacenamiento local persistente
   */
  async saveLocalAudioFile(sourceUri: string, originalFileName: string): Promise<{ localUri: string; size: number }> {
    await this.ensureMusicDirectory();

    // Sanitizar nombre de archivo
    const safeName = `${Date.now()}_${originalFileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const destinationUri = `${this.musicDir}${safeName}`;

    try {
      if (Platform.OS !== 'web') {
        await FileSystem.copyAsync({
          from: sourceUri,
          to: destinationUri,
        });

        const fileInfo = await FileSystem.getInfoAsync(destinationUri);
        const size = fileInfo.exists && !fileInfo.isDirectory ? fileInfo.size ?? 0 : 0;
        return { localUri: destinationUri, size };
      }
      return { localUri: sourceUri, size: 0 };
    } catch (error) {
      console.error('[StorageService] Error copiando archivo:', error);
      throw error;
    }
  }

  /**
   * Elimina un archivo de música del almacenamiento local
   */
  async deleteAudioFile(fileUri: string): Promise<boolean> {
    if (Platform.OS === 'web' || !fileUri) return true;

    try {
      const info = await FileSystem.getInfoAsync(fileUri);
      if (info.exists) {
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        return true;
      }
      return false;
    } catch (error) {
      console.error('[StorageService] Error eliminando archivo:', error);
      return false;
    }
  }

  /**
   * Calcula el espacio total ocupado por los archivos de música descargados e importados
   */
  async getMusicStorageUsage(): Promise<number> {
    if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
      return 1024 * 1024 * 245; // 245 MB mock para entorno web
    }

    try {
      await this.ensureMusicDirectory();
      const files = await FileSystem.readDirectoryAsync(this.musicDir);
      let totalBytes = 0;

      for (const fileName of files) {
        const fileInfo = await FileSystem.getInfoAsync(`${this.musicDir}${fileName}`);
        if (fileInfo.exists && !fileInfo.isDirectory) {
          totalBytes += fileInfo.size ?? 0;
        }
      }
      return totalBytes;
    } catch (error) {
      console.warn('[StorageService] Error calculando uso de almacenamiento:', error);
      return 0;
    }
  }

  /**
   * Obtiene la ruta al directorio de música
   */
  getMusicDirectoryPath(): string {
    return this.musicDir;
  }
}

export default StorageService;
