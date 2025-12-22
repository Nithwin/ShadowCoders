/**
 * SQL Schema Parser
 * Parses DDL statements to extract table structures and sample data
 */

export interface TableColumn {
  name: string;
  type: string;
}

export interface TableData {
  name: string;
  columns: TableColumn[];
  sampleData: string[][];
}

export interface ParsedSchema {
  tables: TableData[];
}

/**
 * Parse DDL (CREATE TABLE and INSERT statements) to extract schema information
 */
export function parseSQLSchema(ddl: string): ParsedSchema {
  const tables: TableData[] = [];
  
  if (!ddl || typeof ddl !== 'string') {
    return { tables };
  }

  // Split by semicolons to get individual statements
  const statements = ddl
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const tableMap = new Map<string, TableData>();

  for (const statement of statements) {
    // Parse CREATE TABLE statements
    const createTableMatch = statement.match(/CREATE\s+TABLE\s+(\w+)\s*\(([\s\S]+)\)/i);
    if (createTableMatch) {
      const tableName = createTableMatch[1];
      const columnsStr = createTableMatch[2];
      
      // Parse columns
      const columns: TableColumn[] = [];
      const columnDefs = columnsStr.split(',').map(c => c.trim());
      
      for (const colDef of columnDefs) {
        // Skip constraints like PRIMARY KEY, FOREIGN KEY, etc.
        if (/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)/i.test(colDef)) {
          continue;
        }
        
        // Extract column name and type
        const colMatch = colDef.match(/^(\w+)\s+(\w+)/);
        if (colMatch) {
          columns.push({
            name: colMatch[1],
            type: colMatch[2],
          });
        }
      }
      
      tableMap.set(tableName, {
        name: tableName,
        columns,
        sampleData: [],
      });
    }

    // Parse INSERT statements
    const insertMatch = statement.match(/INSERT\s+INTO\s+(\w+)\s*(?:\([^)]+\))?\s*VALUES\s*\(([^)]+)\)/i);
    if (insertMatch) {
      const tableName = insertMatch[1];
      const valuesStr = insertMatch[2];
      
      const table = tableMap.get(tableName);
      if (table) {
        // Parse values - handle quoted strings and numbers
        const values: string[] = [];
        let current = '';
        let inQuote = false;
        let quoteChar = '';
        
        for (let i = 0; i < valuesStr.length; i++) {
          const char = valuesStr[i];
          
          if ((char === '"' || char === "'") && !inQuote) {
            inQuote = true;
            quoteChar = char;
            continue;
          } else if (char === quoteChar && inQuote) {
            inQuote = false;
            quoteChar = '';
            continue;
          } else if (char === ',' && !inQuote) {
            values.push(current.trim());
            current = '';
            continue;
          }
          
          current += char;
        }
        
        if (current.trim()) {
          values.push(current.trim());
        }
        
        // Only keep first 3 rows of sample data
        if (table.sampleData.length < 3) {
          table.sampleData.push(values);
        }
      }
    }
  }

  // Convert map to array
  tableMap.forEach(table => {
    tables.push(table);
  });

  return { tables };
}
