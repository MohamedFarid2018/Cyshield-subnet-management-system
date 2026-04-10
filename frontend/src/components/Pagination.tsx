interface Props {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = pages.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1
  );

  return (
    <div className="flex items-center gap-1 mt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
      >
        Prev
      </button>
      {visible.map((p, i) => (
        <span key={p}>
          {i > 0 && visible[i - 1] !== p - 1 && (
            <span className="px-1 text-gray-400">…</span>
          )}
          <button
            onClick={() => onPageChange(p)}
            className={`px-3 py-1 text-sm border rounded ${
              p === page
                ? 'bg-blue-600 text-white border-blue-600'
                : 'hover:bg-gray-50'
            }`}
          >
            {p}
          </button>
        </span>
      ))}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-1 text-sm border rounded disabled:opacity-40 hover:bg-gray-50"
      >
        Next
      </button>
    </div>
  );
}
