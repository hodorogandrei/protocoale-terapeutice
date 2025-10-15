'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Clock, TrendingUp, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'

interface SearchSuggestion {
  id: string
  code: string
  title: string
  dci?: string
  type: 'protocol' | 'specialty'
}

interface AdvancedSearchBarProps {
  placeholder?: string
  className?: string
  showHistory?: boolean
  autoFocus?: boolean
}

const SEARCH_HISTORY_KEY = 'protocol_search_history'
const MAX_HISTORY_ITEMS = 10

export function AdvancedSearchBar({
  placeholder = 'Caută după protocol, medicament sau boală...',
  className,
  showHistory = true,
  autoFocus = false
}: AdvancedSearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)

  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)

  // Load search history from localStorage
  useEffect(() => {
    if (showHistory && typeof window !== 'undefined') {
      const savedHistory = localStorage.getItem(SEARCH_HISTORY_KEY)
      if (savedHistory) {
        try {
          setHistory(JSON.parse(savedHistory))
        } catch (e) {
          console.error('Failed to parse search history', e)
        }
      }
    }
  }, [showHistory])

  // Save search to history
  const saveToHistory = useCallback((term: string) => {
    if (!showHistory || !term.trim()) return

    const newHistory = [
      term,
      ...history.filter(h => h !== term)
    ].slice(0, MAX_HISTORY_ITEMS)

    setHistory(newHistory)
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
  }, [history, showHistory])

  // Remove from history
  const removeFromHistory = useCallback((term: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newHistory = history.filter(h => h !== term)
    setHistory(newHistory)
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(newHistory))
  }, [history])

  // Clear all history
  const clearHistory = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setHistory([])
    localStorage.removeItem(SEARCH_HISTORY_KEY)
  }, [])

  // Fetch suggestions
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([])
      return
    }

    // Only fetch on client side
    if (typeof window === 'undefined') {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        `/api/protocols/search?q=${encodeURIComponent(query)}&limit=8`
      )

      if (response.ok) {
        const data = await response.json()
        setSuggestions(data.protocols || [])
      }
    } catch (error) {
      console.error('Failed to fetch suggestions', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (searchTerm) {
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(searchTerm)
      }, 300)
    } else {
      setSuggestions([])
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [searchTerm, fetchSuggestions])

  // Handle search submission
  const handleSearch = useCallback((term?: string) => {
    const searchQuery = term || searchTerm
    if (searchQuery.trim()) {
      saveToHistory(searchQuery.trim())
      router.push(`/protocoale?q=${encodeURIComponent(searchQuery)}`)
      setShowDropdown(false)
      setSearchTerm('')
    }
  }, [searchTerm, router, saveToHistory])

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    if (suggestion.type === 'protocol') {
      saveToHistory(suggestion.title)
      router.push(`/protocol/${suggestion.code}`)
    } else {
      handleSearch(suggestion.title)
    }
    setShowDropdown(false)
    setSearchTerm('')
  }, [router, handleSearch, saveToHistory])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const totalItems = suggestions.length + (showHistory ? history.length : 0)

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => (prev < totalItems - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => (prev > -1 ? prev - 1 : -1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (selectedIndex >= 0) {
        if (selectedIndex < history.length && showHistory && !searchTerm) {
          handleSearch(history[selectedIndex])
        } else {
          const suggestionIndex = showHistory && !searchTerm
            ? selectedIndex - history.length
            : selectedIndex
          if (suggestions[suggestionIndex]) {
            handleSuggestionClick(suggestions[suggestionIndex])
          }
        }
      } else {
        handleSearch()
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }, [selectedIndex, suggestions, history, searchTerm, showHistory, handleSearch, handleSuggestionClick])

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const showHistorySection = showHistory && history.length > 0 && !searchTerm && showDropdown
  const showSuggestionsSection = suggestions.length > 0 && searchTerm && showDropdown

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={(e) => { e.preventDefault(); handleSearch() }}>
        <div className="flex items-center space-x-3 relative">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground z-10" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              autoFocus={autoFocus}
              className="pl-12 pr-10 h-14 text-lg rounded-xl border-2 focus:border-medical-blue transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setSuggestions([])
                  inputRef.current?.focus()
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors z-10"
              >
                <X className="h-5 w-5" />
              </button>
            )}
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
                <Loader2 className="h-5 w-5 animate-spin text-medical-blue" />
              </div>
            )}
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-14 px-8 text-lg rounded-xl"
            disabled={!searchTerm.trim()}
          >
            Caută
          </Button>
        </div>
      </form>

      {/* Dropdown */}
      <AnimatePresence>
        {(showHistorySection || showSuggestionsSection) && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border-2 border-gray-100 overflow-hidden z-[60] max-h-[500px] overflow-y-auto"
          >
            {/* Search History */}
            {showHistorySection && (
              <div className="border-b border-gray-100">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>Istoric căutări</span>
                  </div>
                  <button
                    onClick={clearHistory}
                    className="text-xs text-medical-blue hover:underline"
                  >
                    Șterge tot
                  </button>
                </div>
                <div className="py-1">
                  {history.map((item, index) => (
                    <motion.div
                      key={item}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleSearch(item)}
                      className={`px-4 py-3 hover:bg-blue-50 cursor-pointer flex items-center justify-between group ${
                        selectedIndex === index ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{item}</span>
                      </div>
                      <button
                        onClick={(e) => removeFromHistory(item, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions */}
            {showSuggestionsSection && (
              <div>
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 text-sm font-medium text-gray-600">
                  <TrendingUp className="h-4 w-4" />
                  <span>Sugestii</span>
                </div>
                <div className="py-1">
                  {suggestions.map((suggestion, index) => {
                    const adjustedIndex = showHistorySection ? history.length + index : index
                    return (
                      <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`px-4 py-3 hover:bg-blue-50 cursor-pointer ${
                          selectedIndex === adjustedIndex ? 'bg-blue-50' : ''
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-1 px-2 py-0.5 bg-medical-blue/10 text-medical-blue text-xs font-mono rounded">
                            {suggestion.code}
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {suggestion.title}
                            </div>
                            {suggestion.dci && (
                              <div className="text-xs text-gray-500 mt-0.5">
                                {suggestion.dci}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
