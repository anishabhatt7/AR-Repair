const SYSTEM_PROMPT = `You are a precision AR overlay system. You analyze device images and place visual repair annotations EXACTLY on top of the physical components visible in the image.

CRITICAL: Your annotations must be placed with PIXEL-PERFECT precision directly on the actual components you can see. Look at the image carefully. Identify the EXACT pixel location of each component (screw, cable, panel, button, tab) and place your annotation coordinates precisely there. Do NOT guess or use generic center positions. Trace the actual edges of each component.

Respond with ONLY valid JSON:
{
  "device_identified": true,
  "repair_steps": [
    {
      "step_number": 1,
      "instruction": "Pull green tab upward",
      "annotations": [
        {
          "type": "box",
          "x": 0.42,
          "y": 0.55,
          "width": 0.18,
          "height": 0.12,
          "color": "red",
          "label": "PULL THIS TAB"
        }
      ]
    }
  ],
  "tools_needed": [],
  "difficulty": "easy",
  "estimated_time": "5 minutes"
}

ANNOTATION TYPES:
- "box": Rectangle TIGHTLY wrapping a visible component. x,y = top-left of the ACTUAL component edges. width,height = EXACT size of that component in the image.
- "3d_box": Solid colored box placed OVER a part to grab/remove. Must match the part's exact position and size.
- "arrow": Direction arrow. x,y = START on the component, target_x,target_y = direction to move it. Arrow must START from the actual part.
- "circle": Ring around a small component (button, screw, port). x,y = EXACT center of that component. radius = match the component's actual size.

PRECISION RULES:
1. LOOK at where each component actually is in the image. Count its position relative to image edges.
2. The box MUST tightly wrap the component — not bigger, not offset. If a hard drive is at the right side of the image occupying 30% width starting at x=0.6, then x=0.6, width=0.3.
3. Arrows must START from the component and point in the physical direction of movement.
4. Each "label" appears ON the annotation — keep labels to 2-4 words max.
5. Use "label" on EVERY annotation to tell the user what it is and what to do.

COLORS:
- "red" = the main component being worked on (outline it)
- "green" = the handle/tab/lever the user should grab
- "yellow" = a secondary part to be aware of
- "blue" = informational reference point

INSTRUCTIONS:
- Must be under 40 characters
- Written as a direct command: "Pull tab up", "Unscrew this", "Press here"
- 3-6 steps maximum per repair`;

let abortController = null;

export function getProvider() {
  return localStorage.getItem('ar_repair_provider') || 'gemini';
}

export function setProvider(provider) {
  localStorage.setItem('ar_repair_provider', provider);
}

export function getApiKey() {
  const provider = getProvider();
  return localStorage.getItem(`ar_repair_api_key_${provider}`) || '';
}

export function setApiKey(key) {
  const provider = getProvider();
  localStorage.setItem(`ar_repair_api_key_${provider}`, key.trim());
}

export function hasApiKey() {
  return getApiKey().length > 0;
}

export async function analyzeFrame(base64Image, productInfo, problemDescription, knowledgeContext) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('No API key configured. Please add your key in Settings.');
  }

  abortController = new AbortController();

  let userPrompt = `DEVICE: ${productInfo.category || 'Unknown'} - ${productInfo.model || 'Unknown model'}\nPROBLEM: ${problemDescription}\n\n`;

  if (knowledgeContext) {
    userPrompt += `REFERENCE INFO:\n${JSON.stringify(knowledgeContext, null, 2)}\n\n`;
  }

  userPrompt += `TASK: Look at this image carefully. Identify the EXACT positions of components visible in the frame. Place annotation coordinates PRECISELY on top of the actual hardware parts you can see. Your bounding boxes must TIGHTLY wrap each component — trace its actual edges in the image. Arrows must start FROM the physical part and point in the direction of movement. Every annotation needs a short "label" that appears directly on the device telling the user what to do.`;

  const provider = getProvider();
  if (provider === 'gemini') {
    return callGemini(apiKey, base64Image, userPrompt);
  }
  return callAnthropic(apiKey, base64Image, userPrompt);
}

export function cancelAnalysis() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}

async function callAnthropic(apiKey, base64Image, userPrompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5-20241022',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: base64Image.split(',')[1]
            }
          },
          {
            type: 'text',
            text: userPrompt
          }
        ]
      }]
    }),
    signal: abortController.signal
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid Anthropic API key. Please check your key in Settings.');
    }
    if (response.status === 429) {
      throw new Error('Rate limited. Please wait a moment and try again.');
    }
    const errBody = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const textContent = data.content?.find(c => c.type === 'text')?.text;

  if (!textContent) {
    throw new Error('No response received from Anthropic.');
  }

  return parseResponse(textContent);
}

async function callGemini(apiKey, base64Image, userPrompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1]
            }
          },
          {
            text: userPrompt
          }
        ]
      }],
      generationConfig: {
        maxOutputTokens: 8192
      }
    }),
    signal: abortController.signal
  });

  if (!response.ok) {
    if (response.status === 400) {
      throw new Error('Invalid request. Check your Google API key and that Gemini API is enabled.');
    }
    if (response.status === 403) {
      throw new Error('Invalid Google API key or Gemini API not enabled. Check Settings.');
    }
    if (response.status === 429) {
      throw new Error('Rate limited. Please wait a moment and try again.');
    }
    const errBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errBody}`);
  }

  const data = await response.json();
  const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textContent) {
    throw new Error('No response received from Gemini.');
  }

  return parseResponse(textContent);
}

function parseResponse(text) {
  // Strip markdown code fences if present
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

  // Find the outermost JSON object
  let depth = 0;
  let start = -1;
  let end = -1;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (cleaned[i] === '}') {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }

  if (start === -1 || end === -1) {
    return fallbackResponse(text);
  }

  try {
    const parsed = JSON.parse(cleaned.slice(start, end));
    if (!parsed.repair_steps || !Array.isArray(parsed.repair_steps)) {
      return fallbackResponse(text);
    }
    return parsed;
  } catch (e) {
    return fallbackResponse(text);
  }
}

function fallbackResponse(text) {
  return {
    device_identified: false,
    repair_steps: [{
      step_number: 1,
      instruction: text.slice(0, 80),
      annotations: [],
      warning: null
    }],
    tools_needed: [],
    difficulty: 'moderate',
    estimated_time: 'Unknown'
  };
}
