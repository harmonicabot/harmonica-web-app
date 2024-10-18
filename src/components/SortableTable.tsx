import {
  Table,
  TableBody,
  TableHeader,
  TableHead,
  TableRow,
} from '@/components/ui/table';
import { useState, useEffect } from 'react';

type Direction = 'asc' | 'desc';

interface TableHeaderData {
  label: string;
  sortKey: string;
  className?: string;
  sortBy?: (sortDirection: Direction, a: any, b: any) => number;
}

type ColumnData = any[];

export default function SortableTable({
  tableHeaders,
  getTableCell,
  data,
}: {
  tableHeaders: TableHeaderData[];
  getTableCell: (data: any, index: Number) => React.ReactNode;
  data: ColumnData;
}) {
  const testArray = [{ a: "a", b: "b" }, { d: "d", e: "e" }];
  console.log('testArray: ', testArray);
  console.log('data before sorting: ', data);

  const defaultSort = (sortDirection: Direction, a: any, b: any) => {
    return sortDirection === 'asc' ? a.localeCompare(b) : b.localeCompare(a);
  };

  type SortColumn = TableHeaderData['sortKey'];
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<Direction>('asc');
  const [sortedData, setSortedData] = useState<any[]>([]);

  const sortSessions = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  useEffect(() => {
    const sorted = data.sort((a, b) => {
      if (!sortColumn) return 0;
      const aValue = a[sortColumn as keyof SortColumn]; // Todo: is this keyof correct? I don't actually know how this works...
      const bValue = b[sortColumn as keyof SortColumn];
      console.log("SortColumn: ", sortColumn);
      console.log("aValue: ", aValue);
      console.log("tableHeaders: ", tableHeaders);
      const headerToSort = tableHeaders.find((header) => header.sortKey === sortColumn);
      console.log("headerToSort: ", headerToSort);
      let sortBy = headerToSort.sortBy ?? defaultSort;
      return sortBy(sortDirection, aValue, bValue);
    });
    console.log("Sorted data: ", sorted);
    setSortedData(sorted);
  }, [sortColumn, sortDirection]);

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
        {sortedData.map((data, index) => {
          console.log("Data & index: ", data, index);
          return getTableCell(data, index);
        }
        )}
      </TableBody>
    </Table>
  );
}
