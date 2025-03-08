import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom'; // If using React Router
import { createPortal } from 'react-dom';
import { Search, Filter, Moon, Sun, Type, X, Copy, Link, Info, Star, HelpCircle, AlertCircle, Check } from 'lucide-react';

// Available Google fonts to select from
const availableFonts = [
  { name: "Inter", value: "'Inter', sans-serif" },
  { name: "Roboto", value: "'Roboto', sans-serif" },
  { name: "Roboto Mono", value: "'Roboto Mono', monospace" },
  { name: "Open Sans", value: "'Open Sans', sans-serif" },
  { name: "Lato", value: "'Lato', sans-serif" },
  { name: "Source Code Pro", value: "'Source Code Pro', monospace" },
  { name: "Fira Sans", value: "'Fira Sans', sans-serif" },
  { name: "Nunito", value: "'Nunito', sans-serif" }
];

// Toast notification component
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slide-down">
      <div className="bg-gray-800 text-white px-4 py-2 rounded-md shadow-lg flex items-center space-x-2">
        <Copy size={16} />
        <span>{message}</span>
      </div>
    </div>
  );
};

// Count unsupported characters in batches, off the main thread
const checkCharacterSupport = (characters, font, setUnsupportedCount) => {
  let unsupportedCount = 0;
  let index = 0;

  const processBatch = (deadline) => {
    while (index < characters.length && deadline.timeRemaining() > 0) {
      if (!isCharacterSupported(characters[index].Character, font)) {
        unsupportedCount++;
      }
      index++;
    }

    setUnsupportedCount(unsupportedCount);

    if (index < characters.length) {
      requestIdleCallback(processBatch); // Continue processing in idle time
    }
  };

  requestIdleCallback(processBatch);
};

// Helper function to count characters
// DOES NOT WORK WELL
// const isCharacterSupported = (char, font) => {
//   const canvas = document.createElement("canvas");
//   const context = canvas.getContext("2d");

//   context.font = `20px ${font}, sans-serif`;
//   const charWidth = context.measureText(char).width;

//   context.font = `20px Arial, sans-serif`; // Fallback font
//   const fallbackWidth = context.measureText(char).width;

//   return charWidth !== fallbackWidth; // If widths differ, it's supported
// };



