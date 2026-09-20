export interface ShareContent {
  message: string;
  title?: string;
  url?: string;
}

export type ShareResult = 'shared' | 'copied';
