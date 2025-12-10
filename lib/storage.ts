export type LogData = {
    id: string;
    title: string;
    model: string;
    tags: string[];
    content: string;
    createdAt: string;
    updatedAt: string;
    comments?: Comment[];
};

export type Comment = {
    id: string;
    text: string;
    createdAt: string;
};

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

// Helper to check for window/localStorage availability
const isClient = typeof window !== 'undefined';

export const Storage = {
    getAll(): LogData[] {
        if (!isClient) return [];
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            const logs: LogData[] = data ? JSON.parse(data) : [];
            return logs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        } catch (e) {
            console.error("Failed to parse logs", e);
            return [];
        }
    },

    get(id: string): LogData | null {
        const logs = this.getAll();
        return logs.find(log => log.id === id) || null;
    },

    save(logData: Partial<LogData>): LogData {
        if (!isClient) throw new Error("Cannot save on server");

        const logs = this.getAll();
        const now = new Date().toISOString();

        let savedLog: LogData;

        if (logData.id) {
            // Update
            const index = logs.findIndex(l => l.id === logData.id);
            if (index !== -1) {
                logs[index] = {
                    ...logs[index],
                    ...logData,
                    updatedAt: now
                } as LogData;
                savedLog = logs[index];
            } else {
                // Treat as new if ID not found (fallback)
                savedLog = {
                    ...logData,
                    id: crypto.randomUUID(),
                    createdAt: now,
                    updatedAt: now,
                    comments: logData.comments || []
                } as LogData;
                logs.unshift(savedLog);
            }
        } else {
            // New
            savedLog = {
                ...logData,
                id: crypto.randomUUID(),
                model: logData.model || '',
                title: logData.title || '',
                content: logData.content || '',
                tags: logData.tags || [],
                createdAt: now,
                updatedAt: now,
                comments: []
            } as LogData;
            logs.unshift(savedLog);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
        return savedLog;
    },

    delete(id: string) {
        if (!isClient) return;
        let logs = this.getAll();
        logs = logs.filter(log => log.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    },

    search(query: string, sortBy: 'date' | 'title' | 'model' = 'date'): LogData[] {
        let logs = this.getAll();

        if (query) {
            const lowerQuery = query.toLowerCase();
            if (lowerQuery.startsWith('tag:')) {
                const tagQuery = lowerQuery.replace('tag:', '').trim();
                logs = logs.filter(log =>
                    log.tags && log.tags.some(tag => tag.toLowerCase() === tagQuery)
                );
            } else {
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

        logs.sort((a, b) => {
            if (sortBy === 'title') {
                return (a.title || '').localeCompare(b.title || '');
            } else if (sortBy === 'model') {
                return (a.model || '').localeCompare(b.model || '');
            } else {
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            }
        });

        return logs;
    },

    export(): string {
        return JSON.stringify(this.getAll(), null, 2);
    },

    import(jsonString: string): number {
        if (!isClient) return 0;
        try {
            const importedLogs = JSON.parse(jsonString);
            if (!Array.isArray(importedLogs)) throw new Error('Invalid format');

            const currentLogs = this.getAll();
            const logMap = new Map(currentLogs.map(log => [log.id, log]));

            importedLogs.forEach((log: LogData) => {
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

    getModels(): string[] {
        if (!isClient) return DEFAULT_MODELS;
        const data = localStorage.getItem(STORAGE_KEY_MODELS);
        return data ? JSON.parse(data) : DEFAULT_MODELS;
    },

    saveModels(models: string[]) {
        if (!isClient) return;
        localStorage.setItem(STORAGE_KEY_MODELS, JSON.stringify(models));
    }
};
