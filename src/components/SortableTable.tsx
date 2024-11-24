import {
  Table,
  TableBody,
  TableHeader,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import { useState, useEffect, useMemo } from 'react';
import { Spinner } from './icons';

type Direction = 'asc' | 'desc';

interface TableHeaderData {
  label: string;
  sortKey: string;
  className?: string;
  sortBy?: (sortDirection: Direction, a: any, b: any) => number;
}

type ColumnData = any[];

/**
For sorting to work, the data passed in to SortableTable should be an array with objects for each row,
where each of the sortKeys in TableHeaderData is a top-level key in each row object. Addidional keys are allowed.
In other words: if a sortKey is in a nexted object, it will not work.
*/
export default function SortableTable({
  tableHeaders,
  getTableRow,
  data,
  defaultSort,
}: {
  tableHeaders: TableHeaderData[];
  getTableRow: (data: any, index: number) => JSX.Element;
  data: ColumnData;
  defaultSort?: { column: string, direction: Direction };
}) {

  const defaultLocalCompare = (sortDirection: Direction, a: any, b: any) => {
    return sortDirection === 'asc' ? 
      String(a).localeCompare(String(b), undefined, { numeric: true }) :
      String(b).localeCompare(String(a), undefined, { numeric: true });
  };

  type SortColumn = TableHeaderData['sortKey'];
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(defaultSort?.column ?? null);
  const [sortDirection, setSortDirection] = useState<Direction>(defaultSort?.direction ?? 'asc');
  const [showSpinner, setShowSpinner] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => setShowSpinner(false), 5000);
    return () => clearTimeout(timeout);
  }, []);

  const sortSessions = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortColumn) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortColumn as keyof SortColumn];
      const bValue = b[sortColumn as keyof SortColumn];
      const headerToSort = tableHeaders.find(
        (header) => header.sortKey === sortColumn
      );
      let sortBy = headerToSort?.sortBy ?? defaultLocalCompare;
      return sortBy(sortDirection, aValue, bValue);
    });
  }, [data, sortColumn, sortDirection, tableHeaders]);



  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {tableHeaders.map(({ label, sortKey, className }) => (
            <TableHead
              key={sortKey}
              onClick={() => sortSessions(sortKey)}
              className={`cursor-pointer ${className || ''}`}
            >
              {label}{' '}
              {sortColumn === sortKey && (sortDirection === 'asc' ? '▲' : '▼')}
            </TableHead>
          ))}
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedData.length > 0 ? (
          sortedData.map((data, index) => getTableRow(data, index))
        ) : (
          <TableRow>
            <td
              colSpan={Object.keys(tableHeaders).length + 1}
              className="text-center"
            >
              {showSpinner && (
                <div className="flex items-center justify-center m-4">
                  <Spinner />
                </div>
              )}
            </td>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
