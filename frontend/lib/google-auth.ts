import { api } from '@/lib/api';

export interface GoogleCredentialResponse {
  credential: string;
  select_by: string;
}

type GoogleAccounts = {
  accounts: {
    id: {
      initialize: (config: { client_id?: string; callback: (response: GoogleCredentialResponse) => void }) => void;
      renderButton: (element: HTMLElement | null, config: Record<string, unknown>) => void;
      prompt: () => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

export const initGoogleOAuth = (callback: (response: GoogleCredentialResponse) => void) => {
  if (typeof window === 'undefined') return;

  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  script.onload = () => {
    window.google?.accounts.id.initialize({
      client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      callback: callback,
    });
  };
  document.body.appendChild(script);
};

export const handleGoogleLogin = async (credentialResponse: GoogleCredentialResponse) => {
  const token = credentialResponse.credential;
  
  const response = await fetch(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`
  );
  
  const profile = await response.json();
  
  const userProfile = {
    email: profile.email,
    name: profile.name,
    pictureUrl: profile.picture,
    googleId: profile.sub,
  };
  
  const { data } = await api.post('/auth/google/callback', userProfile);
  return data;
};
