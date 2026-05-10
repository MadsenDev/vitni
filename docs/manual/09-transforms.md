# Transforms

Transforms are automated enrichment actions. You run them on a specific node and they fetch or process data from an external source, returning new assertions, nodes, or relationships.

Transforms are available in the Inspector panel when a compatible node type is selected.

## Available Transforms

**PDF Text Extract** (local)
- Applies to: Document nodes with an attached PDF file
- Output: Extracts raw text content and stores it as an assertion on the document node
- No network required

**WHOIS Lookup** (remote, requires internet)
- Applies to: Domain nodes
- Output: Fetches registration data via RDAP. Creates or links an Organization node for the registrant. Adds assertions for registrar, registration date, expiry date, and nameservers.

**DNS Lookup** (remote, requires internet)
- Applies to: Domain nodes
- Output: Queries dns.google for A, AAAA, MX, NS, TXT, and CNAME records. Adds assertions for each record type found.

**IP Lookup** (remote, requires internet)
- Applies to: IP Address nodes
- Output: Queries ipwhois.app. Returns ASN, provider name, reverse DNS, country, and city as assertions.

## Consent

Remote transforms show a consent prompt before executing. You can review what data will be sent and to which service before confirming. Results are stored as a transform source, separate from manual assertions.
