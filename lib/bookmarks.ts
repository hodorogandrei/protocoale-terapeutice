/**
 * Client-side bookmark management using localStorage
 * For a production app, this should be replaced with server-side storage
 */

export interface BookmarkData {
  protocolId: string
  code: string
  title: string
  addedAt: string
}

const STORAGE_KEY = 'favoriteProtocols'

/**
 * Get all bookmarked protocol IDs
 */
export function getBookmarkedIds(): string[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const data = JSON.parse(stored) as BookmarkData[]
    return data.map((b) => b.protocolId)
  } catch (error) {
    console.error('Failed to load bookmarks:', error)
    return []
  }
}

/**
 * Get all bookmark data
 */
export function getAllBookmarks(): BookmarkData[] {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    return JSON.parse(stored) as BookmarkData[]
  } catch (error) {
    console.error('Failed to load bookmarks:', error)
    return []
  }
}

/**
 * Check if a protocol is bookmarked
 */
export function isBookmarked(protocolId: string): boolean {
  const bookmarked = getBookmarkedIds()
  return bookmarked.includes(protocolId)
}

/**
 * Add a protocol to bookmarks
 */
export function addBookmark(
  protocolId: string,
  code: string,
  title: string
): boolean {
  if (typeof window === 'undefined') return false

  try {
    const bookmarks = getAllBookmarks()

    // Check if already bookmarked
    if (bookmarks.some((b) => b.protocolId === protocolId)) {
      return false
    }

    // Add new bookmark
    const newBookmark: BookmarkData = {
      protocolId,
      code,
      title,
      addedAt: new Date().toISOString(),
    }

    bookmarks.push(newBookmark)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks))

    return true
  } catch (error) {
    console.error('Failed to add bookmark:', error)
    return false
  }
}

/**
 * Remove a protocol from bookmarks
 */
export function removeBookmark(protocolId: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    const bookmarks = getAllBookmarks()
    const filtered = bookmarks.filter((b) => b.protocolId !== protocolId)

    if (filtered.length === bookmarks.length) {
      return false // Not found
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
    return true
  } catch (error) {
    console.error('Failed to remove bookmark:', error)
    return false
  }
}

/**
 * Toggle bookmark status
 */
export function toggleBookmark(
  protocolId: string,
  code: string,
  title: string
): boolean {
  if (isBookmarked(protocolId)) {
    return removeBookmark(protocolId)
  } else {
    return addBookmark(protocolId, code, title)
  }
}

/**
 * Clear all bookmarks
 */
export function clearAllBookmarks(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear bookmarks:', error)
  }
}

/**
 * Get bookmark count
 */
export function getBookmarkCount(): number {
  return getBookmarkedIds().length
}
