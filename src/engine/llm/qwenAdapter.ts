import axios from 'axios';
import { Recommendation, StackProfile, ApiEndpoint } from '../../shared/types';

export interface QwenConfig {
  baseUrl: string;
  apiToken?: string;
  modelName?: string;
  temperature?: number;
}

export class QwenAdapter {
  private static cleanUrl(baseUrl: string): string {
    return baseUrl.replace(/\/+$/, '');
  }

  public static async testConnection(config: QwenConfig): Promise<{ success: boolean; message: string; model?: string }> {
    if (!config.baseUrl) {
      return { success: false, message: 'Не указан URL сервера LLM' };
    }

    const clean = this.cleanUrl(config.baseUrl);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiToken) {
      headers['Authorization'] = `Bearer ${config.apiToken}`;
    }

    // Try multiple standard LiteLLM / OpenAI endpoints
    const endpointsToTry = [
      `${clean}/chat/completions`,
      `${clean}/v1/chat/completions`,
      `${clean}/models`,
      `${clean}/v1/models`,
      `${clean}/health`
    ];

    let lastError = '';

    for (const ep of endpointsToTry) {
      try {
        if (ep.endsWith('/chat/completions')) {
          const body: any = {
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 5
          };
          if (config.modelName) body.model = config.modelName;

          const response = await axios.post(ep, body, { headers, timeout: 8000 });
          if (response.status === 200) {
            return {
              success: true,
              message: 'LiteLLM / Qwen сервер успешно отвечает на запросы',
              model: config.modelName || 'LiteLLM Default Proxy Route'
            };
          }
        } else {
          const response = await axios.get(ep, { headers, timeout: 8000 });
          if (response.status === 200) {
            const modelNames = response.data?.data?.map((m: any) => m.id) || [];
            return {
              success: true,
              message: `LiteLLM прокси доступен${modelNames.length > 0 ? ` (модели: ${modelNames.slice(0, 3).join(', ')})` : ''}`,
              model: modelNames[0] || config.modelName || 'LiteLLM Proxy'
            };
          }
        }
      } catch (err: any) {
        lastError = err.response?.data?.error?.message || err.response?.data?.message || err.message;
      }
    }

    return {
      success: false,
      message: `Не удалось связаться с LiteLLM / Qwen: ${lastError || 'Connection error'}`
    };
  }

  public static async generatePromptResponse(config: QwenConfig, prompt: string): Promise<string> {
    const clean = this.cleanUrl(config.baseUrl);
    const url = clean.endsWith('/v1') ? `${clean}/chat/completions` : (clean.includes('/chat/completions') ? clean : `${clean}/chat/completions`);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiToken) {
      headers['Authorization'] = `Bearer ${config.apiToken}`;
    }

    const payload: any = {
      messages: [{ role: 'user', content: prompt }],
      temperature: config.temperature ?? 0.3,
      max_tokens: 800
    };
    if (config.modelName) {
      payload.model = config.modelName;
    }

    try {
      const response = await axios.post(url, payload, { headers, timeout: 25000 });
      return response.data?.choices?.[0]?.message?.content?.trim() || 'Ответ от LLM получен';
    } catch (err: any) {
      // If failed without /v1, try with /v1/chat/completions
      if (!clean.includes('/v1')) {
        try {
          const retryRes = await axios.post(`${clean}/v1/chat/completions`, payload, { headers, timeout: 25000 });
          return retryRes.data?.choices?.[0]?.message?.content?.trim() || 'Ответ от LLM получен';
        } catch (e: any) {
          throw new Error(e.response?.data?.error?.message || e.message);
        }
      }
      throw new Error(err.response?.data?.error?.message || err.message);
    }
  }

  public static async enrichRecommendations(
    config: QwenConfig,
    stack: StackProfile[],
    endpoints: ApiEndpoint[],
    existingRecs: Recommendation[],
    analysisRunId: string
  ): Promise<Recommendation[]> {
    if (!config.baseUrl) {
      return existingRecs;
    }

    try {
      const techList = stack.map(s => `${s.technology} (${s.category})`).join(', ');
      const endpointSummary = endpoints.slice(0, 10).map(e => `${e.method} ${e.path}`).join(', ');

      const prompt = `Ты — ведущий ИТ-архитектор. Проанализируй проект со следующим технологическим стеком:
Стек: ${techList}
Примеры API-методов: ${endpointSummary}

Сформируй 2-3 практические рекомендации по улучшению архитектуры, оптимизации слоев или повышению надежности.
Ответь строго в формате JSON списка объектов:
[
  {
    "title": "Краткий заголовок рекомендации",
    "description": "Описание архитектурного риска или возможности оптимизации",
    "severity": "high | medium | low",
    "category": "architecture | performance | modularity | security",
    "suggestedAction": "Конкретное действие по улучшению",
    "rationale": "Обоснование, почему это важно для данного стека"
  }
]`;

      const responseText = await this.generatePromptResponse(config, prompt);
      if (responseText) {
        const cleaned = responseText.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
        const aiRecsData = JSON.parse(cleaned);

        if (Array.isArray(aiRecsData)) {
          const aiRecs: Recommendation[] = aiRecsData.map((item, idx) => ({
            id: `rec-ai-${Date.now()}-${idx}`,
            analysisRunId,
            title: item.title,
            description: item.description,
            severity: item.severity || 'medium',
            category: item.category || 'architecture',
            sourceType: 'qwen_ai',
            relatedFiles: [],
            suggestedAction: item.suggestedAction,
            rationale: item.rationale,
            confidence: 0.88,
            status: 'open'
          }));

          return [...existingRecs, ...aiRecs];
        }
      }
    } catch (err: any) {
      console.warn('LiteLLM / Qwen enrichment skipped (fallback to rule-based):', err.message);
    }

    return existingRecs;
  }
}
