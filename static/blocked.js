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

const setupOverride = async () => {
	const { alwaysBlocked = [], settings = {} } = await chrome.storage.local.get([
		'alwaysBlocked',
		'settings'
	]);
	if (alwaysBlocked.some((d) => domain === d || domain.endsWith(`.${d}`))) return;

	const form = document.getElementById('override');
	const button = document.getElementById('need');
	const end = Date.now() + (settings.overrideWaitSec ?? 30) * 1000;
	form.hidden = false;

	const tick = () => {
		const left = Math.ceil((end - Date.now()) / 1000);
		button.disabled = left > 0;
		button.textContent = left > 0 ? `I need this site (${left})` : 'I need this site';
		if (left > 0) setTimeout(tick, 250);
	};
	tick();

	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		const reason = document.getElementById('reason').value.trim();
		await chrome.runtime.sendMessage({ type: 'override', domain, reason });
		location.replace(blockedUrl);
	});
};

document.title = `Blocked: ${domain}`;
document.getElementById('domain').textContent = domain;
document.getElementById('back').addEventListener('click', backToWork);

showProfile();
setupOverride();
chrome.runtime.sendMessage({ type: 'blocked', domain });