// Main component
const UnicodeExplorer = () => {

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedBlock, setSelectedBlock] = useState('');

  useEffect(() => {
    // Debounce to avoid excessive updates
    const handler = setTimeout(() => {
      const params = new URLSearchParams();

      if (searchTerm) params.set("search", searchTerm);
      if (selectedCategory) params.set("category", selectedCategory);
      if (selectedBlock) params.set("block", selectedBlock);

      navigate(`/?${params.toString()}`, { replace: true });
    }, 300); // 300ms debounce

    return () => clearTimeout(handler); // Cleanup previous debounce
  }, [searchTerm, selectedCategory, selectedBlock, navigate]);

  // State declarations
  const [allCharacters, setAllCharacters] = useState([]);
  const [visibleCharacters, setVisibleCharacters] = useState([]);
  const [selectedChar, setSelectedChar] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [favorites, setFavorites] = useState(() => {
  // Load favorites from localStorage on initial render
    const storedFavorites = localStorage.getItem('unicodeFavorites');
    return storedFavorites ? JSON.parse(storedFavorites) : [];
  });
  const [toast, setToast] = useState(null);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const storedDarkMode = localStorage.getItem('unicodeDarkMode');
    return storedDarkMode !== null ? JSON.parse(storedDarkMode) : true; // Default to dark mode
  });
  const [selectedFont, setSelectedFont] = useState(() => {
    return localStorage.getItem('unicodeFont') || availableFonts[0].value;
  });
  const [isFontMenuOpen, setIsFontMenuOpen] = useState(false);
  const [filteredCharacters, setFilteredCharacters] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const searchInputRef = useRef(null);
  const observerRef = useRef(null);
  const loadingRef = useRef(null);

  const [buttonPosition, setButtonPosition] = useState({ top: 0, right: 0, height: 0 });
  const fontButtonRef = useRef(null);
  const isSearching = searchTerm.length > 0; // Detect if searching

  const [unsupportedCharacterCount, setUnsupportedCharacterCount] = useState(0);

  useEffect(() => {
    if (!allCharacters.length) return;
    checkCharacterSupport(allCharacters, selectedFont, setUnsupportedCharacterCount);
  }, [allCharacters, selectedFont]);

  const closeDetails = () => {
    setShowDetails(false);
    setSearchParams({}); // Clears the query parameter from the URL
  };

  // Load preferences from localStorage on initial render
  useEffect(() => {
    const storedDarkMode = localStorage.getItem('unicodeDarkMode');
    if (storedDarkMode !== null) {
      setDarkMode(JSON.parse(storedDarkMode));
    }

    const storedFont = localStorage.getItem('unicodeFont');
    if (storedFont) {
      setSelectedFont(storedFont);
    }
  }, []);

  // Check for char in query parameters and automatically open the details panel
  useEffect(() => {
    const charCode = searchParams.get('char');

    // Wait until allCharacters is loaded before checking
    if (charCode && allCharacters.length > 0) {
      const char = allCharacters.find(c => c.Codepoint === charCode);
      if (char) {
        setSelectedChar(char);
        setShowDetails(true);
      }
    }
  }, [allCharacters, searchParams]);

  useEffect(() => {
    // Reset state when the page is loaded
    setSearchTerm("");
    setSelectedCategory("");
    setSelectedBlock("");
  }, []);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('unicodeDarkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  // Save font preference
  useEffect(() => {
    localStorage.setItem('unicodeFont', selectedFont);
  }, [selectedFont]);
    
  // Update the position when the menu opens
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        isFontMenuOpen &&
        fontButtonRef.current && 
        !fontButtonRef.current.contains(event.target) &&
        !event.target.closest('.font-menu-portal') // Add this class to your portal
      ) {
        setIsFontMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFontMenuOpen]);
  
  const BATCH_SIZE = 100; // Number of characters to load at once

  // Something about accessing favorites stored in local storage
  useEffect(() => {
    localStorage.setItem('unicodeFavorites', JSON.stringify(favorites));
  }, [favorites]);
  
  // Load uploaded data when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        // Modified to use fetch instead of window.fs.readFile
        const response = await fetch('/unicode-data.json');
        const data = await response.json();
        setAllCharacters(data);
        setFilteredCharacters(data);
        setVisibleCharacters(data.slice(0, BATCH_SIZE));
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback if loading fails
        setAllCharacters([]);
        setFilteredCharacters([]);
        setVisibleCharacters([]);
      }
    };
    
    loadData();
  }, []);

  // Extract unique categories and blocks for filters
  const categories = [...new Set(allCharacters.map(char => char.Category_long))].sort();
  const blocks = [...new Set(allCharacters.map(char => char["Unicode Block"]))].sort();

  // Load more characters when user scrolls
  const loadMoreCharacters = useCallback(() => {
    if (isLoading || visibleCharacters.length >= filteredCharacters.length) return;
    
    setIsLoading(true);
    setTimeout(() => {
      const nextBatch = filteredCharacters.slice(
        visibleCharacters.length,
        visibleCharacters.length + BATCH_SIZE
      );
      
      setVisibleCharacters(prev => [...prev, ...nextBatch]);
      setIsLoading(false);
    }, 300); // Small delay to prevent too many updates
  }, [filteredCharacters, visibleCharacters, isLoading]);

  // Set up intersection observer for infinite scrolling
  useEffect(() => {
    if (loadingRef.current) {
      const options = {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      };
      
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          loadMoreCharacters();
        }
      }, options);
      
      observer.observe(loadingRef.current);
      observerRef.current = observer;
      
      return () => {
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      };
    }
  }, [loadMoreCharacters]);

  // Load preferences from localStorage on initial render
  useEffect(() => {
    // Load dark mode preference
    const storedDarkMode = localStorage.getItem('unicodeDarkMode');
    if (storedDarkMode !== null) {
      setDarkMode(JSON.parse(storedDarkMode));
    }
    
    // Load font preference
    const storedFont = localStorage.getItem('unicodeFont');
    if (storedFont) {
      setSelectedFont(storedFont);
    }
    
    // Load favorites
    const storedFavorites = localStorage.getItem('unicodeFavorites');
    if (storedFavorites) {
      setFavorites(JSON.parse(storedFavorites));
    }
  }, []);

  // Save favorites to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('unicodeFavorites', JSON.stringify(favorites));
  }, [favorites]);
  
  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('unicodeDarkMode', JSON.stringify(darkMode));
  }, [darkMode]);
  
  // Save font preference
  useEffect(() => {
    localStorage.setItem('unicodeFont', selectedFont);
  }, [selectedFont]);

  // Filter characters based on search term, category, and block
  useEffect(() => {
  if (!allCharacters.length) return;

  let filtered = [...allCharacters];

  // Apply search term filter
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    filtered = filtered.filter(char => 
      char.Character.toLowerCase().includes(searchLower) ||
      char.Name.toLowerCase().includes(searchLower) ||
      char.Codepoint.toLowerCase().includes(searchLower) ||
      (char["Alternative Names"] &&
        (typeof char["Alternative Names"] === 'string' 
          ? JSON.parse(char["Alternative Names"]).some(name => name.toLowerCase().includes(searchLower))
          : char["Alternative Names"].some(name => name.toLowerCase().includes(searchLower))
        )
      )
    );
  }

  // Apply category filter
  if (selectedCategory) {
    filtered = filtered.filter(char => char.Category_long === selectedCategory);
  }

  // Apply block filter
  if (selectedBlock) {
    filtered = filtered.filter(char => char["Unicode Block"] === selectedBlock);
  }

  // Reset `visibleCharacters` to avoid duplicates or stale data
  setFilteredCharacters(filtered);
  setVisibleCharacters(filtered.slice(0, BATCH_SIZE)); // Ensure only the correct batch is visible
}, [searchTerm, selectedCategory, selectedBlock, allCharacters]);


  // Get favorite characters
  const favoriteCharacters = allCharacters.filter(char => 
    favorites.includes(char.Codepoint)
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+/ or Cmd+/ to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Escape to close details panel or filter drawer or font menu or about panel
      if (e.key === 'Escape') {
        if (showDetails) {
          setShowDetails(false);
        } else if (isFilterDrawerOpen) {
          setIsFilterDrawerOpen(false);
        } else if (isFontMenuOpen) {
          setIsFontMenuOpen(false);
        } else if (showAbout) {
          setShowAbout(false);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDetails, isFilterDrawerOpen, isFontMenuOpen, showAbout]);

  // Toggle favorite status
  const toggleFavorite = (codepoint) => {
    setFavorites(prev => {
      const updatedFavorites = prev.includes(codepoint)
        ? prev.filter(cp => cp !== codepoint) // Remove if already favorited
        : [...prev, codepoint]; // Add if not favorited

      localStorage.setItem('unicodeFavorites', JSON.stringify(updatedFavorites)); // Save instantly
      return updatedFavorites;
    });
  };

  // Copy character to clipboard
  const copyToClipboard = (char) => {
    navigator.clipboard.writeText(char);
    setToast(`Copied: ${char}`);
  };

  // View details of a character
  const viewDetails = (char) => {
    setSelectedChar(char);
    setShowDetails(true);
    setSearchParams({ char: char.Codepoint });
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('');
    setSelectedBlock('');
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev); // Automatically saves via useEffect
  };
  
  // Toggle font menu
  const toggleFontMenu = () => {
    if (!isFontMenuOpen && fontButtonRef.current) {
      const rect = fontButtonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.bottom,
        right: rect.right,
        height: rect.height,
      });
    }
    setIsFontMenuOpen(!isFontMenuOpen);
  };

  // Select a font
  const selectFont = (font) => {
    setSelectedFont(font); // Automatically saves via useEffect
    setIsFontMenuOpen(false);
  };

  // Parse alternative names from string if needed
  const getAlternativeNames = (char) => {
    if (!char["Alternative Names"]) return [];
    
    if (typeof char["Alternative Names"] === 'string') {
      try {
        return JSON.parse(char["Alternative Names"]);
      } catch (e) {
        return [];
      }
    }
    
    return char["Alternative Names"];
  };

  // Close toast notification
  const closeToast = () => {   
    setToast(null);
  };

  // Utility function to convert text to Title Case
  const toTitleCase = (str) => 
    str.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());

  // Character Card Component
  const CharacterCard = ({ char, isFavorite, index, showActions = true }) => { return (
    <div className={`relative character-card ${isSearching ? "no-animation" : ""} ${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow`}
      style={{
        animationDelay: `${index * 8}ms`, // Staggered delay
      }}>
      <div 
        className={`flex cursor-pointer justify-center items-center h-16 sm:h-20 text-4xl ${darkMode ? 'bg-gray-900 border-b border-gray-700' : 'bg-white border-b border-gray-100'} p-2`} 
        style={{ fontFamily: selectedFont }}
        onClick={() => copyToClipboard(char.Character)}
      >
        {char.Category_long === "Separator, Space" ? (
          <span className={`inline-block border h-[0.8em] border-dashed ${darkMode ? 'bg-pink-950 border-pink-400' : 'bg-pink-50 border-pink-300'} py-1`}>{char.Character}</span>
        ) : (
          char.Character
        )}
      </div>
      {/* Flag to show whether character is supported*/}
      {/*{!isCharacterSupported(char.Character, selectedFont) && (
        <span title="This character is not supported by the selected font" className={`absolute top-1 right-1 ${darkMode ? 'bg-orange-900 text-orange-400' : 'bg-orange-200 text-orange-500'} px-1 py-1 rounded`}>
          <AlertCircle 
            size={12} 
            className=""
          />
        </span>
      )}*/}
      <div className="p-2">
        <h3 className={`text-xs sm:text-sm truncate ${darkMode ? 'text-gray-300' : 'text-gray-800'}`} title={toTitleCase(char.Name)}>
          {toTitleCase(char.Name)}
        </h3>
        <p className={`text-[9px] ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{char.Codepoint}</p>
        
        {showActions && (
          <div className="flex justify-between mt-1">
            <button
              className={`text-xs px-1 py-0.5 rounded ${darkMode ? 'text-gray-500 hover:text-indigo-400 hover:bg-indigo-800' : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-100'} transition-colors`}
              onClick={() => copyToClipboard(char.Character)}
              title="Copy to clipboard"
            >
              <Copy size={16} />
            </button>
            
            <button
              className={`text-xs px-1 py-0.5 rounded ${darkMode ? 'text-gray-500 hover:text-indigo-400 hover:bg-indigo-800' : 'text-gray-600 hover:text-indigo-600 hover:bg-indigo-100'} transition-colors`}
              onClick={() => viewDetails(char)}
              title="View details"
            >
              <Info size={16} />
            </button>
            
            <button
              className={`text-xs px-1 py-0.5 rounded transition-colors ${
                isFavorite
                  ? 'text-yellow-500 hover:text-yellow-600'
                  : darkMode ? 'text-gray-500 hover:text-yellow-500 hover:bg-yellow-900' : 'text-gray-600 hover:text-yellow-700 hover:bg-yellow-100'
              }`}
              onClick={() => toggleFavorite(char.Codepoint)}
              title={isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star size={16} fill={isFavorite ? "currentColor" : "none"} />
            </button>
          </div>
        )}
      </div>
    </div>
  )}; 

  // Main render
  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-black text-gray-100' : 'bg-gray-50 text-gray-800'}`} style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Toast notification */}
      {toast && <Toast message={toast} onClose={closeToast} />}
      
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-900' : 'bg-white'} p-3 text-white shadow-md sticky top-0 z-30`}>
        <div className="container mx-auto flex flex-col sm:flex-row justify-between items-left sm:items-center gap-3 sm:gap-2">
          <h1 className={`${darkMode ? 'text-gray-200' : 'text-gray-800'} py-1 sm:py-0 text-md sm:text-xl`}>Unicode Atlas</h1>
          
          <div className="relative w-full sm:w-1/3">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              className={`w-full pl-10 pr-4 py-1.5 rounded-lg ${darkMode ? 'bg-gray-800 text-white placeholder-gray-500 focus:ring-white' : 'bg-gray-100 text-gray-800 placeholder-gray-400 focus:ring-indigo-600'} focus:outline-none focus:ring-2`}
              placeholder="Search characters (Ctrl+/)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex justify-between sm:items-center space-x-2">
            <div>
              <button
                className={`flex h-8 items-center gap-1 px-3 py-1 rounded-lg text-sm transition-colors 
                  ${darkMode 
                    ? isFilterDrawerOpen 
                      ? 'bg-black hover:bg-gray-600' // Darker shade in dark mode
                      : 'text-gray-200 bg-gray-800 hover:bg-gray-600' 
                    : isFilterDrawerOpen 
                      ? 'bg-indigo-600 hover:bg-indigo-300 text-white hover:text-indigo-800' // Darker indigo shade
                      : 'bg-indigo-100 hover:bg-indigo-300 text-indigo-800'
                  }`}
                onClick={() => setIsFilterDrawerOpen(!isFilterDrawerOpen)}
              >
                {/* Switch icons based on isFilterDrawerOpen */}
                {isFilterDrawerOpen ? <X size={16} /> : <Filter size={16} />}
                
                <span>{isFilterDrawerOpen ? "Filters" : "Filters"}</span>
                
                {(selectedCategory || selectedBlock) && 
                  <span className={`${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-white text-indigo-700'} 
                    text-xs rounded-full w-5 h-5 flex items-center justify-center`}>
                    {(selectedCategory ? 1 : 0) + (selectedBlock ? 1 : 0)}
                  </span>
                }
              </button>
            </div>

            <div className="flex items-center space-x-2">
              {/* Font selector button */}
              <div className="relative">
                <button
                  ref={fontButtonRef}
                  className={`flex h-8 items-center gap-1 px-3 py-1 ${
                    darkMode 
                      ? 'text-gray-200 bg-gray-800 hover:bg-gray-600' 
                      : 'bg-indigo-100 hover:bg-indigo-300 text-indigo-800'
                  } rounded-lg text-sm transition-colors`}
                  onClick={toggleFontMenu}
                >
                  <Type size={16} />
                  <span className="hidden sm:inline">Font</span>
                </button>
                
                {/* Font dropdown menu using portal */}
                {isFontMenuOpen && createPortal(
                  <div 
                    className={`fixed rounded-md shadow-lg z-[5000] font-menu-portal ${
                      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                    }`}
                    style={{
                      top: buttonPosition.top + buttonPosition.height - 24,
                      left: buttonPosition.right - 192, // 192px = w-48 (menu width)
                    }}
                  >
                    <div className="py-1 w-48">
                      {availableFonts.map((font) => (
                        <button
                          key={font.name}
                          className={`block w-full text-left px-4 py-2 text-sm flex items-center justify-between ${
                            selectedFont === font.value
                              ? darkMode
                                ? 'bg-indigo-700 text-white' // Highlight in dark mode
                                : 'bg-indigo-100 text-indigo-800' // Highlight in light mode
                              : darkMode
                              ? 'text-gray-200 hover:bg-gray-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          style={{ fontFamily: font.value }}
                          onClick={() => selectFont(font.value)}
                        >
                          <span>{font.name}</span>
                          {selectedFont === font.value && (
                            <Check size={16} className={` ${darkMode ? "text-indigo-100" : "text-indigo-400"}`}/>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>,
                  document.body
                )}
              </div>
            
              {/* About button */}
              <button
                className={`flex items-center justify-center w-8 h-8 rounded-lg ${darkMode ? 'text-gray-200 bg-gray-800 hover:bg-gray-600' : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-300'} transition-colors`}
                onClick={() => setShowAbout(true)}
                aria-label="About"
              >
                <HelpCircle size={16} />
              </button>
              
              {/* Dark mode toggle */}
              <button
                className={`flex items-center justify-center w-8 h-8 rounded-lg ${darkMode ? 'text-gray-200 bg-gray-800 hover:bg-gray-600' : 'bg-indigo-100 text-indigo-800 hover:bg-indigo-300'} transition-colors`}
                onClick={toggleDarkMode}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filter drawer - fixed under header */}
      {isFilterDrawerOpen && (
        <div className={`${darkMode ? 'bg-gray-900 border-b border-gray-700' : 'bg-white border-b border-gray-200'} p-3 shadow-md sticky top-14 z-10`}>
          <div className="container mx-auto flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className={`block text-xs ${darkMode ? 'text-gray-300' : 'text-gray-500'} mb-1`}>Category</label>
              <select
                className={`w-full rounded-md ${darkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'} h-8`}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex-1">
              <label className={`block text-xs ${darkMode ? 'text-gray-300' : 'text-gray-500'} mb-1`}>Unicode Block</label>
              <select
                className={`w-full rounded-md ${darkMode ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-700'} h-8`}
                value={selectedBlock}
                onChange={(e) => setSelectedBlock(e.target.value)}
              >
                <option value="">All Blocks</option>
                {blocks.map((block) => (
                  <option key={block} value={block}>
                    {block}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                className={`px-3 py-1.5 ${darkMode ? 'bg-gray-800 border-gray-600 hover:bg-gray-600' : 'bg-indigo-100 hover:bg-indigo-300 text-indigo-800'} rounded-md text-sm transition-colors`}
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 overflow-visible flex flex-col">
        {/* Favorites rail */}
        {favoriteCharacters.length > 0 && (
          <div className={`${darkMode ? 'bg-gray-950 border-b border-gray-800' : 'bg-indigo-50 border-b border-indigo-100'} p-3`}>
            <div className="container mx-auto overflow-visible">
              <div className="flex items-center mb-2">
                <h2 className={`text-sm font-semibold ${darkMode ? 'text-gray-200' : 'text-indigo-800'}`}>Favorites</h2>
                <span className={`ml-2 text-xs ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-indigo-200 text-indigo-800'} px-2 py-0.5 rounded-full`}>
                  {favoriteCharacters.length}
                </span>
              </div>
              
              <div className="pb-2">
                <div className="flex gap-3 overflow-visible" style={{ minWidth: 'max-content' }}>
                  {favoriteCharacters.map((char) => (
                    <div key={char.Codepoint} className="w-14 flex-shrink-0">
                      <div className={`${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'} rounded shadow-lg overflow-hidden transition-shadow`}>
                        <div 
                          className={`h-12 flex justify-center items-center text-xl cursor-pointer ${darkMode ? 'text-gray-100' : 'text-gray-800'}`}
                          onClick={() => copyToClipboard(char.Character)}
                          title="Click to copy"
                          style={{ fontFamily: selectedFont }}
                        >
                          {char.Category_long === "Separator, Space" ? (
                            <span className={`inline-block border h-[0.8em] border-dashed ${darkMode ? 'bg-pink-950 border-pink-400' : 'bg-pink-50 border-pink-300'} py-1`}>{char.Character}</span>
                          ) : (
                            char.Character
                          )}
                        </div>
                        <div className={`${darkMode ? 'border-t border-gray-700 bg-gray-800' : 'border-t border-gray-100 bg-white'} p-1 flex justify-between items-center`}>
                          <button
                            className={`${darkMode ? 'text-gray-300 hover:text-indigo-400' : 'text-gray-600 hover:text-indigo-600'}`}
                            onClick={() => viewDetails(char)}
                            title="View details"
                          >
                            <Info size={12} />
                          </button>
                          <button
                            className="text-yellow-500 hover:text-yellow-600"
                            onClick={() => toggleFavorite(char.Codepoint)}
                            title="Remove from favorites"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Character grid */}
        <div className="flex-1 p-4 overflow-auto">
          <div className="container mx-auto">
            {/* Results info */}
            <div className="mb-3 flex justify-between items-center text-xs mb-4">
              <div className={darkMode ? 'text-gray-500' : 'text-gray-400'}>
                Showing {visibleCharacters.length} of {filteredCharacters.length} characters
                {(searchTerm || selectedCategory || selectedBlock) && " (filtered)"}
              </div>
              {/*Text to show count of characters supported by selected font
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {allCharacters.length - unsupportedCharacterCount} characters supported by {selectedFont.match(/'([^']+)'|([^,]+)/)[1] || selectedFont} (
                {Math.round(((allCharacters.length - unsupportedCharacterCount) / allCharacters.length) * 100)}%)
              </p>*/}
            </div>
            
            {/* Character grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3">
              {visibleCharacters.map((char, index) => (
                <CharacterCard
                  key={char.Codepoint}
                  char={char}
                  isFavorite={favorites.includes(char.Codepoint)}
                  index={index}
                />
              ))}
            </div>
            
            {/* Loading indicator */}
            {visibleCharacters.length < filteredCharacters.length && (
              <div 
                ref={loadingRef} 
                className="flex justify-center items-center py-6"
              >
                <div className={`w-8 h-8 rounded-full border-4 border-t-transparent animate-spin ${darkMode ? 'border-gray-600' : 'border-indigo-600'}`}></div>
              </div>
            )}
            
            {visibleCharacters.length === 0 && filteredCharacters.length === 0 && (
              <div className="flex justify-center items-center h-48">
                <div className="text-center">
                  <p className={darkMode ? 'mb-2 text-gray-400' : 'mb-2 text-gray-500'}>No characters found</p>
                  {(searchTerm || selectedCategory || selectedBlock) && (
                    <button
                      className={`px-3 py-1 ${darkMode ? 'bg-gray-700 text-indigo-300 hover:bg-gray-600' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'} rounded-md text-sm transition-colors`}
                      onClick={clearFilters}
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Detail panel with animation */}
        {showDetails && selectedChar && (
          <div 
            className="overlay fixed inset-0 bg-black bg-opacity-30 z-20 flex justify-end"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeDetails();
              }
            }}
          >
            <div 
              className={`w-full sm:w-96 md:w-[42rem] ${darkMode ? 'bg-gray-800' : 'bg-white'} h-full overflow-auto shadow-xl transform transition-transform duration-300 ease-in-out`}
              style={{ 
                animation: "slide-in 0.3s ease-out forwards",
                fontFamily: "'Inter', sans-serif"
              }}
            >
              <div className={`sticky top-0 ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 flex justify-between items-center`}>
                <h2 className="text-2xl font-normal truncate" title={toTitleCase(selectedChar.Name)}>
                  {toTitleCase(selectedChar.Name)}
                </h2>
                <button 
                  className={darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-indigo-800 hover:bg-indigo-100 rounded'}
                  onClick={closeDetails}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="pt-0 pl-6 pr-6 pb-6">
                <div className={`flex justify-center items-center mb-6 p-4 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border border-gray-100'} rounded-2xl shadow-lg`}>
                  <span className="text-[194px] min-h-[1.5em]" style={{ fontFamily: selectedFont }}>
                    {selectedChar.Category_long === "Separator, Space" ? (
                      <span className={`inline-block border h-[1.5em] px-1 border-dashed ${darkMode ? 'bg-pink-950 border-pink-400' : 'bg-pink-50 border-pink-300'} py-1`}>{selectedChar.Character}</span>
                    ) : (
                      selectedChar.Character
                    )}
                  </span>
                </div>
                
                <div className="flex justify-center gap-4 mb-10">
                  <button
                    className={`flex items-center gap-1 px-3 py-1.5 ${darkMode ? 'bg-indigo-700 hover:bg-indigo-600 text-white' : 'bg-indigo-100 hover:bg-indigo-300 text-indigo-800'} rounded-md transition-colors`}
                    onClick={() => copyToClipboard(selectedChar.Character)}
                  >
                    <Copy size={16} />
                    Copy Character
                  </button>
                  
                  <button
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors ${
                      favorites.includes(selectedChar.Codepoint)
                        ? darkMode 
                          ? 'bg-yellow-700 text-yellow-100 hover:bg-yellow-600' 
                          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                        : darkMode 
                          ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                    onClick={() => toggleFavorite(selectedChar.Codepoint)}
                  >
                    <Star size={16} fill={favorites.includes(selectedChar.Codepoint) ? "currentColor" : "none"} />
                    {favorites.includes(selectedChar.Codepoint) ? 'Remove Favorite' : 'Add Favorite'}
                  </button>

                  <button
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-md transition-colors ${
                      darkMode 
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                    onClick={() => {
                      const deepLink = `${window.location.origin}/?char=${encodeURIComponent(selectedChar.Codepoint)}`;
                      navigator.clipboard.writeText(deepLink);
                      setToast("Deep link copied!");
                    }}
                  >
                    <Link size={16} />
                    Deep Link
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="flex space-x-6">
                    <div>
                      <h3 className={`mb-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>Codepoint</h3>
                      <p className="mb-1 text-lg">{selectedChar.Codepoint}</p>
                    </div>

                    <div>
                      <h3 className={`mb-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>Category</h3>
                      <p className="mb-1 text-lg">{selectedChar["Category_long"] || selectedChar.Category}</p>
                    </div>
                  </div>
                  
                  {selectedChar["Character Description"] && (
                    <div>
                      <h3 className={`mb-2 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>Description</h3>
                      <p className="text-sm leading-relaxed mb-6">{selectedChar["Character Description"]}</p>
                    </div>
                  )}
                  
                  {selectedChar["Alternative Names"] && (
                    <div>
                      <h3 className={`text-xs mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>Alternative Names</h3>
                      <div className="flex flex-wrap gap-1 mt-1 mb-6">
                        {getAlternativeNames(selectedChar).map((name, index) => (
                          <span 
                            key={index}
                            className={`inline-block px-3 py-1 m-[1px] text-sm ${darkMode ? 'bg-gray-700' : 'text-gray-500 bg-gray-100'} rounded-full`}
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedChar["Wikipedia Link"] && (
                    <div className={``}>
                      <h3 className={`text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>Links</h3>
                      <a 
                        href={selectedChar["Wikipedia Link"]} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`text-lg mb-2 ${darkMode ? 'text-indigo-400 hover:underline' : 'text-indigo-600 hover:underline'}`}
                      >
                        Wikipedia
                      </a>
                    </div>
                  )}

                  <div>
                    <h3 className={`mb-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>Unicode Block</h3>
                    <p className={`mb-1 text-lg`}>{selectedChar["Unicode Block"]}</p>
                  </div>
                  
                  {selectedChar["Decimal Entity"] && (
                    <div className={`pb-6`}>
                      <h3 className={`mb-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-400'}`}>HTML Entities</h3>
                      <p className={`mb-1 text-lg`}>Decimal: {selectedChar["Decimal Entity"]}</p>
                      <p className={`mb-1 text-lg`}>Hex: {selectedChar["Hex Entity"]}</p>
                      {selectedChar["Named Entity"] && selectedChar["Named Entity"] !== "&;" && <p>Named: {selectedChar["Named Entity"]}</p>}
                    </div>
                  )}


                </div>
              </div>
            </div>
          </div>
        )}

        {/* About panel */}
        {showAbout && (
          <div 
            className="overlay fixed inset-0 bg-black bg-opacity-30 z-20 flex justify-end"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowAbout(false);
              }
            }}
          >
            <div 
              className={`w-full sm:w-96 md:w-[42rem] ${darkMode ? 'bg-gray-900' : 'bg-white'} h-full overflow-auto shadow-xl transform transition-transform duration-300 ease-in-out`}
              style={{ 
                animation: "slide-in 0.3s ease-out forwards",
                fontFamily: "'Inter', sans-serif"
              }}
            >
              <div className={`sticky top-0 ${darkMode ? 'bg-gray-900' : 'bg-white'} p-6 flex justify-between items-center`}>
                <h2 className="text-2xl font-normal">About Unicode Atlas</h2>
                <button 
                  className={darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-indigo-800 hover:bg-indigo-100 rounded'}
                  onClick={() => setShowAbout(false)}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="pt-0 pl-6 pr-6 pb-6">
                <div className={`mb-6 p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border border-gray-100'} rounded-2xl shadow-lg`}>
                  <h3 className="text-xl mb-4 font-medium">Welcome to Unicode Atlas</h3>
                  <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray800'}`}>
                    Unicode Atlas is an interactive explorer for Unicode characters. Browse, search, and discover the vast universe of symbols and scripts available in the Unicode standard.
                  </p>
                  <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray800'}`}>
                    This tool allows you to explore characters by category or Unicode block, search for specific characters, and maintain a personal collection of favorites for quick access.
                  </p>
                  <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray800'}`}>
                    Created by Karl Sluis
                  </p>
                </div>
                
                <div className={`mb-6 p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border border-gray-100'} rounded-2xl shadow-lg`}>
                  <h3 className="text-xl mb-4 font-medium">Features</h3>
                  <ul className={`list-disc list-inside space-y-2 ${darkMode ? 'text-gray-400' : 'text-gray800'}`}>
                    <li>Browse thousands of Unicode characters</li>
                    <li>Filter by category and Unicode block</li>
                    <li>Search by character, name, or codepoint</li>
                    <li>Save favorite characters</li>
                    <li>Copy characters to clipboard</li>
                    <li>View detailed character information</li>
                    <li>Change display font</li>
                    <li>Light and dark themes</li>
                  </ul>
                </div>
                
                <div className={`mb-6 p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border border-gray-100'} rounded-2xl shadow-lg`}>
                  <h3 className="text-xl mb-4 font-medium">Coming Soon</h3>
                  <p className={`mb-4 ${darkMode ? 'text-gray-400' : 'text-gray800'}`}>
                    Stay tuned for upcoming features:
                  </p>
                  <ul className={`list-disc list-inside space-y-2 ${darkMode ? 'text-gray-400' : 'text-gray800'}`}>
                    <li>Blog posts exploring interesting Unicode characters</li>
                    <li>Advanced search options</li>
                    <li>Custom character collections</li>
                    <li>Share character sets with others</li>
                  </ul>
                </div>
                
                <div className={`mb-6 p-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border border-gray-100'} rounded-2xl shadow-lg`}>
                  <h3 className="text-xl mb-4 font-medium">Tips</h3>
                  <ul className={`list-disc list-inside space-y-2 ${darkMode ? 'text-gray-400' : 'text-gray800'}`}>
                    <li>Press <kbd className={`px-1.5 py-0.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded text-xs`}>Ctrl+/</kbd> to quickly access the search</li>
                    <li>Press <kbd className={`px-1.5 py-0.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded text-xs`}>Escape</kbd> to close panels</li>
                    <li>Click on characters in the favorites bar to copy them</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className={`${darkMode ? 'bg-gray-900 border-t border-gray-800' : 'bg-white border-t border-gray-200'} py-2 px-4 text-center text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <p>Unicode Atlas • Press <kbd className={`px-1.5 py-0.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} rounded text-xs`}>Ctrl+/</kbd> to search</p>
      </footer>
      
      {/* CSS animations */}
      <style jsx="true" global="true">{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        
        @keyframes slide-down {
          from {
            transform: translate(-50%, -20px);
            opacity: 0;
          }
          to {
            transform: translate(-50%, 0);
            opacity: 1;
          }
        }
        
        .animate-slide-down {
          animation: slide-down 0.3s ease-out forwards;
        }

        .no-animation {
          animation: none !important;
          opacity: 1 !important;
        }

        @keyframes fadeInOverlay {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .overlay {
          animation: fadeInOverlay 0.3s ease-out forwards;
          opacity: 0; /* Prevents flickering before animation starts */
        }

        // @keyframes flipIn {
        //   0% {
        //     opacity: 0;
        //   }
        //   100% {
        //     opacity: 1;
        //   }
        // }

        // .character-card {
        //   animation: flipIn 0.2s forwards;
        //   opacity: 0; /* Prevents flicker before animation */
        // }
      `}</style>
    </div>
  );
};

export default UnicodeExplorer;