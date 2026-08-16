import { useState, useMemo, useEffect } from 'react';

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  resetOnChange?: any; // Dependency that resets page to 1 when changed (e.g., search query, filter)
}

export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
) {
  const {
    initialPage = 1,
    initialPageSize = 15,
    resetOnChange,
  } = options;

  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [accumulatedCount, setAccumulatedCount] = useState<number | null>(null);

  // Automatically reset to page 1 when search or filter dependencies change
  useEffect(() => {
    if (resetOnChange !== undefined) {
      setCurrentPage(1);
      setAccumulatedCount(null);
    }
  }, [resetOnChange]);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ensure current page is within valid range
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedItems = useMemo(() => {
    if (accumulatedCount !== null) {
      return items.slice(0, accumulatedCount);
    }
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, safeCurrentPage, pageSize, accumulatedCount]);

  const handlePageChange = (page: number) => {
    setAccumulatedCount(null);
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    setAccumulatedCount(null);
  };

  const handleLoadMore = () => {
    const currentShown = accumulatedCount ?? (safeCurrentPage * pageSize);
    const newCount = Math.min(totalItems, currentShown + pageSize);
    setAccumulatedCount(newCount);
    // Sync current page number as well
    setCurrentPage(Math.ceil(newCount / pageSize));
  };

  const hasMoreToLoad = (accumulatedCount ?? (safeCurrentPage * pageSize)) < totalItems;

  return {
    currentPage: safeCurrentPage,
    pageSize,
    totalItems,
    totalPages,
    paginatedItems,
    setCurrentPage: handlePageChange,
    setPageSize: handlePageSizeChange,
    loadMore: handleLoadMore,
    hasMoreToLoad,
  };
}
