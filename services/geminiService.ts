
import { GoogleGenAI, Chat, Type } from "@google/genai";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

export const createChat = (): Chat => {
  const systemInstruction = `You are an AI assistant playing "Image Pictionary" with a user. Your persona is fun and engaging.

You will receive special "Game Event" messages from the system to guide you. This is the ONLY way you know the game's state has changed. Here's how you respond to events and user chat:

**CRITICAL RULE: HANDLING USER GUESSES IN CHAT**
- The user is supposed to guess by typing into the letter boxes, NOT by chatting with you.
- If a user types a message that looks like a guess (e.g., "is it inception?", "the answer is titanic"), you MUST NOT confirm or deny it. You do not know if they are right or wrong. Only the game system knows.
- Your ONLY response in this case is to gently redirect them to use the letter boxes.
- **Example Redirects:** "That's an interesting idea! Try typing your guess in the boxes above.", or "Looks like you have an answer in mind. Please enter it in the guess area above."
- **This is the most important rule. Do NOT reveal the answer or congratulate them. You only react to a win or loss when you receive a "Game Event" from the system.**

You will follow a strict flow based on "Game Event" messages:

1.  **New Round Thinking:**
    -   **Game Event:** You will get a message telling you to think of a new movie.
    -   **Your Task:** Respond with a short, conversational message (3-6 words) acknowledging this.
    -   **Examples:** "Okay, thinking of a good one...", "Let me see what to create...", "Alright, picking a new movie."

2.  **New Round Kick-off:**
    -   **Game Event:** You will get the movie title and your image idea.
    -   **Your Task:** Provide a short, enthusiastic kick-off message (5-8 words) to the user to start guessing.
    -   **Examples:** "My new image is ready!", "Alright, what do you think?", "Here's my latest creation."

3.  **End of Round Reaction:**
    -   **Game Event:** You will get a message stating the round has ended (win, loss, or skip) along with the answer and the original image explanation.
    -   **Your Task:** You MUST wait for this event before reacting. Your response must be conversational and ALWAYS incorporate the explanation from the event. Start by stating the outcome (e.g., "You got it!"), then the answer, then the explanation starting with "My idea was...".
    -   **Crucially, you MUST reveal the answer AND the explanation provided in the game event. This is not optional.**
    -   **Example (User Wins):** "You got it! The answer was 'Inception'. My idea was to create an image of a spinning top on a table."
    -   **Example (User Loses):** "So close! The answer was 'Inception'. My idea was to create an image of a spinning top on a table."

4.  **Level Up Celebration:**
    -   **Game Event:** The end-of-round event may also indicate the user reached a new level.
    -   **Your Task:** If so, you MUST congratulate them after your end-of-round reaction.
    -   **Example:** "You got it! The answer was 'Inception'. My idea was to create an image of a spinning top. Also, congrats on reaching Level 2! You're on a roll!"

5.  **Score & Level Awareness:**
    - **Game Context Update:** You will receive invisible updates with the user's current score and level.
    - **Your Task:** If the user asks about their score or level (e.g., "what's my score?", "what level am I on?"), use this information to answer them accurately.

General Chat Rules:
-   For any other user chat message (like asking for a clue), you can respond naturally, but never reveal the answer during a round. Give subtle, concise hints only.
-   Always respond in plain text. Do not use markdown (like **bold** or *italics*).
-   Your kick-off messages and hints should be very short. Your end-of-round messages should be more conversational and always include the explanation provided in the game event.`;

  return ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction,
    },
  });
};


export const getNewGameData = async (pastConcepts: string[], imageStyle: string) => {
    // Step 1: Generate the concept, explanation, and a detailed image prompt.
    const conceptSchema = {
        type: Type.OBJECT,
        properties: {
          concept: {
            type: Type.STRING,
            description: "The exact title of a movie to represent, with any punctuation like colons or periods removed.",
          },
          explanation: {
            type: Type.STRING,
            description: `A casual, concise, short, first-person sentence explaining your visual idea. For example: 'My idea was to focus on the iconic [object/theme] from the movie by depicting it in a ${imageStyle} style.'`,
          },
          imagePrompt: {
            type: Type.STRING,
            description: `A detailed, descriptive prompt for an AI image generator. The prompt MUST describe the image in a detailed ${imageStyle} style. It should focus on the notable and recognizable aspects of the movie (e.g., key objects, motifs, or symbolic themes). For example, if the style is 'wood carving', describe intricate details like wood grain and chisel marks. If it's 'pixel art', specify a bit-depth like '16-bit'. Do NOT include any text, letters, or numbers in the image prompt.`,
          },
        },
        required: ["concept", "explanation", "imagePrompt"],
    };
    
    let exclusionPrompt = "";
    if (pastConcepts && pastConcepts.length > 0) {
      exclusionPrompt = `\n\nIMPORTANT: Do not choose any of the following movie titles that have already been used: ${pastConcepts.join(', ')}.`;
    }

    const conceptPrompt = `You are running a game called Image Pictionary, where the user has to guess a movie title based on an AI-generated image you create.
Your task is to generate a new round for the user.

The key is to create an interesting and creative image that is guessable but not overly literal. The style for all images MUST be that of a detailed ${imageStyle}.

1.  Choose a movie.
2.  Identify its most notable and recognizable visual aspects. This could be anything from a key object, a symbolic motif, or a famous setting.
3.  Create a detailed prompt for an image generator that captures one or more of these aspects in a detailed ${imageStyle} style.
4.  Provide the movie title (concept), a brief explanation of your visual idea, and the detailed image prompt.

IMPORTANT: For the 'concept' (the movie title), you MUST remove punctuation like colons (:) or periods (.). For example, a movie like "Dr. Strangelove" should be provided as "Dr Strangelove".
Be varied in your choices, picking from iconic, obscure, and cult classic films.${exclusionPrompt}
Return the result as a JSON object matching the provided schema.
`;

    const conceptResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: conceptPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: conceptSchema,
        },
    });

    const conceptJsonText = conceptResponse.text.trim();
    let conceptData: { concept: string, explanation: string, imagePrompt: string };
    try {
        conceptData = JSON.parse(conceptJsonText);
        if (!conceptData.concept || !conceptData.explanation || !conceptData.imagePrompt) {
             throw new Error("Invalid data structure for concept from API");
        }
    } catch (e) {
        console.error("Failed to parse concept data JSON:", e);
        console.error("Received text:", conceptJsonText);
        throw new Error("The AI returned an invalid concept. Please try again.");
    }

    // Step 2: Generate the image using the prompt from Step 1.
    const imageResponse = await ai.models.generateImages({
        model: 'imagen-4.0-fast-generate-001',
        prompt: conceptData.imagePrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
    });

    if (!imageResponse.generatedImages || imageResponse.generatedImages.length === 0) {
        throw new Error("The AI failed to generate an image. Please try again.");
    }

    const base64ImageBytes: string = imageResponse.generatedImages[0].image.imageBytes;
    const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;

    // Step 3: Return all the data together.
    return {
        concept: conceptData.concept,
        explanation: conceptData.explanation,
        imageUrl: imageUrl,
    };
};
