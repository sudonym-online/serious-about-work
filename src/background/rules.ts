import type { Profile, Settings } from '$lib/types';

type Rule = chrome.declarativeNetRequest.Rule;

const { RuleActionType, ResourceType } = chrome.declarativeNetRequest;

export const PRIORITY = {
	catchAll:           1,
	allowed:            2,
	blocked:            3,
	override:           4,
	alwaysBlocked:      5
};

export const RULE_ID = {
	catchAll:           1,
	allowed:            1000,
	blocked:            2000,
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
	const whitelist = profile.allowed.length > 0;

	if (whitelist) {
		rules.push(redirect(RULE_ID.catchAll, PRIORITY.catchAll));
		const allowed = settings.allowLocalhost ? [...profile.allowed, ...LOCALHOST] : profile.allowed;
		allowed.forEach((domain, i) => rules.push(allow(RULE_ID.allowed + i, PRIORITY.allowed, [domain])));
	}

	profile.blocked.forEach((domain, i) =>
		rules.push(redirect(RULE_ID.blocked + i, PRIORITY.blocked, [domain]))
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
