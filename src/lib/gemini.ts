export async function parseSMSWithAI(body: string) {
  try {
    const response = await fetch('/api/gemini/parse-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ body }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }

    const data = await response.json();
    return data.result || null;
  } catch (error) {
    console.error("Gemini SMS parsing error:", error);
    return null;
  }
}
