export interface BusinessTodo {
  id: string;
  projectId?: string;
  sourceType?: 'initiation';
  sourceId?: string;
  sourceName?: string;
  revision?: number;
  title: string;
  type: string;
  node: string;
  status: string;
  done: boolean;
  due: string;
  route: string;
  opinion?: string;
  owner: string;
}
