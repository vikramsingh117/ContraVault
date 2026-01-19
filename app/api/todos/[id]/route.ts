import { NextRequest, NextResponse } from 'next/server';
import { updateTodo, deleteTodo, getTodoByPosition } from '../db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[API] PUT /api/todos/[id] - Request received for id:', id);
  try {
    const updates = await request.json();
    console.log('[API] Update data:', updates);
    const todo = await updateTodo(id, updates);
    if (!todo) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }
    console.log('[API] Todo updated successfully');
    return NextResponse.json({ todo });
  } catch (error) {
    console.error('[API] Error updating todo:', error);
    return NextResponse.json(
      { error: 'Failed to update todo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('[API] DELETE /api/todos/[id] - Request received for id:', id);
  try {
    const deleted = await deleteTodo(id);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Todo not found' },
        { status: 404 }
      );
    }
    console.log('[API] Todo deleted successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Error deleting todo:', error);
    return NextResponse.json(
      { error: 'Failed to delete todo' },
      { status: 500 }
    );
  }
}
