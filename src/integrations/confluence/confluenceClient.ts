import axios, { AxiosInstance } from 'axios';
import { ConfluencePublishRequest } from '../../shared/types';

export interface ConfluenceConfig {
  baseUrl: string; // e.g. https://confluence.corp.local
  token: string;   // Personal Access Token (PAT)
}

export class ConfluenceClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(config: ConfluenceConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.client = axios.create({
      baseURL: `${this.baseUrl}/rest/api`,
      headers: {
        'Authorization': `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      },
      timeout: 20000
    });
  }

  public async testConnection(): Promise<{ success: boolean; message: string; spacesCount?: number }> {
    try {
      const spaces = await this.getSpaces();
      return {
        success: true,
        message: `Confluence Server подключен: доступно ${spaces.length} публичных пространств(а)`,
        spacesCount: spaces.length
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Не удалось авторизоваться в Confluence Server по PAT: ${err.response?.data?.message || err.message}`
      };
    }
  }

  /**
   * Get ONLY public/global spaces from Confluence Server (strictly excluding personal spaces)
   */
  public async getSpaces(): Promise<{ key: string; name: string }[]> {
    try {
      const publicSpacesMap = new Map<string, string>();

      // 1. Fetch only global public spaces with high limit
      try {
        const resGlobal = await this.client.get('/space', {
          params: { limit: 500, type: 'global' }
        });
        const items: any[] = resGlobal.data?.results || resGlobal.data?.values || [];
        items.forEach(s => {
          if (s.key && !s.key.startsWith('~') && s.type !== 'personal') {
            publicSpacesMap.set(s.key, s.name ? `${s.name} (${s.key})` : s.key);
          }
        });
      } catch (e) {
        console.warn('Confluence global spaces query fallback:', e);
      }

      // 2. Fallback if specific type parameter wasn't supported: filter manually
      if (publicSpacesMap.size === 0) {
        const resGeneric = await this.client.get('/space', { params: { limit: 500 } });
        const items: any[] = resGeneric.data?.results || resGeneric.data?.values || [];
        items.forEach(s => {
          // Strictly exclude personal spaces (~username or type personal)
          if (s.key && !s.key.startsWith('~') && s.type !== 'personal') {
            publicSpacesMap.set(s.key, s.name ? `${s.name} (${s.key})` : s.key);
          }
        });
      }

      return Array.from(publicSpacesMap.entries())
        .map(([key, name]) => ({ key, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (err: any) {
      console.warn('Confluence getSpaces error:', err.message);
      return [];
    }
  }

  public async publishReport(req: ConfluencePublishRequest, htmlContent: string): Promise<{ success: boolean; pageUrl?: string; message: string }> {
    try {
      const payload: any = {
        type: 'page',
        title: `${req.pageTitle} - ${new Date().toISOString().split('T')[0]}`,
        space: { key: req.spaceKey },
        body: {
          storage: {
            value: htmlContent,
            representation: 'storage'
          }
        }
      };

      if (req.parentPageId) {
        payload.ancestors = [{ id: req.parentPageId }];
      }

      const response = await this.client.post('/content', payload);
      const pageId = response.data?.id;
      const viewUrl = `${this.baseUrl}/pages/viewpage.action?pageId=${pageId}`;

      return {
        success: true,
        pageUrl: viewUrl,
        message: `Страница успешно опубликована в пространстве ${req.spaceKey}`
      };
    } catch (err: any) {
      return {
        success: false,
        message: `Ошибка публикации в Confluence: ${err.response?.data?.message || err.message}`
      };
    }
  }
}
