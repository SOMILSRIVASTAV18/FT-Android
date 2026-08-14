export async function categorizeTransaction(description: string): Promise<string> {
  try {
    const response = await fetch('/api/gemini/categorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ description }),
    });

    if (!response.ok) {
      return "Other";
    }

    const data = await response.json();
    return data.category || "Other";
  } catch (error) {
    return "Other";
  }
}
