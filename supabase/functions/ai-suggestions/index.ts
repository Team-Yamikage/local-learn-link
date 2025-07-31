import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, content, subject } = await req.json();

    let prompt = '';
    switch (type) {
      case 'question-improvement':
        prompt = `As an educational assistant, help improve this question for clarity and learning effectiveness:

Question: "${content}"
Subject: ${subject || 'General'}

Please provide:
1. An improved version of the question with better clarity
2. 3 related follow-up questions that would deepen understanding
3. Suggested tags or topics this question covers

Format your response as JSON with keys: improvedQuestion, followUpQuestions, suggestedTags`;
        break;

      case 'answer-hints':
        prompt = `As an educational tutor, provide helpful hints for this question without giving away the full answer:

Question: "${content}"
Subject: ${subject || 'General'}

Provide 3 progressive hints that guide the student toward understanding, starting with the most general approach and becoming more specific. Format as JSON with key: hints (array of strings)`;
        break;

      case 'study-plan':
        prompt = `Create a personalized study plan for this topic:

Topic: "${content}"
Subject: ${subject || 'General'}

Provide a structured study plan with:
1. Key concepts to understand
2. Recommended study sequence
3. Practice activities
4. Time estimates for each section

Format as JSON with keys: concepts, sequence, activities, timeEstimates`;
        break;

      default:
        throw new Error('Invalid suggestion type');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are an expert educational assistant. Always provide accurate, helpful, and pedagogically sound advice. Format responses as valid JSON when requested.' 
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    const suggestion = data.choices[0].message.content;

    // Try to parse as JSON, fallback to plain text
    let parsedSuggestion;
    try {
      parsedSuggestion = JSON.parse(suggestion);
    } catch {
      parsedSuggestion = { content: suggestion };
    }

    return new Response(JSON.stringify({ 
      success: true, 
      suggestion: parsedSuggestion 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-suggestions function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});