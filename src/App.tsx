import { useEffect, useState } from 'react'
import './App.css'

interface SheetData {
  sheetId: string;
  sheetName: string;
  headers: string[];
  rows: string[][];
  error?: string;
}

interface Book {
  book_id: string;
  title: string;
  author: string;
  genre: string;
  publication_year: string;
  cover_image: string;
  goodreads_link: string;
}

interface Highlight {
  book_id: string;
  highlight: string;
  [key: string]: string; // Allow for additional columns
}

function App() {
  const [sheetsData, setSheetsData] = useState<SheetData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [sidePanelOpen, setSidePanelOpen] = useState(false)

  // Derived data
  const booksData = sheetsData.find(sheet => sheet.sheetName === 'books')
  const highlightsData = sheetsData.find(sheet => sheet.sheetName === 'highlights')

  useEffect(() => {
    const fetchSpreadsheetData = async () => {
      try {
        setLoading(true)
        const spreadsheetId = '1Hwu1Dk8RBD5ospxLfKt_L4HO0NO_KRL-S3znt28E814'
        
        // Define sheets with their IDs and names
        const sheets = [
          { id: '79276341', name: 'books' },
          { id: '1041618944', name: 'highlights' }
        ]
        
        const parseCSVLine = (line: string): string[] => {
          const result: string[] = []
          let current = ''
          let inQuotes = false
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i]
            const nextChar = line[i + 1]
            
            if (char === '"') {
              if (inQuotes && nextChar === '"') {
                // Escaped quote
                current += '"'
                i++ // Skip next quote
              } else {
                // Toggle quote state
                inQuotes = !inQuotes
              }
            } else if (char === ',' && !inQuotes) {
              // End of field
              result.push(current.trim())
              current = ''
            } else {
              current += char
            }
          }
          
          // Add the last field
          result.push(current.trim())
          return result
        }
        
        const fetchSheetData = async (sheetId: string, sheetName: string): Promise<SheetData> => {
          try {
            const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?gid=${sheetId}&format=csv#gid=${sheetId}`
            
            const response = await fetch(csvUrl)
            if (!response.ok) {
              throw new Error(`Failed to fetch data for sheet: ${sheetName} (Status: ${response.status})`)
            }
            
            const csvText = await response.text()
            const lines = csvText.split('\n').filter(line => line.trim() !== '')
            
            if (lines.length === 0) {
              return { sheetId, sheetName, headers: [], rows: [] }
            }
            
            // Parse headers from first row
            const headers = parseCSVLine(lines[0]).map(header => 
              header.replace(/^"|"$/g, '').trim()
            ).filter(header => header !== '')
            
            if (headers.length === 0) {
              return { sheetId, sheetName, headers: [], rows: [] }
            }
            
            // Parse data rows
            const rows: string[][] = []
            for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim()
              if (line) {
                const parsedRow = parseCSVLine(line).map(cell => 
                  cell.replace(/^"|"$/g, '').trim()
                )
                
                // Only include rows that have at least one non-empty cell
                if (parsedRow.some(cell => cell !== '')) {
                  // Ensure row has same number of columns as headers
                  while (parsedRow.length < headers.length) {
                    parsedRow.push('')
                  }
                  rows.push(parsedRow.slice(0, headers.length))
                }
              }
            }
            
            return { sheetId, sheetName, headers, rows }
          } catch (err) {
            console.error(`Error fetching sheet ${sheetName}:`, err)
            return { 
              sheetId, 
              sheetName, 
              headers: [],
              rows: [],
              error: `Failed to load ${sheetName}: ${err instanceof Error ? err.message : 'Unknown error'}` 
            }
          }
        }
        
        // Fetch all sheets in parallel
        const allSheetsData = await Promise.all(
          sheets.map(sheet => fetchSheetData(sheet.id, sheet.name))
        )
        
        setSheetsData(allSheetsData)
        setError(null)
      } catch (err) {
        setError('Failed to load book highlights data')
        console.error('Error fetching spreadsheet:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchSpreadsheetData()
  }, [])

  const parseBooks = (sheetData: SheetData): Book[] => {
    if (!sheetData || sheetData.error || sheetData.rows.length === 0) return []
    
    return sheetData.rows.map(row => {
      const book: Book = {
        book_id: '',
        title: '',
        author: '',
        genre: '',
        publication_year: '',
        cover_image: '',
        goodreads_link: ''
      }
      
      sheetData.headers.forEach((header, index) => {
        const value = row[index] || ''
        const headerLower = header.toLowerCase()
        
        if (headerLower.includes('book_id') || headerLower.includes('id')) {
          book.book_id = value
        } else if (headerLower.includes('title')) {
          book.title = value
        } else if (headerLower.includes('author')) {
          book.author = value
        } else if (headerLower.includes('genre')) {
          book.genre = value
        } else if (headerLower.includes('year') || headerLower.includes('publication')) {
          book.publication_year = value
        } else if (headerLower.includes('cover')) {
          book.cover_image = value
        } else if (headerLower.includes('goodreads') || headerLower.includes('link')) {
          book.goodreads_link = value
        }
      })
      
      return book
    }).filter(book => book.book_id) // Only include books with an ID
  }

  const parseHighlights = (sheetData: SheetData): Highlight[] => {
    if (!sheetData || sheetData.error || sheetData.rows.length === 0) return []
    
    return sheetData.rows.map(row => {
      const highlight: Highlight = {
        book_id: '',
        highlight: ''
      }
      
      sheetData.headers.forEach((header, index) => {
        const value = row[index] || ''
        const headerLower = header.toLowerCase()
        
        if (headerLower.includes('book_id') || headerLower.includes('id')) {
          highlight.book_id = value
        } else if (headerLower.includes('highlight') || headerLower.includes('quote')) {
          highlight.highlight = value
        }
        
        // Store all fields for flexibility
        highlight[header] = value
      })
      
      return highlight
    }).filter(highlight => highlight.book_id && highlight.highlight) // Only include valid highlights
  }

  const books = booksData ? parseBooks(booksData) : []
  const highlights = highlightsData ? parseHighlights(highlightsData) : []

  const getHighlightsForBook = (bookId: string): Highlight[] => {
    return highlights.filter(highlight => highlight.book_id === bookId)
  }

  const renderBookCover = (book: Book, className: string = '') => {
    return (
      <div className={`book-cover-container ${className}`}>
        {book.cover_image ? (
          <img 
            src={book.cover_image} 
            alt={`${book.title} cover`}
            className="book-cover-image"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextElementSibling?.classList.remove('hidden')
            }}
          />
        ) : null}
        <div className={`book-cover-placeholder ${book.cover_image ? 'hidden' : ''}`}>
          <span>{book.title}</span>
        </div>
      </div>
    )
  }

  const handleBookClick = (book: Book) => {
    setSelectedBook(book)
    setSidePanelOpen(true)
  }

  const closeSidePanel = () => {
    setSidePanelOpen(false)
    setSelectedBook(null)
  }

  const renderBookCard = (book: Book) => (
    <div 
      key={book.book_id} 
      id={book.book_id}
      className="book-card"
      onClick={() => handleBookClick(book)}
    >
      {renderBookCover(book)}
      <div className="book-card-info">
        <h3 className="book-card-title">{book.title}</h3>
        <p className="book-card-author">{book.author}</p>
        <p className="book-card-year">{book.publication_year}</p>
      </div>
    </div>
  )

  const renderSidePanel = () => (
    <>
      {sidePanelOpen && <div className="overlay" onClick={closeSidePanel} />}
      <div className={`side-panel ${sidePanelOpen ? 'open' : ''}`}>
        {selectedBook && (
          <>
            <div className="side-panel-header">
              <button className="close-button" onClick={closeSidePanel}>×</button>
            </div>
            <div className="side-panel-content">
              <div className="book-details">
                {renderBookCover(selectedBook)}
                <div className="book-details-info">
                  <h2>{selectedBook.title}</h2>
                  <p className="book-author">by {selectedBook.author}</p>
                  <p className="book-year">{selectedBook.publication_year}</p>
                  {selectedBook.genre && <p className="book-genre">Genre: {selectedBook.genre}</p>}
                  {selectedBook.goodreads_link && (
                    <a 
                      href={selectedBook.goodreads_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="goodreads-link"
                    >
                      View on Goodreads
                    </a>
                  )}
                </div>
              </div>
              
              <div className="highlights-section">
                <h3>Highlights</h3>
                {getHighlightsForBook(selectedBook.book_id).length > 0 ? (
                  <div className="highlights-list">
                    {getHighlightsForBook(selectedBook.book_id).map((highlight, index) => (
                      <div key={index} className="highlight-item">
                        <blockquote>"{highlight.highlight}"</blockquote>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-highlights">No highlights found for this book.</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )

  return (
    <div className="app">
      <div className="main-content">
        <h1 className="page-title">Book Highlights Collection</h1>
        
        {loading && <p className="loading">Loading books...</p>}
        {error && <p className="error">Error: {error}</p>}
        
        {!loading && !error && (
          <>
            <div className="books-grid">
              {books.map(book => renderBookCard(book))}
            </div>
            {books.length === 0 && (
              <p className="no-books">No books found.</p>
            )}
          </>
        )}
        {renderSidePanel()}
      </div>
    </div>
  )
}

export default App
