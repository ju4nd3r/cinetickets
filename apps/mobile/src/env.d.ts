/// <reference types="jest" />

declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_API_URL?: string;
    NODE_ENV?: string;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};
