// Configuration pour les APIs externes
const axios = require('axios');

// Configuration de base pour les appels API Supabase
const apiConfig = {
  // Timeout par défaut pour les requêtes
  timeout: process.env.NODE_ENV === 'development' ? 30000 : 15000,
  
  // URL de base Supabase REST API
  baseURL: process.env.API_BASE_URL || 'https://fcwficfbcrkpwnmhzztw.supabase.co/rest/v1',
  
  // Headers par défaut pour Supabase
  headers: {
    'Content-Type': 'application/json',
    'apikey': process.env.SUPABASE_ANON_KEY || '',
    'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY || ''}`,
    'Prefer': 'return=representation' // Pour retourner les données insérées
  }
};

// Configuration avec service role key pour opérations privilégiées
const serviceApiConfig = {
  timeout: process.env.NODE_ENV === 'development' ? 30000 : 15000,
  baseURL: process.env.API_BASE_URL || 'https://fcwficfbcrkpwnmhzztw.supabase.co/rest/v1',
  headers: {
    'Content-Type': 'application/json',
    'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '',
    'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || ''}`,
    'Prefer': 'return=representation'
  }
};

// Instance axios configurée
const apiClient = axios.create(apiConfig);
const serviceApiClient = axios.create(serviceApiConfig);

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getWithRetry(url, config = {}, retries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await apiClient.get(url, config);
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      const code = err?.code;

      const transient =
        code === 'ECONNABORTED' ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        (!status && !!code);

      if (!transient || attempt === retries) {
        throw err;
      }

      await sleep(300 * (attempt + 1));
    }
  }
  throw lastErr;
}

async function headWithRetry(url, config = {}, retries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await apiClient.head(url, config);
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      const code = err?.code;

      const transient =
        code === 'ECONNABORTED' ||
        status === 502 ||
        status === 503 ||
        status === 504 ||
        (!status && !!code);

      if (!transient || attempt === retries) {
        throw err;
      }

      await sleep(300 * (attempt + 1));
    }
  }
  throw lastErr;
}

