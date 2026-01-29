/**
 * Mock data for demo purposes
 *
 * Used when Pump.fun API is unavailable
 */

import { PumpFunToken } from "./types";

// Use a fixed base timestamp for consistent rendering (server/client)
// This prevents hydration mismatches
const BASE_TIMESTAMP = 1706500000000; // Fixed timestamp

// Generate realistic-looking mock tokens
export const MOCK_TOKENS: PumpFunToken[] = [
  {
    mint: "7iT1GRYYhEop2nV1dyCwvpYaj6SeqEkRT3kD7UPxpump",
    name: "PEPE 2.0",
    symbol: "PEPE2",
    description: "The next generation of PEPE. Built different.",
    image_uri: "",
    metadata_uri: "",
    creator: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    created_timestamp: BASE_TIMESTAMP - 3600000 * 2, // 2 hours before base
    market_cap: 45000,
    usd_market_cap: 4500000,
    complete: false,
    virtual_sol_reserves: 30,
    virtual_token_reserves: 800000000,
    reply_count: 156,
  },
  {
    mint: "9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgBsV",
    name: "Solana Dog",
    symbol: "SDOG",
    description: "The goodest boy on Solana. Much wow, very fast.",
    image_uri: "",
    metadata_uri: "",
    creator: "8yLXtg3DX98e08UYKTEqC6kBlic9Un8B94UAstHtCdW",
    created_timestamp: BASE_TIMESTAMP - 3600000 * 5, // 5 hours before base
    market_cap: 82000,
    usd_market_cap: 8200000,
    complete: false,
    virtual_sol_reserves: 55,
    virtual_token_reserves: 650000000,
    reply_count: 289,
  },
  {
    mint: "3aLMtf4DY09f08VZKUFrD7lCmid0Wo9C05WCtJvEdXW",
    name: "MOON CAT",
    symbol: "MCAT",
    description: "Cats go to the moon too. Join the feline revolution.",
    image_uri: "",
    metadata_uri: "",
    creator: "5zNPth5EZ19g09YZLUGsE8mDnif1Xp0D16XDvKwFeYX",
    created_timestamp: BASE_TIMESTAMP - 3600000 * 1, // 1 hour before base
    market_cap: 28000,
    usd_market_cap: 2800000,
    complete: false,
    virtual_sol_reserves: 20,
    virtual_token_reserves: 900000000,
    reply_count: 87,
  },
  {
    mint: "4bNOug5FZ20h10WaLVHtF9oDoje2Yq0E27YEvMGgZY0",
    name: "AI Agent Token",
    symbol: "AGENT",
    description: "Powered by artificial intelligence. The future is autonomous.",
    image_uri: "",
    metadata_uri: "",
    creator: "6aQRui6GA21i11XbMWItG0bEpke3Zr1F38ZFwNHhbZ1",
    created_timestamp: BASE_TIMESTAMP - 3600000 * 8, // 8 hours before base
    market_cap: 125000,
    usd_market_cap: 12500000,
    complete: false,
    virtual_sol_reserves: 78,
    virtual_token_reserves: 550000000,
    reply_count: 534,
  },
  {
    mint: "5cOPvh6GA31j12YbNWJuH1cFqlf4As2G49aGxOIicA2",
    name: "Phantom Ghost",
    symbol: "GHOST",
    description: "Invisible gains. You cant see us coming.",
    image_uri: "",
    metadata_uri: "",
    creator: "7bRSvj7HB32k13ZcOXKvI2dGrmg5Bt3H5AbHyPJjdB3",
    created_timestamp: BASE_TIMESTAMP - 3600000 * 12, // 12 hours before base
    market_cap: 67000,
    usd_market_cap: 6700000,
    complete: false,
    virtual_sol_reserves: 45,
    virtual_token_reserves: 720000000,
    reply_count: 312,
  },
  {
    mint: "6dPQwi7HC42l14adPYLwJ3eHsnf6Cu4I6BcIzRKkeC4",
    name: "WAGMI Protocol",
    symbol: "WAGMI",
    description: "We are all gonna make it. Community first.",
    image_uri: "",
    metadata_uri: "",
    creator: "8cSTxk8IC53m24beQZMxK4fItnb7Du5J7CdJaRLlfD5",
    created_timestamp: BASE_TIMESTAMP - 3600000 * 4, // 4 hours before base
    market_cap: 53000,
    usd_market_cap: 5300000,
    complete: false,
    virtual_sol_reserves: 35,
    virtual_token_reserves: 780000000,
    reply_count: 198,
  },
  {
    mint: "7eSRxj8JD53n25cfRaNyL5gJupg8Ev6K8DeKbTMmfE6",
    name: "Based Labs",
    symbol: "BASED",
    description: "Research. Build. Based. The lab is open.",
    image_uri: "",
    metadata_uri: "",
    creator: "9dTUzl9KD64o35dgSBOzM6gKvqc9Fw7L9EfLcUNngF7",
    created_timestamp: BASE_TIMESTAMP - 3600000 * 6, // 6 hours before base
    market_cap: 71000,
    usd_market_cap: 7100000,
    complete: false,
    virtual_sol_reserves: 48,
    virtual_token_reserves: 700000000,
    reply_count: 267,
  },
  {
    mint: "8fTSyl9KE64p36egTCPzN7hLwrh0Gx8M0FgMdVOohG8",
    name: "Degen Finance",
    symbol: "DEGEN",
    description: "For the degens, by the degens. Ape responsibly.",
    image_uri: "",
    metadata_uri: "",
    creator: "0eUVAm0LE75q46fhUDQaN8iMxsd1Hz9N1GhNeWPpiH9",
    created_timestamp: BASE_TIMESTAMP - 3600000 * 3, // 3 hours before base
    market_cap: 39000,
    usd_market_cap: 3900000,
    complete: false,
    virtual_sol_reserves: 28,
    virtual_token_reserves: 850000000,
    reply_count: 145,
  },
  {
    mint: "9gUTzm0LF75r47fhVERaO9jNytd2Ja0O2HiOfXQqiI0",
    name: "Solana Summer",
    symbol: "SUMMER",
    description: "Its always summer on Solana. Touch grass, earn SOL.",
    image_uri: "",
    metadata_uri: "",
    creator: "1fVWBn1MF86s58giWFScP0kOzue3Ka1P3JjPgYRrjJ1",
    created_timestamp: BASE_TIMESTAMP - 3600000 * 10, // 10 hours before base
    market_cap: 94000,
    usd_market_cap: 9400000,
    complete: false,
    virtual_sol_reserves: 62,
    virtual_token_reserves: 620000000,
    reply_count: 423,
  },
  {
    mint: "0hVUAn2NG86t58hjXGTbP1kPzvd4Lb2Q4KkQhZSskK2",
    name: "Privacy Coin",
    symbol: "PRIV",
    description: "Your transactions, your business. Stay anonymous.",
    image_uri: "",
    metadata_uri: "",
    creator: "2gWXCo2OH97u69ikYHUdQ2lRAwf5Mc3R5LlRjaTttL3",
    created_timestamp: BASE_TIMESTAMP - 3600000 * 7, // 7 hours before base
    market_cap: 58000,
    usd_market_cap: 5800000,
    complete: false,
    virtual_sol_reserves: 40,
    virtual_token_reserves: 750000000,
    reply_count: 234,
  },
  {
    mint: "1iWVBo3PH97v69jlZIVcQ2mSBxg6Nd4S6MmSkbUuuM4",
    name: "Bonk 2.0",
    symbol: "BONK2",
    description: "The bonking continues. Harder. Better. Faster. Bonkier.",
    image_uri: "",
    metadata_uri: "",
    creator: "3hXYDp3QI08w70kmaNJeR3nTCyi7Pe5T7NnTlcVwwN5",
    created_timestamp: BASE_TIMESTAMP - 3600000 * 0.5, // 30 min before base
    market_cap: 18000,
    usd_market_cap: 1800000,
    complete: false,
    virtual_sol_reserves: 15,
    virtual_token_reserves: 950000000,
    reply_count: 42,
  },
  {
    mint: "2jXWCp4QI98x81lnbKWeS4oUDzh8Qf6U8OoUmeWxxO6",
    name: "Jupiter Clone",
    symbol: "JUP2",
    description: "Like Jupiter, but different. Aggregated liquidity.",
    image_uri: "",
    metadata_uri: "",
    creator: "4iYZEq4RJ19y82moaCLfT5pVEAk9Rg7W9PoWofYyyP7",
    created_timestamp: BASE_TIMESTAMP - 3600000 * 9, // 9 hours before base
    market_cap: 87000,
    usd_market_cap: 8700000,
    complete: false,
    virtual_sol_reserves: 58,
    virtual_token_reserves: 640000000,
    reply_count: 378,
  },
];

// Get mock tokens sorted by market cap
export function getMockTrendingTokens(limit: number = 50): PumpFunToken[] {
  return [...MOCK_TOKENS]
    .sort((a, b) => b.market_cap - a.market_cap)
    .slice(0, limit);
}

// Get mock tokens sorted by creation time (newest first)
export function getMockNewTokens(limit: number = 50): PumpFunToken[] {
  return [...MOCK_TOKENS]
    .sort((a, b) => b.created_timestamp - a.created_timestamp)
    .slice(0, limit);
}

// Search mock tokens
export function searchMockTokens(query: string): PumpFunToken[] {
  const lowerQuery = query.toLowerCase();
  return MOCK_TOKENS.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.symbol.toLowerCase().includes(lowerQuery)
  );
}

// Get a specific mock token
export function getMockToken(mint: string): PumpFunToken | undefined {
  return MOCK_TOKENS.find((t) => t.mint === mint);
}
