// A list with pages: the interceptor sends it as data + meta
export class Page<T> {
  constructor(
    readonly items: T[],
    readonly page: number,
    readonly pageSize: number,
    readonly total: number,
  ) {}
}
