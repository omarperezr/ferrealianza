import { projectId } from '../../../utils/supabase/info';

export async function authenticatedFetch(
  endpoint: string,
  options: RequestInit = {},
  accessToken: string | null
) {
  const url = `https://${projectId}.supabase.co/functions/v1${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authorization header if token exists
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || `API Error: ${response.status}`);
  }

  return data;
}
