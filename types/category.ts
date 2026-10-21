export type Category = {
  id: string;
  name: string;
  order: number;
  active: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CategoryInput = {
  name: string;
  active: boolean;
};

export type CategoryUpdate = {
  name: string;
  active: boolean;
};
