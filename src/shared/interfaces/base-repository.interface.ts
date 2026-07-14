export interface IBaseRepository<T, CreateDto, UpdateDto> {
  findAll(filter?: Partial<T>): Promise<T[]>;
  findOne(id: string): Promise<T | null>;
  create(data: CreateDto): Promise<T>;
  update(id: string, data: UpdateDto): Promise<T>;
  delete(id: string): Promise<void>;
}
