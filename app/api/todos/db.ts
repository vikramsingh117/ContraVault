import { getDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export interface TodoDocument {
  _id?: ObjectId;
  title: string;
  time?: string;
  date?: string;
  createdAt: Date;
  finished?: boolean;
}

export interface Todo {
  id: string;
  title: string;
  time?: string;
  date?: string;
  createdAt: Date;
  finished?: boolean;
}

function toTodo(doc: TodoDocument): Todo {
  return {
    id: doc._id?.toString() || '',
    title: doc.title,
    time: doc.time,
    date: doc.date,
    createdAt: doc.createdAt,
    finished: doc.finished || false,
  };
}

export async function getAllTodos(): Promise<Todo[]> {
  console.log('[DB] Fetching all todos');
  try {
    const db = await getDatabase();
    const collection = db.collection<TodoDocument>('todos');
    const todos = await collection.find({}).sort({ createdAt: 1 }).toArray();
    console.log('[DB] Found todos:', todos.length);
    return todos.map(toTodo);
  } catch (error) {
    console.error('[DB] Error fetching todos:', error);
    throw error;
  }
}

export async function createTodo(todo: Omit<Todo, 'id'>): Promise<Todo> {
  console.log('[DB] Creating todo:', todo);
  try {
    const db = await getDatabase();
    const collection = db.collection<TodoDocument>('todos');
    const doc: Omit<TodoDocument, '_id'> = {
      title: todo.title,
      time: todo.time,
      date: todo.date,
      createdAt: todo.createdAt,
      finished: todo.finished || false,
    };
    const result = await collection.insertOne(doc);
    console.log('[DB] Todo created with id:', result.insertedId);
    const created = await collection.findOne({ _id: result.insertedId });
    if (!created) {
      throw new Error('Failed to retrieve created todo');
    }
    return toTodo(created);
  } catch (error) {
    console.error('[DB] Error creating todo:', error);
    throw error;
  }
}

export async function updateTodo(id: string, updates: Partial<Omit<Todo, 'id' | 'createdAt'>>): Promise<Todo | null> {
  console.log('[DB] Updating todo:', id, updates);
  try {
    const db = await getDatabase();
    const collection = db.collection<TodoDocument>('todos');
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnDocument: 'after' }
    );
    if (!result) {
      console.log('[DB] Todo not found for update');
      return null;
    }
    console.log('[DB] Todo updated successfully');
    return toTodo(result);
  } catch (error) {
    console.error('[DB] Error updating todo:', error);
    throw error;
  }
}

export async function deleteTodo(id: string): Promise<boolean> {
  console.log('[DB] Deleting todo:', id);
  try {
    const db = await getDatabase();
    const collection = db.collection<TodoDocument>('todos');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    console.log('[DB] Delete result:', result.deletedCount > 0);
    return result.deletedCount > 0;
  } catch (error) {
    console.error('[DB] Error deleting todo:', error);
    throw error;
  }
}

export async function getTodoByPosition(position: number, finished?: boolean): Promise<Todo | null> {
  console.log('[DB] Getting todo by position:', position, 'finished:', finished);
  try {
    const db = await getDatabase();
    const collection = db.collection<TodoDocument>('todos');
    const filter = finished !== undefined ? { finished } : {};
    const todos = await collection.find(filter).sort({ createdAt: 1 }).toArray();
    const todo = todos[position];
    if (!todo) {
      console.log('[DB] Todo not found at position:', position);
      return null;
    }
    console.log('[DB] Found todo at position:', position);
    return toTodo(todo);
  } catch (error) {
    console.error('[DB] Error getting todo by position:', error);
    throw error;
  }
}
