import { router, procedure } from '../trpc';
import { z } from 'zod';
import { supabase } from '@/utils/supabaseClient';
import { GoogleGenAI, Modality } from '@google/genai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_TEXT_MODEL = 'gemini-2.0-flash';
const GEMINI_IMAGE_MODEL = 'gemini-2.0-flash-preview-image-generation';

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

// Fix any type
type GeminiError = {
  message: string;
  code: number;
};

// Fix unused variables
const handleGeminiError = (error: GeminiError) => {
  console.error('Gemini API error:', error.message);
  throw new Error(error.message);
};

export const appRouter = router({
  hello: procedure
    .input(z.object({
      name: z.string().optional(),
    }))
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.name ?? 'world'}!`,
      };
    }),
  getMessages: procedure
    .input(z.object({ conversation_id: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', input.conversation_id)
        .order('created_at', { ascending: true });
      
      if (error) throw new Error(error.message);
      return data;
    }),
  addMessage: procedure
    .input(z.object({ 
      content: z.string(), 
      user_id: z.string(),
      conversation_id: z.string(),
      gemini_response: z.string().optional(),
      contentType: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert([{ 
          content: input.content, 
          user_id: input.user_id,
          conversation_id: input.conversation_id,
          gemini_response: input.gemini_response,
          contentType: input.contentType
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Supabase addMessage error:', error, 'Input:', input);
        throw new Error(error.message);
      }
      return data;
    }),
  geminiText: procedure
    .input(z.object({ prompt: z.string() }))
    .mutation(async ({ input }) => {
      if (!ai) throw new Error('Gemini API key not set');
      try {
        const result = await ai.models.generateContentStream({
          model: GEMINI_TEXT_MODEL,
          contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
        });
      
        let fullText = '';
        for await (const chunk of result) {
          if (chunk.text) {
            fullText += chunk.text;
          }
        }
        console.log(fullText);
        return { text: fullText };
      } catch (error) {
        if (error instanceof Error) {
          handleGeminiError({ message: error.message, code: 500 });
        }
        throw error;
      }
    }),
  geminiImage: procedure
    .input(z.object({ prompt: z.string() }))
    .mutation(async ({ input }) => {
      if (!ai) throw new Error('Gemini API key not set');
      const result = await ai.models.generateContent({
        model: GEMINI_IMAGE_MODEL,
        contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
        config: { responseModalities: [Modality.TEXT, Modality.IMAGE] },
      });
      console.log(result);
      const ok = { data: result.candidates?.[0]?.content };
      console.log(ok);
      return ok;
    }),
  createConversation: procedure
    .input(z.object({ 
      title: z.string().optional(),
      user_id: z.string()
    }))
    .mutation(async ({ input }) => {
      const { data, error } = await supabase
        .from('conversations')
        .insert([{ 
          title: input.title || 'New Chat',
          user_id: input.user_id 
        }])
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    }),
  listConversations: procedure
    .input(z.object({ user_id: z.string() }))
    .query(async ({ input }) => {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', input.user_id)
        .order('created_at', { ascending: false });
      
      if (error) throw new Error(error.message);
      return data;
    }),
  updateGeminiResponse: procedure
    .input(z.object({ message_id: z.string(), gemini_response: z.string(), contentType: z.string() }))
    .mutation(async ({ input }) => {
      console.log('Updating message', input.message_id, 'with Gemini response:', input.gemini_response);
      if(input.contentType == "image"){
        await supabase.storage
          .from("images")
          .upload("avatars/unique-name.png", input.gemini_response, { contentType: "image/png" });
      }
      const { data, error } = await supabase
        .from('messages')
        .update({ gemini_response: input.gemini_response })
        .eq('id', input.message_id)
        .select()
        .single();
      if (error) {
        console.error('Supabase updateGeminiResponse error:', error, 'Input:', input);
        throw new Error(error.message);
      }
      console.log('Update result:', data);
      return data;
    }),
  updateConversationTitle: procedure
    .input(z.object({ conversation_id: z.string(), title: z.string() }))
    .mutation(async ({ input }) => {
      const { data, error } = await supabase
        .from('conversations')
        .update({ title: input.title })
        .eq('id', input.conversation_id)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase updateConversationTitle error:', error, 'Input:', input);
        throw new Error(error.message);
      }
      return data;
    }),
});

export type AppRouter = typeof appRouter; 