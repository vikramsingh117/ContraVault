'use client';

import { useState, useEffect, useRef } from 'react';

interface Todo {
  id: string;
  title: string;
  time?: string;
  date?: string;
  createdAt: Date;
  finished?: boolean;
}

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editDate, setEditDate] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTodos = async () => {
    console.log('[Frontend] Fetching todos from database');
    try {
      const response = await fetch('/api/todos');
      if (!response.ok) {
        throw new Error('Failed to fetch todos');
      }
      const data = await response.json();
      console.log('[Frontend] Fetched todos:', data.todos?.length || 0);
      // Convert date strings back to Date objects
      const todosWithDates = (data.todos || []).map((todo: Todo) => ({
        ...todo,
        createdAt: new Date(todo.createdAt),
      }));
      setTodos(todosWithDates);
    } catch (error) {
      console.error('[Frontend] Error fetching todos:', error);
    }
  };

  const processInput = async (text: string) => {
    console.log('[Frontend] processInput called with text:', text);
    if (!text.trim() || isProcessing) {
      console.log('[Frontend] Skipping - text empty or already processing');
      return;
    }

    console.log('[Frontend] Setting processing state to true');
    setIsProcessing(true);
    try {
      console.log('[Frontend] Sending request to /api/todos');
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: text.trim() }),
      });

      console.log('[Frontend] Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Frontend] Response not OK:', errorText);
        throw new Error('Failed to process input');
      }

      const data = await response.json();
      console.log('[Frontend] Received data from API:', data);

      // Update todos from the database response
      if (data.todos) {
        console.log('[Frontend] Updating todos from database response');
        const todosWithDates = data.todos.map((todo: Todo) => ({
          ...todo,
          createdAt: new Date(todo.createdAt),
        }));
        setTodos(todosWithDates);
      }

      setInput('');
      console.log('[Frontend] Input cleared');
    } catch (error) {
      console.error('[Frontend] Error processing input:', error);
      if (error instanceof Error) {
        console.error('[Frontend] Error message:', error.message);
        console.error('[Frontend] Error stack:', error.stack);
      }
    } finally {
      console.log('[Frontend] Setting processing state to false');
      setIsProcessing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    console.log('[Frontend] Input changed, new value:', value);
    setInput(value);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      console.log('[Frontend] Clearing existing timeout');
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout for 2 seconds
    console.log('[Frontend] Setting new 2-second timeout');
    typingTimeoutRef.current = setTimeout(() => {
      console.log('[Frontend] Timeout fired, processing input');
      if (value.trim()) {
        processInput(value);
      } else {
        console.log('[Frontend] Timeout fired but value is empty, skipping');
      }
    }, 2000);
  };

  // Fetch todos on mount
  useEffect(() => {
    console.log('[Frontend] Component mounted, fetching todos');
    fetchTodos();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    console.log('[Frontend] Setting up cleanup');
    return () => {
      console.log('[Frontend] Component unmounting, cleaning up timeout');
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  // Log todos changes
  useEffect(() => {
    console.log('[Frontend] Todos updated, count:', todos.length);
    console.log('[Frontend] Current todos:', todos);
  }, [todos]);

  const handleDelete = async (id: string) => {
    console.log('[Frontend] Manual delete triggered for todo id:', id);
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete todo');
      }
      console.log('[Frontend] Todo deleted successfully, fetching updated list');
      await fetchTodos();
    } catch (error) {
      console.error('[Frontend] Error deleting todo:', error);
    }
  };

  const handleEdit = (todo: Todo) => {
    console.log('[Frontend] Manual edit triggered for todo:', todo);
    setEditingId(todo.id);
    setEditTitle(todo.title);
    setEditTime(todo.time || '');
    setEditDate(todo.date || '');
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    console.log('[Frontend] Saving edit for todo id:', editingId);
    try {
      const updates: Partial<Todo> = {};
      if (editTitle.trim()) updates.title = editTitle.trim();
      if (editTime.trim()) updates.time = editTime.trim();
      else updates.time = undefined;
      if (editDate.trim()) updates.date = editDate.trim();
      else updates.date = undefined;

      const response = await fetch(`/api/todos/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error('Failed to update todo');
      }
      console.log('[Frontend] Todo updated successfully, fetching updated list');
      await fetchTodos();
      setEditingId(null);
      setEditTitle('');
      setEditTime('');
      setEditDate('');
      console.log('[Frontend] Edit saved and form cleared');
    } catch (error) {
      console.error('[Frontend] Error updating todo:', error);
    }
  };

  const handleCancelEdit = () => {
    console.log('[Frontend] Edit cancelled');
    setEditingId(null);
    setEditTitle('');
    setEditTime('');
    setEditDate('');
  };

  const handleFinish = async (id: string) => {
    console.log('[Frontend] Manual finish triggered for todo id:', id);
    try {
      const response = await fetch(`/api/todos/${id}/finish`, {
        method: 'PATCH',
      });
      if (!response.ok) {
        throw new Error('Failed to finish todo');
      }
      console.log('[Frontend] Todo finished successfully, fetching updated list');
      await fetchTodos();
    } catch (error) {
      console.error('[Frontend] Error finishing todo:', error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col py-16 px-8 sm:px-16">
        <div className="w-full">
          <h1 className="mb-8 text-3xl font-semibold text-black dark:text-zinc-50">
            Todo List
          </h1>

          <div className="mb-8">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="Type a todo, 'delete 2nd task', 'update 1st task to...', or 'finished task 2'..."
              className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base text-black placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-400 dark:focus:border-zinc-500"
              autoFocus
              disabled={isProcessing}
            />
            {isProcessing && (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Processing...
              </p>
            )}
          </div>

          {/* Active Todos */}
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
              Active Tasks
            </h2>
            <div className="space-y-2">
              {todos.filter((t) => !t.finished).length === 0 ? (
                <p className="text-zinc-500 dark:text-zinc-400">
                  No active todos. Start typing to add one!
                </p>
              ) : (
                todos
                  .filter((t) => !t.finished)
                  .map((todo, index) => (
                <div
                  key={todo.id}
                  className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  {editingId === todo.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                          Title
                        </label>
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-400 dark:focus:border-zinc-500"
                          autoFocus
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Date
                          </label>
                          <input
                            type="text"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            placeholder="e.g., tomorrow"
                            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-400 dark:focus:border-zinc-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                            Time
                          </label>
                          <input
                            type="text"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                            placeholder="e.g., 3pm"
                            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-black placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder-zinc-400 dark:focus:border-zinc-500"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveEdit}
                          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <span className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                        {index + 1}.
                      </span>
                      <div className="flex-1">
                        <p className="text-base font-medium text-black dark:text-zinc-50">
                          {todo.title}
                        </p>
                        {(todo.time || todo.date) && (
                          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {todo.date && <span>{todo.date}</span>}
                            {todo.date && todo.time && <span> • </span>}
                            {todo.time && <span>{todo.time}</span>}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleFinish(todo.id)}
                          className="rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-50 dark:border-green-700 dark:bg-zinc-900 dark:text-green-400 dark:hover:bg-green-900/20"
                        >
                          Finish
                        </button>
                        <button
                          onClick={() => handleEdit(todo)}
                          className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(todo.id)}
                          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                  ))
              )}
            </div>
          </div>

          {/* Finished Todos */}
          {todos.filter((t) => t.finished).length > 0 && (
            <div>
              <h2 className="mb-4 text-xl font-semibold text-black dark:text-zinc-50">
                Finished Tasks
              </h2>
              <div className="space-y-2">
                {todos
                  .filter((t) => t.finished)
                  .map((todo, index) => (
                    <div
                      key={todo.id}
                      className="rounded-lg border border-zinc-200 bg-white p-4 opacity-75 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                          {index + 1}.
                        </span>
                        <div className="flex-1">
                          <p className="text-base font-medium text-black line-through dark:text-zinc-50">
                            {todo.title}
                          </p>
                          {(todo.time || todo.date) && (
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400 line-through">
                              {todo.date && <span>{todo.date}</span>}
                              {todo.date && todo.time && <span> • </span>}
                              {todo.time && <span>{todo.time}</span>}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleDelete(todo.id)}
                            className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-zinc-900 dark:text-red-400 dark:hover:bg-red-900/20"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
