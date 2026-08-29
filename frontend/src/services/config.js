// ============================================================
// Centralized URL Configuration
// All base URLs are read from .env / .env.production
// — Never hardcode localhost here —
// ============================================================

// Backend API base URL (for Axios calls)
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Backend media base URL (for uploaded images, videos, audio files)
export const MEDIA_BASE_URL = import.meta.env.VITE_MEDIA_BASE_URL || 'http://localhost:8000';

/**
 * Resolves a media file path (e.g. "/uploads/photo.jpg") into a full URL.
 * Handles paths that are already full URLs (http/https) safely.
 *
 * Usage:
 *   import { getMediaUrl } from '../services/config';
 *   <img src={getMediaUrl(item.media_url)} />
 */
export function getMediaUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${MEDIA_BASE_URL}${cleanPath}`;
}
