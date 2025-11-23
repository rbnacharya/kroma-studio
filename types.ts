export interface Scene {
  id: string;
  order: number;
  description: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  videoUrl?: string;
  error?: string;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  lastModified: number;
  
  // Project State
  step: 'script' | 'character' | 'production';
  scriptPrompt: string; // The main project script/idea
  scenes: Scene[];
  characterPrompt: string;
  characterImageBase64: string | null;
  aspectRatio: '16:9' | '9:16';
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  credits: number;
  plan: 'free' | 'creator' | 'director';
}

export interface PricingTier {
  id: 'creator' | 'director';
  name: string;
  price: number;
  credits: number;
  features: string[];
  popular?: boolean;
}

export interface GeminiError extends Error {
  message: string;
}