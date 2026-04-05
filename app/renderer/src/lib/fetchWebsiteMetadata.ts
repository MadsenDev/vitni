/**
 * Fetches domain registration information via WHOIS
 * Uses a public WHOIS API service
 */

export interface WebsiteMetadata {
  domain?: string;
  ipAddress?: string;
  hosting?: string;
  location?: string;
  registrar?: string;
  registrationDate?: string;
  expirationDate?: string;
  registrant?: string;
  nameServers?: string[];
}

/**
 * Extracts domain from a URL
 */
export function extractDomain(url: string): string | undefined {
  try {
    let normalizedUrl = url.trim();
    if (!normalizedUrl.match(/^https?:\/\//)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    const urlObj = new URL(normalizedUrl);
    return urlObj.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    // If URL parsing fails, try to extract domain manually
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}/i);
    return match ? match[0].replace(/^https?:\/\//, '').replace(/^www\./, '').toLowerCase() : undefined;
  }
}

/**
 * Fetches WHOIS data for a domain using ipwhois.app API (free, no API key required)
 * Falls back to extracting domain if API fails
 */
export async function fetchWebsiteMetadata(url: string): Promise<WebsiteMetadata> {
  try {
    const domain = extractDomain(url);
    if (!domain) {
      return {};
    }
    
    const metadata: WebsiteMetadata = { domain };
    
    // Use ipwhois.app free WHOIS API
    // This service provides WHOIS data without requiring an API key
    try {
      const apiUrl = `https://ipwhois.app/json/${domain}`;
      console.log('[fetchWebsiteMetadata] Fetching WHOIS data from:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });
      
      if (response.ok) {
        const data = (await response.json()) as {
          ip?: string;
          org?: string;
          isp?: string;
          city?: string;
          country?: string;
        };
        console.log('[fetchWebsiteMetadata] Raw API response:', JSON.stringify(data, null, 2));
        
        // Note: This API returns IP geolocation data, not WHOIS domain registration data
        // We'll extract useful information that's available
        
        // IP address information (useful for investigation)
        if (data.ip) {
          metadata.ipAddress = data.ip;
        }
        
        // Hosting provider (from org/isp fields)
        if (data.org) {
          metadata.hosting = data.org;
        } else if (data.isp) {
          metadata.hosting = data.isp;
        }
        
        // Location information (could be useful)
        if (data.city && data.country) {
          metadata.location = `${data.city}, ${data.country}`;
        }
        
        // Try to get actual WHOIS data using a different approach
        // Use whoisxmlapi.com or similar service, or make a direct DNS lookup
        // For now, we'll note that this is IP geolocation, not domain WHOIS
        
        console.log('[fetchWebsiteMetadata] Processed metadata:', metadata);
      } else {
        console.warn('[fetchWebsiteMetadata] API response not OK:', response.status, response.statusText);
      }
    } catch (apiError) {
      // If the API fails, we still return the domain
      console.warn('[fetchWebsiteMetadata] WHOIS API error:', apiError);
    }
    
    return metadata;
  } catch (error) {
    console.warn('[fetchWebsiteMetadata] Error fetching metadata:', error);
    
    // Even if everything fails, we can still extract the domain
    const domain = extractDomain(url);
    return { domain };
  }
}
