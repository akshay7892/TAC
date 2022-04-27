// Datafeed implementation, will be added later
import Datafeed from './datafeed.js';

window.tvWidget = new TradingView.widget({
	symbol: 'NSE:SBIN-EQ', // default symbol
	interval: '1', // default interval
	fullscreen: true, // displays the chart in the fullscreen mode
	container: 'tv_chart_container',
	timezone: 'Asia/Kolkata',
	datafeed: Datafeed,
	library_path: 'charting_library/',
	debug: true,
});
