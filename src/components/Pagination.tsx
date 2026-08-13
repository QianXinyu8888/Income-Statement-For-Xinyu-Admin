import { ReactNode } from 'react';

export interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps): ReactNode {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (total <= 0) return null;

  return (
    <nav className="pagination-wrap" aria-label="分页导航">
      <div className="pagination-summary">
        共 <strong className="pagination-highlight">{total}</strong> 条记录
      </div>

      <div className="pagination-nav-group">
        <button
          type="button"
          className="button button--secondary pagination-nav-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="上一页"
        >
          上一页
        </button>
        <button
          type="button"
          className="button button--secondary pagination-nav-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="下一页"
        >
          下一页
        </button>
      </div>

      <div className="pagination-select-container">
        <select
          className="button button--secondary pagination-select"
          value={page}
          onChange={(e) => onPageChange(Number(e.target.value))}
          aria-label="选择跳转页码"
        >
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((item) => (
            <option key={item} value={item}>
              第 {item} 页
            </option>
          ))}
        </select>
      </div>


    </nav>
  );
}
