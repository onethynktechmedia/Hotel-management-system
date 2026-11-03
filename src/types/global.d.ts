declare global {
  interface Window {
    google: {
      translate: {
        TranslateElement: any;
        InlineLayout: {
          SIMPLE: string;
          VERTICAL: string;
          HORIZONTAL: string;
        };
      };
    };
    googleTranslateElementInit: () => void;
    electronAPI?: {
      db: {
        query: (sql: string, params?: any[]) => Promise<any>;
        initialize: () => Promise<any>;
        backup: (backupPath?: string) => Promise<any>;
        restore: (restorePath?: string) => Promise<any>;
        syncToSupabase: () => Promise<any>;
        getSyncStatus: () => Promise<any>;
      };
      fs: {
        selectBackupPath: () => Promise<string | null>;
        selectRestorePath: () => Promise<string | null>;
        getAppDataPath: () => Promise<string>;
      };
      network: {
        isOnline: () => Promise<boolean>;
      };
      app: {
        getVersion: () => Promise<string>;
        getPlatform: () => Promise<string>;
      };
      print: {
        silent: (content: string) => Promise<{ success: boolean; error?: string }>;
      };
    };
  }
}

export {};
