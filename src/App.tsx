import { useEffect, useState } from 'react'
import './App.css'

interface SheetData {
  sheetId: string;
  sheetName: string;
  headers: string[];
  rows: string[][];
  error?: string;
}

function App() {
  const [count, setCount] = useState(0)
  const [sheetsData, setSheetsData] = useState<SheetData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSpreadsheetData = async () => {
      try {
        setLoading(true)
        const spreadsheetId = '1Hwu1Dk8RBD5ospxLfKt_L4HO0NO_KRL-S3znt28E814'
        
        // Define sheets with their IDs and names
        const sheets = [
          { id: '933538954', name: 'books and highlights' },
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

  const renderSheetTable = (sheetData: SheetData) => {
    if (sheetData.error) {
      return (
        <div key={sheetData.sheetId} className="sheet-section">
          <h3>{sheetData.sheetName}</h3>
          <p className="error">Error: {sheetData.error}</p>
        </div>
      )
    }

    if (sheetData.headers.length === 0 || sheetData.rows.length === 0) {
      return (
        <div key={sheetData.sheetId} className="sheet-section">
          <h3>{sheetData.sheetName}</h3>
          <p>No data found in this sheet.</p>
          <details className="debug-info">
            <summary>Debug Info</summary>
            <p>Headers: {sheetData.headers.length}</p>
            <p>Rows: {sheetData.rows.length}</p>
          </details>
        </div>
      )
    }

    return (
      <div key={sheetData.sheetId} className="sheet-section">
        <h3>{sheetData.sheetName}</h3>
        <p className="sheet-info">
          {sheetData.rows.length} row{sheetData.rows.length !== 1 ? 's' : ''} found
          • {sheetData.headers.length} column{sheetData.headers.length !== 1 ? 's' : ''}
        </p>
        <div className="table-container">
          <table className="highlights-table">
            <thead>
              <tr>
                {sheetData.headers.map((header, index) => (
                  <th key={`${sheetData.sheetId}-header-${index}`}>
                    {header || `Column ${index + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sheetData.rows.map((row, rowIndex) => (
                <tr key={`${sheetData.sheetId}-row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => {
                    const header = sheetData.headers[cellIndex]?.toLowerCase() || ''
                    
                    // Special handling for different cell types
                    if (header.includes('cover') && cell && cell.startsWith('http')) {
                      return (
                        <td key={`${sheetData.sheetId}-cell-${rowIndex}-${cellIndex}`}>
                          <img 
                            src={cell} 
                            alt="Book cover"
                            className="book-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </td>
                      )
                    } else if (header.includes('link') && cell && cell.startsWith('http')) {
                      return (
                        <td key={`${sheetData.sheetId}-cell-${rowIndex}-${cellIndex}`}>
                          <a 
                            href={cell} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="external-link"
                          >
                            View Link
                          </a>
                        </td>
                      )
                    } else if (header.includes('highlight') || header.includes('quote')) {
                      return (
                        <td key={`${sheetData.sheetId}-cell-${rowIndex}-${cellIndex}`} className="highlight-cell">
                          "{cell}"
                        </td>
                      )
                    } else if (header.includes('title')) {
                      return (
                        <td key={`${sheetData.sheetId}-cell-${rowIndex}-${cellIndex}`} className="title-cell">
                          {cell}
                        </td>
                      )
                    } else {
                      return (
                        <td key={`${sheetData.sheetId}-cell-${rowIndex}-${cellIndex}`}>
                          {cell}
                        </td>
                      )
                    }
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

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
        {loading && <p>Loading book highlights from all sheets...</p>}
        {error && <p className="error">Error: {error}</p>}
        
        {!loading && !error && (
          <>
            {sheetsData.map(sheetData => renderSheetTable(sheetData))}
          </>
        )}
        
        {!loading && !error && sheetsData.length === 0 && (
          <p>No book highlights found.</p>
        )}
      </div>
    </>
  )
}

export default App
