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
  }
}

export {};
