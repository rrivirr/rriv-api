export type Tuple = {
  user: string;
  object: string;
  relation: string;
};

export type WriteRelationshipDto = {
  writes?: Tuple[];
  deletes?: Tuple[];
};

export type ListObjectDto = {
  user: string;
  relation: string;
  type: string;
};
