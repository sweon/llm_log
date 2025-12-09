/**
 * Storage module for LLM Log application.
 * Handles CRUD operations using LocalStorage.
 */

const STORAGE_KEY = 'llm_logs_data';
const STORAGE_KEY_MODELS = 'llm_logs_models';

const DEFAULT_MODELS = [
  "GPT-4o",
  "GPT-4 Turbo",
  "Claude 3.5 Sonnet",
  "Claude 3 Opus",
  "Gemini 1.5 Pro",
  "Gemini 1.5 Flash",
  "Llama 3",
  "Other"
];

export const Storage = {
  /**
   * Get all logs, sorted by createdAt (newest first).
   * @returns {Array} List of logs.
   */
  getAll() {
    const data = localStorage.getItem(STORAGE_KEY);
    const logs = data ? JSON.parse(data) : [];
    return logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },

  /**
   * Get a specific log by ID.
   * @param {string} id 
   * @returns {Object|null} Log object or null if not found.
   */
  get(id) {
    const logs = this.getAll();
    return logs.find(log => log.id === id) || null;
  },

  /**
   * Save a log (create or update).
   * @param {Object} logData 
   * @returns {Object} The saved log object.
   */
  save(logData) {
    const logs = this.getAll();
    const now = new Date().toISOString();

    if (logData.id) {
      // Update existing
      const index = logs.findIndex(l => l.id === logData.id);
      if (index !== -1) {
        logs[index] = { ...logs[index], ...logData, updatedAt: now };
      } else {
        // Should not happen, but treat as new if ID not found
        logData.id = crypto.randomUUID();
        logData.createdAt = now;
        logData.updatedAt = now;
        logs.unshift(logData);
      }
    } else {
      // Create new
      logData.id = crypto.randomUUID();
      logData.createdAt = now;
      logData.updatedAt = now;
      logs.unshift(logData);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    return logData.id ? this.get(logData.id) : logData; // Return updated object
  },

  /**
   * Delete a log by ID.
   * @param {string} id 
   */
  delete(id) {
    let logs = this.getAll();
    logs = logs.filter(log => log.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  },

  /**
   * Search logs by query and sort.
   * @param {string} query 
   * @param {string} sortBy - 'date', 'title', 'model'
   * @returns {Array} Filtered and sorted logs.
   */
  search(query, sortBy = 'date') {
    let logs = this.getAll();

    // Filter
    if (query) {
      const lowerQuery = query.toLowerCase();

      if (lowerQuery.startsWith('tag:')) {
        // Tag-specific search (exact match within tags)
        const tagQuery = lowerQuery.replace('tag:', '').trim();
        logs = logs.filter(log =>
          log.tags && log.tags.some(tag => tag.toLowerCase() === tagQuery)
        );
      } else {
        // General search
        logs = logs.filter(log => {
          return (
            (log.title && log.title.toLowerCase().includes(lowerQuery)) ||
            (log.content && log.content.toLowerCase().includes(lowerQuery)) ||
            (log.model && log.model.toLowerCase().includes(lowerQuery)) ||
            (log.tags && log.tags.some(tag => tag.toLowerCase().includes(lowerQuery)))
          );
        });
      }
    }

    // Sort
    logs.sort((a, b) => {
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '');
      } else if (sortBy === 'model') {
        return (a.model || '').localeCompare(b.model || '');
      } else {
        // Default: Date desc
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return logs;
  },

  /**
   * Export all logs as JSON string.
   * @returns {string} JSON string of all logs.
   */
  export() {
    return JSON.stringify(this.getAll(), null, 2);
  },

  /**
   * Import logs from JSON string.
   * Merges with existing logs. Overwrites if ID exists.
   * @param {string} jsonString 
   * @returns {number} Number of logs imported.
   */
  import(jsonString) {
    try {
      const importedLogs = JSON.parse(jsonString);
      if (!Array.isArray(importedLogs)) throw new Error('Invalid format');

      const currentLogs = this.getAll();
      const logMap = new Map(currentLogs.map(log => [log.id, log]));

      importedLogs.forEach(log => {
        if (log.id && log.createdAt) {
          logMap.set(log.id, log);
        }
      });

      const mergedLogs = Array.from(logMap.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedLogs));
      return importedLogs.length;
    } catch (e) {
      console.error('Import failed', e);
      return 0;
    }
  },

  /**
   * Get the list of models.
   * @returns {Array} List of model names.
   */
  getModels() {
    const data = localStorage.getItem(STORAGE_KEY_MODELS);
    return data ? JSON.parse(data) : DEFAULT_MODELS;
  },

  /**
   * Save the list of models.
   * @param {Array} models 
   */
  saveModels(models) {
    localStorage.setItem(STORAGE_KEY_MODELS, JSON.stringify(models));
  }
};
