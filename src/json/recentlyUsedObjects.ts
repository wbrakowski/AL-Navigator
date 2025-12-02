import * as vscode from 'vscode';

// Interface for recently used objects
export interface RecentlyUsedObject {
    id: number;
    name: string;
    type: string;
    lastUsed: number; // Timestamp
}

// Class to manage recently used objects
export class RecentlyUsedObjectsManager {
    private static readonly STORAGE_KEY = 'alNavigator.recentlyUsedObjects';
    private static readonly MAX_RECENT_OBJECTS = 10;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    // Get all recently used objects, sorted by most recent first
    getRecentlyUsedObjects(): RecentlyUsedObject[] {
        const objects = this.context.globalState.get<RecentlyUsedObject[]>(RecentlyUsedObjectsManager.STORAGE_KEY, []);
        return objects.sort((a, b) => b.lastUsed - a.lastUsed);
    }

    // Add or update a recently used object
    async addRecentlyUsedObject(id: number, name: string, type: string): Promise<void> {
        const objects = this.getRecentlyUsedObjects();

        // Remove existing entry with same ID and type (if exists)
        const filtered = objects.filter(obj => !(obj.id === id && obj.type === type));

        // Add new entry at the beginning
        const newObject: RecentlyUsedObject = {
            id,
            name,
            type,
            lastUsed: Date.now()
        };

        filtered.unshift(newObject);

        // Keep only the most recent MAX_RECENT_OBJECTS
        const trimmed = filtered.slice(0, RecentlyUsedObjectsManager.MAX_RECENT_OBJECTS);

        await this.context.globalState.update(RecentlyUsedObjectsManager.STORAGE_KEY, trimmed);
    }

    // Clear all recently used objects
    async clearRecentlyUsedObjects(): Promise<void> {
        await this.context.globalState.update(RecentlyUsedObjectsManager.STORAGE_KEY, []);
    }

    // Get formatted display string for recently used objects quick pick
    formatRecentlyUsedObject(obj: RecentlyUsedObject): string {
        const timeAgo = this.getTimeAgo(obj.lastUsed);
        return `${obj.type} ${obj.id} - ${obj.name} (${timeAgo})`;
    }

    // Calculate time ago string
    private getTimeAgo(timestamp: number): string {
        const now = Date.now();
        const diff = now - timestamp;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) {
            return 'just now';
        } else if (minutes < 60) {
            return `${minutes}m ago`;
        } else if (hours < 24) {
            return `${hours}h ago`;
        } else if (days < 7) {
            return `${days}d ago`;
        } else {
            return new Date(timestamp).toLocaleDateString();
        }
    }
}
