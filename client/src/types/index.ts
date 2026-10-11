export type ItemType = 'Document' | 'Receipt' | 'Note' | 'Link' | 'Image' | 'Password';

export type MemoryItem = {
  _id: string;
  title: string;
  description: string;
  type: ItemType;
  category: string;
  url: string;
  username: string;
  hasPassword: boolean;
  tags: string[];
  fileUrl: string;
  fileName: string;
  fileSize: number;
  date: string;
  updatedAt: string;
};

export type Reminder = {
  _id: string;
  itemId: { _id: string; title: string; type: ItemType } | string;
  title: string;
  reminderDate: string;
  timezone?: string;
  completed: boolean;
};

export type MemoryUser = { id: string; name: string; email: string };
export type Category = { _id: string; name: string };
export type ItemInput = Pick<MemoryItem, 'title' | 'description' | 'type' | 'category' | 'url' | 'tags' | 'date'> & {
  username?: string;
  password?: string;
};