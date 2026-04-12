/**
 * Perplexity Agent API Provider Extension
 *
 * Provides access to all models available through Perplexity's Agent API gateway.
 * Perplexity's Agent API implements the OpenAI Responses API interface, so we
 * delegate to pi-ai's built-in streamSimpleOpenAIResponses.
 *
 * Models from Anthropic, OpenAI, Google, NVIDIA, xAI, and Perplexity itself
 * are all accessible through a single PERPLEXITY_API_KEY.
 *
 * Usage:
 *   export PERPLEXITY_API_KEY="your-key-here"
 *   pi -e ~/.pi/agent/extensions/perplexity
 *   Then /model to select a perplexity/* model
 */

import {
	type Api,
	type AssistantMessageEventStream,
	type Context,
	createAssistantMessageEventStream,
	type Model,
	type SimpleStreamOptions,
	streamSimpleOpenAIResponses,
} from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

// =============================================================================
// Constants
// =============================================================================

const PERPLEXITY_BASE_URL = "https://api.perplexity.ai/v1";

// =============================================================================
// Models
// =============================================================================

interface PerplexityModel {
	id: string;
	name: string;
	reasoning: boolean;
	input: ("text" | "image")[];
	cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
	contextWindow: number;
	maxTokens: number;
}

export const MODELS: PerplexityModel[] = [
	// Perplexity
	{
		id: "perplexity/sonar",
		name: "Sonar",
		reasoning: false,
		input: ["text"],
		cost: { input: 0.25, output: 2.5, cacheRead: 0.0625, cacheWrite: 0 },
		contextWindow: 128000,
		maxTokens: 8192,
	},
	// Anthropic
	{
		id: "anthropic/claude-opus-4-6",
		name: "Claude Opus 4.6",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 0 },
		contextWindow: 1000000,
		maxTokens: 128000,
	},
	{
		id: "anthropic/claude-opus-4-5",
		name: "Claude Opus 4.5",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 5, output: 25, cacheRead: 0.5, cacheWrite: 0 },
		contextWindow: 200000,
		maxTokens: 64000,
	},
	{
		id: "anthropic/claude-sonnet-4-6",
		name: "Claude Sonnet 4.6",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 0 },
		contextWindow: 1000000,
		maxTokens: 64000,
	},
	{
		id: "anthropic/claude-sonnet-4-5",
		name: "Claude Sonnet 4.5",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 0 },
		contextWindow: 200000,
		maxTokens: 64000,
	},
	{
		id: "anthropic/claude-haiku-4-5",
		name: "Claude Haiku 4.5",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 1, output: 5, cacheRead: 0.1, cacheWrite: 0 },
		contextWindow: 200000,
		maxTokens: 64000,
	},
	// OpenAI
	{
		id: "openai/gpt-5.4",
		name: "GPT-5.4",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 2.5, output: 15, cacheRead: 0.25, cacheWrite: 0 },
		contextWindow: 1000000,
		maxTokens: 128000,
	},
	{
		id: "openai/gpt-5.2",
		name: "GPT-5.2",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 1.75, output: 14, cacheRead: 0.175, cacheWrite: 0 },
		contextWindow: 256000,
		maxTokens: 128000,
	},
	{
		id: "openai/gpt-5.1",
		name: "GPT-5.1",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 1.25, output: 10, cacheRead: 0.125, cacheWrite: 0 },
		contextWindow: 400000,
		maxTokens: 128000,
	},
	{
		id: "openai/gpt-5-mini",
		name: "GPT-5 Mini",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 0.25, output: 2, cacheRead: 0.025, cacheWrite: 0 },
		contextWindow: 272000,
		maxTokens: 128000,
	},
	// Google
	{
		id: "google/gemini-3.1-pro-preview",
		name: "Gemini 3.1 Pro",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 2, output: 12, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 1000000,
		maxTokens: 65536,
	},
	{
		id: "google/gemini-3-flash-preview",
		name: "Gemini 3 Flash",
		reasoning: true,
		input: ["text", "image"],
		cost: { input: 0.5, output: 3, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 1000000,
		maxTokens: 65536,
	},
	// NVIDIA
	{
		id: "nvidia/nemotron-3-super-120b-a12b",
		name: "Nemotron 3 Super 120B",
		reasoning: true,
		input: ["text"],
		cost: { input: 0.25, output: 2.5, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 1000000,
		maxTokens: 16000,
	},
	// xAI
	{
		id: "xai/grok-4-1-fast-non-reasoning",
		name: "Grok 4.1 Fast",
		reasoning: false,
		input: ["text", "image"],
		cost: { input: 0.2, output: 0.5, cacheRead: 0.05, cacheWrite: 0 },
		contextWindow: 2000000,
		maxTokens: 8192,
	},
];

// =============================================================================
// Stream Function
//
// Delegates to pi-ai's built-in OpenAI Responses streaming implementation.
// Perplexity's Agent API is fully compatible with the OpenAI Responses API.
// =============================================================================

export function streamPerplexity(
	model: Model<Api>,
	context: Context,
	options?: SimpleStreamOptions,
): AssistantMessageEventStream {
	const stream = createAssistantMessageEventStream();

	(async () => {
		try {
			const apiKey = options?.apiKey;
			if (!apiKey) throw new Error("No Perplexity API key. Set PERPLEXITY_API_KEY.");

			const modelWithBaseUrl = { ...model, baseUrl: PERPLEXITY_BASE_URL };
			const streamOptions = { ...options, headers: { "Content-Type": "application/json" } };

			const innerStream = streamSimpleOpenAIResponses(
				modelWithBaseUrl as Model<"openai-responses">,
				context,
				streamOptions,
			);

			for await (const event of innerStream) stream.push(event);
			stream.end();
		} catch (error) {
			stream.push({
				type: "error",
				reason: "error",
				error: {
					role: "assistant",
					content: [],
					api: model.api,
					provider: model.provider,
					model: model.id,
					usage: {
						input: 0,
						output: 0,
						cacheRead: 0,
						cacheWrite: 0,
						totalTokens: 0,
						cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
					},
					stopReason: "error",
					errorMessage: error instanceof Error ? error.message : String(error),
					timestamp: Date.now(),
				},
			});
			stream.end();
		}
	})();

	return stream;
}

// =============================================================================
// Extension Entry Point
// =============================================================================

export default function (pi: ExtensionAPI) {
	pi.registerProvider("perplexity", {
		baseUrl: PERPLEXITY_BASE_URL,
		apiKey: "PERPLEXITY_API_KEY",
		api: "perplexity-agent-api",
		authHeader: true,
		models: MODELS.map(({ id, name, reasoning, input, cost, contextWindow, maxTokens }) => ({
			id,
			name,
			reasoning,
			input,
			cost,
			contextWindow,
			maxTokens,
		})),
		streamSimple: streamPerplexity,
	});
}
