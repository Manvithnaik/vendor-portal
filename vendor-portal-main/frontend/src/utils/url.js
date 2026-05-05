/**
 * URL utilities for handling backend resource resolution.
 */

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

/**
 * Converts a relative backend path (e.g. /uploads/...) into an absolute URL.
 * If the path is already absolute (starts with http), it returns it as-is.
 * 
 * @param {string} path - The relative path or absolute URL.
 * @returns {string|null} - The resolved absolute URL.
 */
export const toAbsUrl = (path) => {
  if (!path) return null;
  
  // If it's already an absolute URL (like Supabase or external), return as-is
  if (path.startsWith('http')) return path;
  
  try {
    // Extract the origin from API_BASE (e.g., http://localhost:8000)
    // We remove /api/v1 to get the root where /uploads is mounted
    const url = new URL(API_BASE);
    const origin = url.origin;
    
    return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
  } catch (e) {
    console.error('Error resolving absolute URL:', e);
    return path;
  }
};
