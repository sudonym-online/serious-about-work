// The block page. Plain JS: Vite copies static/ as-is and does not compile it.

// The redirect puts the raw URL after "?url=". URLSearchParams would split it at the first "&".
const blockedUrl = location.search.slice('?url='.length);

const getDomain = (url) => {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return url;
	}
};

const domain = getDomain(blockedUrl);

const showProfile = async () => {
	const { profiles = [], activeProfileId = null } = await chrome.storage.local.get([
		'profiles',
		'activeProfileId'
	]);
	const profile = profiles.find((p) => p.id === activeProfileId);
	document.getElementById('profile').textContent = profile ? `profile: ${profile.name}` : '';
};

const backToWork = async () => {
	await chrome.runtime.sendMessage({ type: 'openApp' });
	const tab = await chrome.tabs.getCurrent();
	if (tab?.id) chrome.tabs.remove(tab.id);
};

document.title = `Blocked: ${domain}`;
document.getElementById('domain').textContent = domain;
document.getElementById('back').addEventListener('click', backToWork);

showProfile();
chrome.runtime.sendMessage({ type: 'blocked', domain });
