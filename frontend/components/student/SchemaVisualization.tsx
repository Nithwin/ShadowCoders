'use client';

import { parseSQLSchema, type TableData } from '@/lib/sqlSchemaParser';
import { Database, Table2 } from 'lucide-react';

interface SchemaVisualizationProps {
  ddl: string;
}

function TableVisualization({ table }: { table: TableData }) {
  return (
    <div className="border border-primary/20 rounded-lg overflow-hidden bg-secondary shadow-sm">
      {/* Table Header */}
      <div className="bg-primary/10 px-4 py-3 border-b border-primary/20">
        <div className="flex items-center gap-2">
          <Table2 className="w-5 h-5 text-primary/70" />
          <h3 className="font-mono font-bold text-primary text-lg">{table.name}</h3>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-primary/5">
              {table.columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-4 py-2 text-left text-sm font-semibold text-primary border-b border-primary/10"
                >
                  <div className="flex flex-col">
                    <span className="font-mono">{col.name}</span>
                    <span className="text-xs text-primary/60 font-normal">{col.type}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.sampleData.length > 0 ? (
              table.sampleData.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={rowIdx % 2 === 0 ? 'bg-secondary' : 'bg-primary/5'}
                >
                  {row.map((cell, cellIdx) => (
                    <td
                      key={cellIdx}
                      className="px-4 py-2 text-sm text-primary/80 font-mono border-b border-primary/5"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={table.columns.length}
                  className="px-4 py-3 text-center text-sm text-primary/50 italic"
                >
                  No sample data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function SchemaVisualization({ ddl }: SchemaVisualizationProps) {
  const schema = parseSQLSchema(ddl);

  if (schema.tables.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-blue-700" />
        <h2 className="text-lg font-bold text-blue-900">Database Schema</h2>
      </div>
      
      <div className="space-y-4">
        {schema.tables.map((table, idx) => (
          <TableVisualization key={idx} table={table} />
        ))}
      </div>
      
      <div className="mt-4 text-sm text-blue-800">
        <p className="font-medium">📝 Note:</p>
        <p className="mt-1">
          The tables above show the database structure and sample data. Write your SQL query to work with these tables.
        </p>
      </div>
    </div>
  );
}
