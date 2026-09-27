// The extension service worker. Chrome starts it on events and stops it when idle.
chrome.runtime.onInstalled.addListener(() => {
	console.log('serious about work: installed');
});
