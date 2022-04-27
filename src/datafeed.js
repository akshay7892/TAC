import {
	makeApiRequest,
	generateSymbol,
	parseFullSymbol,
	decodeQueryParam,
} from './helpers.js';
import {
	subscribeOnStream,
	unsubscribeFromStream,
} from './streaming.js';

const lastBarsCache = new Map();

const configurationData = {
	supported_resolutions: ['1','5','10','15','30','45','60','1D', '1W', '1M'],
	//supported_resolutions: ['1'],
	exchanges: [{
		value: 'NSE',
		name: 'NSE',
		desc: 'National Stock Exchange',
	},],
	symbols_types: [{
				// `symbolType` argument for the `searchSymbols` method, if a user selects this symbol type
		name: 'EQ',
		value: 'EQ',

		// `symbolType` argument for the `searchSymbols` method, if a user selects this symbol type

	},
	{
				// `symbolType` argument for the `searchSymbols` method, if a user selects this symbol type
		name: 'Index',
		value: 'Index',
		},
	],

};

async function getAllSymbols() {
	const data = await makeApiRequest('exchange');
	let allSymbols = [];

	for (const exchange of configurationData.exchanges) {
		const pairs = data.Data[exchange.value].pairs;

		for (const leftPairPart of Object.keys(pairs)) {
			const symbols = pairs[leftPairPart].map(rightPairPart => {
				const symbol = generateSymbol(exchange.value, leftPairPart, rightPairPart);
				return {
					symbol: symbol.short,
					full_name: symbol.full,
					description: symbol.short,
					exchange: exchange.value,
					type: symbol.type,
				};
			});
			allSymbols = [...allSymbols, ...symbols];
		}
	}
	return allSymbols;
}

export default {
	onReady: (callback) => {
		console.log('[onReady]: Method call');
		setTimeout(() => callback(configurationData));
	},

	searchSymbols: async (
		userInput,
		exchange,
		symbolType,
		onResultReadyCallback,
	) => {
		console.log('[searchSymbols]: Method call');
		const symbols = await getAllSymbols();
		console.log('symbols',symbols);
		const newSymbols = symbols.filter(symbol => {
			const isExchangeValid = exchange === '' || symbol.exchange === exchange;
			const isFullSymbolContainsInput = symbol.full_name
				.toLowerCase()
				.indexOf(userInput.toLowerCase()) !== -1;
			return isExchangeValid && isFullSymbolContainsInput;
		});
		onResultReadyCallback(newSymbols);
	},

	resolveSymbol: async (
		symbolName,
		onSymbolResolvedCallback,
		onResolveErrorCallback,
	) => {
		console.log('[resolveSymbol]: Method call', symbolName);
		const symbols = await getAllSymbols();
		const symbolItem = symbols.find(({
			full_name,
		}) => full_name === symbolName);
		if (!symbolItem) {
			console.log('[resolveSymbol]: Cannot resolve symbol', symbolName);
			onResolveErrorCallback('cannot resolve symbol');
			return;
		}
		const symbolInfo = {
			ticker: symbolItem.full_name,
			name: symbolItem.symbol,
			full_name : symbolItem.full_name,
			description: symbolItem.description,
			type: symbolItem.type,
			session: '0915-1530',
			timezone: 'Asia/Kolkata',
			exchange: symbolItem.exchange,
			minmov: 1,
			pricescale: 100,
			has_intraday: true,
			intraday_multipliers: ['1','15'],
			has_daily: true,
			daily_multipliers : ['1'],
			has_no_volume: false,
			has_weekly_and_monthly: false,
			visible_plots_set : "ohlcv",
			original_currency_code : "INR",
			supported_resolutions: ['1','5','10','15','30','45','60','1D', '1W', '1M'],
			volume_precision: 2,
			data_status: 'streaming',
		};

		console.log('[resolveSymbol]: Symbol resolved', symbolName);
		onSymbolResolvedCallback(symbolInfo);
	},

	getBars: async (symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) => {
		const { from, to, firstDataRequest } = periodParams;
		console.log('[getBars]: Method call', symbolInfo, resolution, from, to);
		const parsedSymbol = parseFullSymbol(symbolInfo.ticker);
		console.log("parsedSymbol=",parsedSymbol);
		const urlParameters = {
			//e: parsedSymbol.exchange,
			//fsym: parsedSymbol.fromSymbol,
			//tsym: parsedSymbol.toSymbol,
			fys : parsedSymbol.fysymbol,
			//fromTs:from,
			rr: resolution,
			toTs: to,
			//countBack : countBack,
			limit: 2000,
		};
		const query = Object.keys(urlParameters)
			.map(name => `${encodeURIComponent(urlParameters[name])}`)
			.join('/');

		try {
			const data = await makeApiRequest(`${query}`);
			console.log(`[getBars]: returned `,data);
			if (data.Response && data.Response === 'Error' || data.Data.length === 0) {
				// "noData" should be set if there is no data in the requested period.
				onHistoryCallback([], {
					noData: true,
				});
				return;
			}
			let bars = [];
			data.Data.forEach(bar => {
				//console.log('Data from HistAPI',data.Data);
				if (bar.time < to) {
					bars = [...bars, {
						time: bar.time * 1000,
						low: bar.low,
						high: bar.high,
						open: bar.open,
						close: bar.close,
						volume: bar.volume,
					}];
				}
			//console.log("bar.close",bar.close,"bar.volume",bar.volume);
			});
			console.log('firstDataRequest',firstDataRequest);
			if (firstDataRequest) {
				lastBarsCache.set(symbolInfo.full_name, {
					...bars[bars.length - 1],
				});
			console.log('firstDataRequest',firstDataRequest);
			}
			console.log(`[getBars]: returned ${bars.length} bar(s)`);
			onHistoryCallback(bars, {
				noData: false,
			});
		} catch (error) {
			console.log('[getBars]: Get error', error);
			onErrorCallback(error);
		}
	},

	subscribeBars: (
		symbolInfo,
		resolution,
		onRealtimeCallback,
		subscribeUID,
		onResetCacheNeededCallback,
	) => {
		console.log('[subscribeBars]: Method call with subscribeUID:', subscribeUID);
		subscribeOnStream(
			symbolInfo,
			resolution,
			onRealtimeCallback,
			subscribeUID,
			onResetCacheNeededCallback,
			lastBarsCache.get(symbolInfo.full_name),
		);
	},

	unsubscribeBars: (subscriberUID) => {
		console.log('[unsubscribeBars]: Method call with subscriberUID:', subscriberUID);
		unsubscribeFromStream(subscriberUID);
	},
};