// Intercepteur pour les logs (développement uniquement)
if (process.env.NODE_ENV === 'development') {
  apiClient.interceptors.request.use(request => {
    console.log(`🔗 API Request: ${request.method?.toUpperCase()} ${request.url}`);
    if (request.data) {
      console.log('📤 Data:', JSON.stringify(request.data, null, 2));
    }
    return request;
  });
  
  apiClient.interceptors.response.use(response => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  }, error => {
    console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`);
    console.error('Details:', error.response?.data || error.message);
    return Promise.reject(error);
  });
}

// Fonctions utilitaires pour les opérations Supabase
const supabaseAPI = {
  // SELECT avec filtres
  select: async (table, filters = {}, options = {}, useServiceRole = false) => {
    const params = new URLSearchParams();
    
    // Gestion des filtres
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && value.like) {
          params.append(key, `ilike.*${value.like}*`);
        } else if (typeof value === 'object' && value.gte !== undefined) {
          params.append(key, `gte.${value.gte}`);
        } else if (typeof value === 'object' && value.lte !== undefined) {
          params.append(key, `lte.${value.lte}`);
        } else if (typeof value === 'object' && value.gt !== undefined) {
          params.append(key, `gt.${value.gt}`);
        } else if (typeof value === 'object' && value.lt !== undefined) {
          params.append(key, `lt.${value.lt}`);
        } else if (typeof value === 'object' && value.neq !== undefined) {
          params.append(key, `neq.${value.neq}`);
        } else if (typeof value === 'object' && Array.isArray(value.in)) {
          const list = value.in.map((v) => String(v)).join(',');
          params.append(key, `in.(${list})`);
        } else {
          params.append(key, `eq.${value}`);
        }
      }
    });

    if (options && typeof options === 'object') {
      if (options.select && typeof options.select === 'string') {
        params.append('select', options.select);
      }

      if (options.order && typeof options.order === 'string') {
        params.append('order', options.order);
      }

      if (options.limit !== undefined && options.limit !== null) {
        const limit = parseInt(options.limit);
        if (!isNaN(limit) && limit > 0) {
          params.append('limit', String(limit));
        }
      }

      if (options.offset !== undefined && options.offset !== null) {
        const offset = parseInt(options.offset);
        if (!isNaN(offset) && offset >= 0) {
          params.append('offset', String(offset));
        }
      }
    }
    
    const url = params.toString() ? `${table}?${params.toString()}` : table;
    
    // Log pour débogage
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Supabase Query: GET ${url}`);
    }
    
    const client = useServiceRole ? serviceApiClient : apiClient;
    const response = await client.get(url);
    return response.data;
  },

  // COUNT (évite select(*)). Utilise HEAD + Prefer: count=exact et lit Content-Range.
  count: async (table, filters = {}) => {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && value.like) {
          params.append(key, `ilike.*${value.like}*`);
        } else if (typeof value === 'object' && value.gte !== undefined) {
          params.append(key, `gte.${value.gte}`);
        } else if (typeof value === 'object' && value.lte !== undefined) {
          params.append(key, `lte.${value.lte}`);
        } else if (typeof value === 'object' && value.gt !== undefined) {
          params.append(key, `gt.${value.gt}`);
        } else if (typeof value === 'object' && value.lt !== undefined) {
          params.append(key, `lt.${value.lt}`);
        } else if (typeof value === 'object' && value.neq !== undefined) {
          params.append(key, `neq.${value.neq}`);
        } else if (typeof value === 'object' && Array.isArray(value.in)) {
          const list = value.in.map((v) => String(v)).join(',');
          params.append(key, `in.(${list})`);
        } else {
          params.append(key, `eq.${value}`);
        }
      }
    });

    // PostgREST recommande select=... pour déclencher le count.
    params.append('select', 'id');

    const url = `${table}?${params.toString()}`;

    if (process.env.NODE_ENV === 'development') {
      console.log(`🔍 Supabase Query: HEAD ${url}`);
    }

    const response = await headWithRetry(url, {
      headers: {
        Prefer: 'count=exact',
      },
    });

    const contentRange = response.headers?.['content-range'] || response.headers?.['Content-Range'];
    if (typeof contentRange !== 'string') return 0;

    const total = contentRange.split('/')[1];
    const parsed = parseInt(total, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  },
  
  // INSERT
  insert: async (table, data, useServiceRole = false) => {
    const client = useServiceRole ? serviceApiClient : apiClient;
    const response = await client.post(table, data);
    return Array.isArray(response.data) ? response.data[0] : response.data;
  },
  
  // UPDATE
  update: async (table, data, filters = {}, useServiceRole = false) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      params.append(key, `eq.${value}`);
    });
    
    const url = params.toString() ? `${table}?${params.toString()}` : table;

    if (process.env.NODE_ENV === 'development') {
      console.log(`🛠 Supabase Query: PATCH ${url}`);
    }
    const client = useServiceRole ? serviceApiClient : apiClient;
    const response = await client.patch(url, data);
    return Array.isArray(response.data) ? response.data[0] : response.data;
  },
  
  // DELETE
  delete: async (table, filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object' && Array.isArray(value.in)) {
          const list = value.in.map((v) => String(v)).join(',');
          params.append(key, `in.(${list})`);
        } else {
          params.append(key, `eq.${value}`);
        }
      }
    });
    
    const url = params.toString() ? `${table}?${params.toString()}` : table;

    if (process.env.NODE_ENV === 'development') {
      console.log(`🛠 Supabase Query: DELETE ${url}`);
    }
    await apiClient.delete(url);
    return true;
  }
};

module.exports = {
  apiClient,
  serviceApiClient,
  apiConfig,
  serviceApiConfig,
  supabaseAPI
};
