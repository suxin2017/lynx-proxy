import { useLocation } from '@tanstack/react-router';

/**
 * Hook to check if debug mode is enabled via URL parameter (debug=true)
 * @returns boolean indicating if debug mode is enabled
 */
export function useDebugMode(): boolean {
  // Get the current location from TanStack Router
  const location = useLocation();

  // Extract the search parameters
  const searchParams = new URLSearchParams(location.search);

  // Check if debug=true is in the URL
  const isDebugMode = searchParams.get('debug') === 'true';

  return isDebugMode;
}
