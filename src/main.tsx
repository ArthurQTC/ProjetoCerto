import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global fetch interceptor to automatically inject the Auth token and prevent HTML JSON parsing errors
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  let token = localStorage.getItem("auth_token");
  if (token) {
    init = init || {};
    init.headers = {
      ...init.headers,
      "Authorization": `Bearer ${token}`
    };
  }
  
  try {
    const response = await originalFetch(input, init);
    const urlString = typeof input === "string" ? input : (input instanceof URL ? input.href : input.url);
    
    // Check if it's a local API request
    const isLocalApi = urlString.startsWith("/api/") || 
                        urlString.startsWith("api/") || 
                        (urlString.includes("/api/") && (urlString.startsWith(window.location.origin) || !urlString.startsWith("http")));
                        
    if (isLocalApi) {
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
        console.warn(`[Fetch Interceptor] API request to ${urlString} returned HTML instead of JSON. Overriding to prevent client crash.`);
        
        const mockErrorBody = JSON.stringify({
          error: "Servidor temporariamente indisponível ou rota não encontrada (404/500).",
          details: "O servidor retornou uma página HTML em vez de dados JSON.",
          status: response.status
        });
        
        return new Response(mockErrorBody, {
          status: response.status >= 200 && response.status < 300 ? 500 : response.status,
          statusText: response.statusText || "Internal Server Error (HTML response)",
          headers: {
            "Content-Type": "application/json"
          }
        });
      }
    }
    
    return response;
  } catch (error) {
    throw error;
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
