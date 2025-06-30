import { useEffect, useState } from 'react'
import './App.css'

interface BookHighlight {
  book_id: string;
  title: string;
  author: string;
  genre: string;
  publication_year: string;
  cover_image: string;
  goodreads_link: string;
  highlight: string;
}

function App() {
  const [count, setCount] = useState(0)
  const [bookHighlights, setBookHighlights] = useState<BookHighlight[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSpreadsheetData = async () => {
      try {
        setLoading(true)
        // Convert Google Sheets URL to CSV export URL
        const spreadsheetId = '1Hwu1Dk8RBD5ospxLfKt_L4HO0NO_KRL-S3znt28E814'
        const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`
        
        const response = await fetch(csvUrl)
        if (!response.ok) {
          throw new Error('Failed to fetch spreadsheet data')
        }
        
        const csvText = await response.text()
        const lines = csvText.split('\n')
        const headers = lines[0].split(',').map(header => header.replace(/"/g, '').trim())
        
        const data: BookHighlight[] = []
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim()
          if (line) {
            const values = []
            let currentValue = ''
            let inQuotes = false
            
            for (let j = 0; j < line.length; j++) {
              const char = line[j]
              if (char === '"' && (j === 0 || line[j-1] === ',')) {
                inQuotes = true
              } else if (char === '"' && inQuotes && (j === line.length - 1 || line[j+1] === ',')) {
                inQuotes = false
              } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim())
                currentValue = ''
              } else {
                currentValue += char
              }
            }
            values.push(currentValue.trim())
            
            if (values.length >= 8 && values[0]) {
              data.push({
                book_id: values[0] || '',
                title: values[1] || '',
                author: values[2] || '',
                genre: values[3] || '',
                publication_year: values[4] || '',
                cover_image: values[5] || '',
                goodreads_link: values[6] || '',
                highlight: values[7] || ''
              })
            }
          }
        }
        
        setBookHighlights(data)
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

  return (
    <>
      <h1>Book Highlights Collection</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>

      <div className="book-highlights-section">
        <h2>My Book Highlights</h2>
        {loading && <p>Loading book highlights...</p>}
        {error && <p className="error">Error: {error}</p>}
        
        {!loading && !error && bookHighlights.length > 0 && (
          <div className="table-container">
            <table className="highlights-table">
              <thead>
                <tr>
                  <th>Cover</th>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Genre</th>
                  <th>Year</th>
                  <th>Highlight</th>
                  <th>Goodreads</th>
                </tr>
              </thead>
              <tbody>
                {bookHighlights.map((book, index) => (
                  <tr key={`${book.book_id}-${index}`}>
                    <td>
                      {book.cover_image && (
                        <img 
                          src={book.cover_image} 
                          alt={`${book.title} cover`}
                          className="book-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                    </td>
                    <td className="title-cell">{book.title}</td>
                    <td>{book.author}</td>
                    <td>{book.genre}</td>
                    <td>{book.publication_year}</td>
                    <td className="highlight-cell">"{book.highlight}"</td>
                    <td>
                      {book.goodreads_link && (
                        <a 
                          href={book.goodreads_link} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="goodreads-link"
                        >
                          View on Goodreads
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {!loading && !error && bookHighlights.length === 0 && (
          <p>No book highlights found.</p>
        )}
      </div>

    </>
  )
}

export default App
