import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, PlusCircle, ArrowDown } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  onLoadMore?: () => void;
  hasMoreToLoad?: boolean;
  className?: string;
  itemLabel?: string;
}

export const TablePagination: React.FC<PaginationProps> = ({
  currentPage,
  totalItems,
  pageSize = 15,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 15, 25, 50, 100],
  onLoadMore,
  hasMoreToLoad,
  className = '',
  itemLabel = 'records',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, safeCurrentPage * pageSize);

  // Generate numbered pages array with ellipsis (e.g. 1 2 3 4 5 ... 20)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (safeCurrentPage <= 4) {
        // Near beginning: 1 2 3 4 5 ... 20
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (safeCurrentPage >= totalPages - 3) {
        // Near end: 1 ... 16 17 18 19 20
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // In the middle: 1 ... 8 9 10 ... 20
        pages.push(1);
        pages.push('...');
        pages.push(safeCurrentPage - 1);
        pages.push(safeCurrentPage);
        pages.push(safeCurrentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();
  const canLoadMore = hasMoreToLoad ?? (safeCurrentPage < totalPages);
  const remainingCount = Math.max(0, totalItems - endItem);

  return (
    <div className={`p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-xs select-none ${className}`}>
      
      {/* Left: Summary & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-start">
        <div className="text-slate-500 font-medium">
          Showing <span className="font-semibold text-slate-800">{startItem}</span> to{' '}
          <span className="font-semibold text-slate-800">{endItem}</span> of{' '}
          <span className="font-semibold text-slate-800">{totalItems}</span> {itemLabel}
        </div>

        <div className="flex items-center gap-1.5 pl-0 md:pl-2 md:border-l border-slate-200">
          <span className="text-slate-500">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              onPageSizeChange(newSize);
              onPageChange(1);
            }}
            className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 cursor-pointer shadow-2xs"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} per page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Middle & Right: Load More Button + Numbered Pagination */}
      <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-center md:justify-end">
        
        {/* Load More Button */}
        {canLoadMore && (
          <button
            type="button"
            onClick={() => {
              if (onLoadMore) {
                onLoadMore();
              } else if (safeCurrentPage < totalPages) {
                onPageChange(safeCurrentPage + 1);
              }
            }}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100/80 active:bg-rose-200 border border-rose-200 hover:border-rose-300 text-rose-700 font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs text-[11px]"
            title={`Load next ${Math.min(pageSize, remainingCount)} items`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Load More {remainingCount > 0 ? `(${Math.min(pageSize, remainingCount)} left)` : ''}</span>
          </button>
        )}

        {/* Numbered Pagination Buttons */}
        <div className="inline-flex items-center gap-1 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
          
          {/* First Page */}
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => onPageChange(1)}
            aria-label="First page"
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>

          {/* Previous Page */}
          <button
            type="button"
            disabled={safeCurrentPage <= 1}
            onClick={() => onPageChange(safeCurrentPage - 1)}
            aria-label="Previous page"
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Numbered Page List */}
          <div className="flex items-center gap-1 px-1">
            {pageNumbers.map((p, idx) => {
              if (p === '...') {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1.5 py-0.5 text-slate-400 font-bold tracking-widest text-[11px]"
                  >
                    ...
                  </span>
                );
              }

              const pageNum = p as number;
              const isActive = pageNum === safeCurrentPage;

              return (
                <button
                  key={`page-${pageNum}`}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  className={`min-w-[28px] h-7 px-1.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer flex items-center justify-center ${
                    isActive
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next Page */}
          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => onPageChange(safeCurrentPage + 1)}
            aria-label="Next page"
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => onPageChange(totalPages)}
            aria-label="Last page"
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>

        </div>

      </div>

    </div>
  );
};
