import { NextRequest, NextResponse } from 'next/server';
import {
  getAllTodos,
  createTodo,
  updateTodo,
  deleteTodo,
  getTodoByPosition,
  Todo,
} from './db';

interface AIResponse {
  intent: 'create' | 'delete' | 'update' | 'finished';
  title?: string;
  time?: string;
  date?: string;
  taskPosition?: number; // For delete/update/finished: 1st, 2nd, etc.
}

export async function GET() {
  console.log('[API] GET /api/todos - Request received');
  try {
    const todos = await getAllTodos();
    console.log('[API] Returning todos:', todos.length);
    return NextResponse.json({ todos });
  } catch (error) {
    console.error('[API] Error fetching todos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch todos' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('[API] POST /api/todos - Request received');
  try {
    const { text } = await request.json();
    console.log('[API] Received text:', text);

    if (!text || typeof text !== 'string') {
      console.log('[API] Error: Text is missing or invalid');
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API;
    if (!apiKey) {
      console.error('[API] Error: GEMINI_API key not configured');
      return NextResponse.json(
        { error: 'GEMINI_API key not configured' },
        { status: 500 }
      );
    }
    console.log('[API] API key found, length:', apiKey.length);

    // Construct prompt for Gemini
    console.log('[API] Constructing prompt for Gemini');
    const prompt = `You are a todo assistant. Parse the user's input and determine their intent.

User input: "${text}"

Return a JSON object with one of these structures:

If the user wants to CREATE a todo:
{
  "intent": "create",
  "title": "extracted title or description",
  "time": "extracted time if mentioned (e.g., "3pm", "14:30") or null",
  "date": "extracted date if mentioned (e.g., "tomorrow", "2024-12-25") or null"
}

If the user wants to DELETE a todo:
{
  "intent": "delete",
  "taskPosition": <number> (e.g., 1 for "first task", 2 for "2nd task", 3 for "third task")
}

If the user wants to UPDATE a todo:
{
  "intent": "update",
  "taskPosition": <number> (e.g., 1 for "first task", 2 for "2nd task", 3 for "third task"),
  "title": "new title or description",
  "time": "new time if mentioned or null",
  "date": "new date if mentioned or null"
}

If the user wants to MARK a todo as FINISHED:
{
  "intent": "finished",
  "taskPosition": <number> (e.g., 1 for "first task", 2 for "2nd task", 3 for "third task")
}

Examples:
- "reminder to cook food from now" → {"intent": "create", "title": "reminder to cook food", "time": null, "date": null}
- "delete 2nd task" → {"intent": "delete", "taskPosition": 2}
- "delete first task" → {"intent": "delete", "taskPosition": 1}
- "update 2nd task to buy groceries" → {"intent": "update", "taskPosition": 2, "title": "buy groceries", "time": null, "date": null}
- "change first task to meeting at 3pm tomorrow" → {"intent": "update", "taskPosition": 1, "title": "meeting", "time": "3pm", "date": "tomorrow"}
- "finished task 2" → {"intent": "finished", "taskPosition": 2}
- "finished 1st task" → {"intent": "finished", "taskPosition": 1}
- "meeting at 3pm tomorrow" → {"intent": "create", "title": "meeting", "time": "3pm", "date": "tomorrow"}

Return ONLY valid JSON, no other text.`;

    // Call Gemini API (Google AI Studio)
    console.log('[API] Calling Gemini API...');
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
    };
    console.log('[API] Request body:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestBody),
      }
    );
    console.log('[API] Gemini API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.text();
      console.error('[API] Gemini API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to call Gemini API' },
        { status: 500 }
      );
    }

    const data = await response.json();
    console.log('[API] Gemini API response data:', JSON.stringify(data, null, 2));
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    console.log('[API] Extracted AI text:', aiText);

    if (!aiText) {
      console.error('[API] Error: No AI text in response');
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Parse AI response (it might have markdown code blocks)
    let jsonText = aiText.trim();
    console.log('[API] Raw AI text before cleaning:', jsonText);
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    console.log('[API] Cleaned JSON text:', jsonText);

    let aiResponse: AIResponse;
    try {
      aiResponse = JSON.parse(jsonText);
      console.log('[API] Successfully parsed AI response:', aiResponse);
    } catch (parseError) {
      console.error('[API] Failed to parse AI response. Error:', parseError);
      console.error('[API] JSON text that failed to parse:', jsonText);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    console.log('[API] AI response parsed:', aiResponse);

    // Process the AI response and interact with MongoDB
    let result: { success: boolean; todo?: Todo; todos?: Todo[]; message?: string } = { success: false };

    if (aiResponse.intent === 'create') {
      console.log('[API] Processing create intent');
      const newTodo = await createTodo({
        title: aiResponse.title || text.trim(),
        time: aiResponse.time || undefined,
        date: aiResponse.date || undefined,
        createdAt: new Date(),
        finished: false,
      });
      result = { success: true, todo: newTodo };
      console.log('[API] Todo created:', newTodo.id);
    } else if (aiResponse.intent === 'delete' && aiResponse.taskPosition) {
      console.log('[API] Processing delete intent for position:', aiResponse.taskPosition);
      const position = aiResponse.taskPosition - 1;
      const todo = await getTodoByPosition(position, false);
      if (todo) {
        const deleted = await deleteTodo(todo.id);
        result = { success: deleted, message: deleted ? 'Todo deleted' : 'Failed to delete' };
        console.log('[API] Todo deleted:', todo.id);
      } else {
        result = { success: false, message: 'Todo not found' };
        console.log('[API] Todo not found at position:', position);
      }
    } else if (aiResponse.intent === 'update' && aiResponse.taskPosition) {
      console.log('[API] Processing update intent for position:', aiResponse.taskPosition);
      const position = aiResponse.taskPosition - 1;
      const todo = await getTodoByPosition(position, false);
      if (todo) {
        const updates: Partial<Todo> = {};
        if (aiResponse.title) updates.title = aiResponse.title;
        if (aiResponse.time !== undefined) updates.time = aiResponse.time || undefined;
        if (aiResponse.date !== undefined) updates.date = aiResponse.date || undefined;
        const updated = await updateTodo(todo.id, updates);
        result = { success: !!updated, todo: updated || undefined };
        console.log('[API] Todo updated:', todo.id);
      } else {
        result = { success: false, message: 'Todo not found' };
        console.log('[API] Todo not found at position:', position);
      }
    } else if (aiResponse.intent === 'finished' && aiResponse.taskPosition) {
      console.log('[API] Processing finished intent for position:', aiResponse.taskPosition);
      const position = aiResponse.taskPosition - 1;
      const todo = await getTodoByPosition(position, false);
      if (todo) {
        const updated = await updateTodo(todo.id, { finished: true });
        result = { success: !!updated, todo: updated || undefined };
        console.log('[API] Todo marked as finished:', todo.id);
      } else {
        result = { success: false, message: 'Todo not found' };
        console.log('[API] Todo not found at position:', position);
      }
    }

    // Fetch all todos to return updated list
    const allTodos = await getAllTodos();
    console.log('[API] Returning updated todos list and AI response');
    return NextResponse.json({
      ...aiResponse,
      todos: allTodos,
      result,
    });
  } catch (error) {
    console.error('[API] API route error:', error);
    if (error instanceof Error) {
      console.error('[API] Error message:', error.message);
      console.error('[API] Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
