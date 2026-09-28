import type { Profile, Settings } from '$lib/types';

type Rule = chrome.declarativeNetRequest.Rule;

const { RuleActionType, ResourceType } = chrome.declarativeNetRequest;

export const PRIORITY = {
	catchAll:           1,
	whitelist:          2,
	blacklist:          3,
	override:           4,
	alwaysBlocked:      5
};

export const RULE_ID = {
	catchAll:           1,
	whitelist:          1000,
	blacklist:          2000,
	override:           3000,
	alwaysBlocked:      4000
};

const LOCALHOST = ['localhost', '127.0.0.1'];

const WEB_URL = '^https?://.*';

const isOverride = (id: number) => id >= RULE_ID.override && id < RULE_ID.alwaysBlocked;

const redirect = (id: number, priority: number, domains?: string[]): Rule => ({
	id,
	priority,
	action: {
		type: RuleActionType.REDIRECT,
		redirect: { regexSubstitution: chrome.runtime.getURL('blocked.html') + '?url=\\0' }
	},
	condition: {
		regexFilter: WEB_URL,
		resourceTypes: [ResourceType.MAIN_FRAME],
		...(domains && { requestDomains: domains })
	}
});

export const allow = (id: number, priority: number, domains: string[]): Rule => ({
	id,
	priority,
	action: { type: RuleActionType.ALLOW },
	condition: { requestDomains: domains, resourceTypes: [ResourceType.MAIN_FRAME] }
});

const build = (profile: Profile, alwaysBlocked: string[], settings: Settings): Rule[] => {
	const rules: Rule[] = [];
	const whitelistMode = profile.whitelist.length > 0;

	if (whitelistMode) {
		rules.push(redirect(RULE_ID.catchAll, PRIORITY.catchAll));
		const whitelist = settings.allowLocalhost ? [...profile.whitelist, ...LOCALHOST] : profile.whitelist;
		whitelist.forEach((domain, i) =>
			rules.push(allow(RULE_ID.whitelist + i, PRIORITY.whitelist, [domain]))
		);
	}

	profile.blacklist.forEach((domain, i) =>
		rules.push(redirect(RULE_ID.blacklist + i, PRIORITY.blacklist, [domain]))
	);
	alwaysBlocked.forEach((domain, i) =>
		rules.push(redirect(RULE_ID.alwaysBlocked + i, PRIORITY.alwaysBlocked, [domain]))
	);

	return rules;
};

const apply = async (rules: Rule[]) => {
	const current = await chrome.declarativeNetRequest.getDynamicRules();
	await chrome.declarativeNetRequest.updateDynamicRules({
		removeRuleIds: current.filter((r) => !isOverride(r.id)).map((r) => r.id),
		addRules: rules
	});
	console.log(`[rules] applied ${rules.length} rule(s)`);
};

const clear = async () => {
	const current = await chrome.declarativeNetRequest.getDynamicRules();
	await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: current.map((r) => r.id) });
	console.log('[rules] cleared');
};

export const Rules = { build, apply, clear };
