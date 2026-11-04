export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function parsePagination(
  query: Record<string, unknown>,
  defaults: { pageSize?: number; maxPageSize?: number; sort?: string; order?: "asc" | "desc" } = {},
): { page: number; pageSize: number; offset: number; sort?: string; order: "asc" | "desc" } {
  const maxPageSize = defaults.maxPageSize ?? 100;
  const page = Math.max(1, Math.floor(Number(query.page ?? 1)) || 1);
  const pageSize = Math.min(maxPageSize, Math.max(1, Math.floor(Number(query.pageSize ?? defaults.pageSize ?? 25)) || 25));
  const order = query.order === "asc" ? "asc" : query.order === "desc" ? "desc" : (defaults.order ?? "desc");
  const sort = typeof query.sort === "string" && query.sort ? query.sort : defaults.sort;
  return { page, pageSize, offset: (page - 1) * pageSize, sort, order };
}

export function paginated<T>(items: T[], total: number, page: number, pageSize: number): PageResult<T> {
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
