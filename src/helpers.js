// Make requests to CryptoCompare API
export async function makeApiRequest(path) {
	try {
		const response = await fetch(`http://localhost:8000/${path}`);
		return response.json();
	} catch (error) {
		throw new Error(`LocalHost request error: ${error.status}`);
	}
}

// Generate a symbol ID from a pair of the coins
export function generateSymbol(exchange, fromSymbol, toSymbol) {
	const short = `${fromSymbol}`;
	const type = `${toSymbol}`;
	const med = `${fromSymbol}-${toSymbol}`;
	return {
		short,
		med,
		type,
		full: `${exchange}:${med}`,
	};
}

export function decodeQueryParam(p) {
  return decodeURIComponent(p.replace(/\+/g, ' '));
}

export function parseFullSymbol(fullSymbol) {
	const match = fullSymbol.match(/^(\w+):(\w+)\-(\w+)$/);
	if (!match) {
		return null;
	}

	return {
		exchange: match[1],
		fromSymbol: match[2],
		toSymbol: match[3],
		fysymbol : `${match[1]}-${match[2]}-${match[3]}`,

	};
}
