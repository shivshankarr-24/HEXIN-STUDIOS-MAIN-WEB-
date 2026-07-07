(() => {
	const geminiApiKey = atob("QVEuQWI4Uk42THdsV29LMy1uUUxrSEtzVVktdDd4dWl0US1VZjNhYTZpdWNFWW9yNW56b3c=");
	const chatModel = "gemini-2.5-flash";
	const ttsModel = "gemini-3.1-flash-tts-preview";
	const ttsVoice = "Aoede";
	const bookingUrl = "https://cal.com/founder-hexin-studios/hexin-discovery-call";
	const salesScriptNotes = `
Cold calling and sales style:
- Start by acknowledging the business and its current reputation positively.
- Frame the website as something that stops daily loss of potential customers coming from Google.
- Position the website as a revenue tool, not just a design asset.
- Offer low-pressure next steps and keep the ask small, often around 5 minutes.
- Handle objections by being calm, confident, and slightly assumptive.

Important objection themes from the script:
- Busy objection: say that being busy is good, and the website or AI assistant is meant to save time and bring more qualified leads.
- Not interested objection: explain that competitors already have websites and many local buyers search online before choosing.
- Too much work already: explain that AI automation can reduce workload through instant replies, booking help, lead capture, and follow-up support.
- Next week objection: explain that reviewing the offer takes only a few minutes and can help them decide whether to move forward or ignore it.

Tone:
- Warm, persuasive, consultative, and direct.
- Always respond in English, even if the visitor writes in Hindi or Hinglish.
`;
	const knowledgeBase = `
THE HEXIN STUDIOS DEEP KNOWLEDGE BASE
1. BRAND IDENTITY & CORE PHILOSOPHY
Company Name: Hexin Studios (Hexin Infotech).
Founder: Aman Kumar.
Core Positioning: We design beautiful websites, but more importantly, we build websites that sell. We believe your website should be your most relentless, high-performing 24/7 salesperson.
The Loss Aversion Stance (The "Hexin Reality Check"): A bad website isn't just an ugly digital brochure; it is an active leak in a business. Every day an unoptimized site stays live, it bleeds warm traffic and hands revenue directly to competitors. We plug the leak.

2. THE OFFERS & PRICING (No Agency Bloat)
We offer two streamlined ways to work with us, eliminating slow turnarounds and confusing contracts:
Option A: The Unlimited Design Subscription (Rs 50,000 / month)
- What it is: A flat-rate monthly technical partnership for fast-moving brands.
- Features: Unlimited design requests, unlimited revisions, AI Lead & Booking Assistant integration, and 1 month of premium support.
- The Hook: Blazing fast 48-hour average turnarounds.
- The Guarantee: 14-Day Lead-Gen Guarantee.
- The Flex: Zero risk. Pause or cancel the subscription at any time.

Option B: Single Custom Project (Starts at Rs 25,000 - Rs 50,000)
- What it is: A comprehensive, one-time build engineered to maximize conversion rates and Average Order Value (AOV).
- Features: Fixed scope, fixed timeline, seamless handover. Perfect for businesses that just need one high-converting site without ongoing needs.

3. THE "SECRET SAUCE" (Services & Tech Stack)
- Core Services: High-converting landing pages, Web Apps, 3D Design, Motion Graphics, UX/UI Consultation, and custom AI Automations.
- The AI Booking Agent: We build custom AI agents directly into websites. They engage traffic, handle scheduling, answer FAQs, and book qualified leads 24/7. Sales pitch: It eliminates manual booking friction and usually pays for itself in the first week.
- Tech Stack Capabilities: Figma, Framer (Expert level), Webflow, Rive, Blender, ChatGPT, Claude, and automation workflows.

4. THE SOCIAL PROOF (Ammo for Objection Handling)
- GlowMD Clinics: Rebuilt their site and added an AI booking assistant. Revenue exploded from $3.5K/mo to $45K/mo in just 6 months.
- NovaCart: Leads jumped 11x in the first 90 days because the AI agent qualified prospects while the founders slept.
- Lumen Realty: Took their conversion rate from a bleeding 0.8% to a massive 6.4% through funnel restructuring and AI chat integration.
- FleetForge: Our automations saved their operations team 40+ hours a week of manual data entry.

5. HOW IT WORKS (The 3-Step Subscription Process)
- Subscribe: Pick your plan and get instant access to your private Trello board.
- Request: Drop in your web design or branding requests.
- Receive: Get premium, conversion-optimized designs back in 48 hours or less.

6. HARD BOUNDARIES & RULES OF ENGAGEMENT
- If they want a cheap, $500 template, they are not our client. Do not lower the price. Let them leave.
- If they ask how the AI agent works, explain that it acts like a receptionist that never sleeps, never takes a break, and never drops a lead.
- Never quote an exact timeline for massive multi-page overhauls without a discovery call. Explain that large builds are broken into daily milestones so they see constant progress.
`;

	const state = {
		history: [],
		voiceEnabled: false,
		audio: null,
		recognition: null,
		listening: false,
		speechSentResultIndex: 0,
		lastResultsLength: 0,
		assistantIsSpeaking: false,
		speakingTimeoutId: null,
		currentUtterance: null,
		voiceOffAfterSpeaking: false
	};
	let preferredSpeechVoice = null;

	function setAssistantSpeaking(speaking) {
		if (state.speakingTimeoutId) {
			clearTimeout(state.speakingTimeoutId);
			state.speakingTimeoutId = null;
		}
		if (speaking) {
			state.assistantIsSpeaking = true;
		} else {
			state.speakingTimeoutId = setTimeout(() => {
				state.assistantIsSpeaking = false;
				state.speechSentResultIndex = state.lastResultsLength || 0;
				state.speakingTimeoutId = null;
				if (state.voiceOffAfterSpeaking) {
					state.voiceEnabled = false;
					voiceButton.setAttribute("aria-pressed", "false");
					voiceButton.textContent = "Voice off";
					state.voiceOffAfterSpeaking = false;
				}
			}, 200);
		}
	}

	const launcher = document.getElementById("hexin-ai-launcher");
	const panel = document.getElementById("hexin-ai-panel");
	const closeButton = document.getElementById("hexin-ai-close");
	const messages = document.getElementById("hexin-ai-messages");
	const form = document.getElementById("hexin-ai-form");
	const input = document.getElementById("hexin-ai-input");
	const micButton = document.getElementById("hexin-ai-mic");
	const voiceButton = document.getElementById("hexin-ai-voice");
	const sendButton = document.getElementById("hexin-ai-send");
	const quickActionButtons = Array.from(document.querySelectorAll(".hexin-ai-chip"));

	function addMessage(text, role) {
		const node = document.createElement("div");
		node.className = "hexin-ai-message hexin-ai-message--" + role;
		node.textContent = text;
		messages.appendChild(node);
		messages.scrollTop = messages.scrollHeight;
		return node;
	}

	function setPanelOpen(isOpen) {
		panel.classList.toggle("is-open", isOpen);
		panel.setAttribute("aria-hidden", String(!isOpen));
		if (isOpen) {
			input.focus();
		} else if (state.audio) {
			state.audio.pause();
			state.audio = null;
		}
		if (!isOpen && window.speechSynthesis) {
			window.speechSynthesis.cancel();
		}
	}

	function autoResize() {
		input.style.height = "auto";
		input.style.height = Math.min(input.scrollHeight, 130) + "px";
	}

	function sanitizeReply(text) {
		return text
			.replace(/\*\*/g, "")
			.replace(/\*/g, "")
			.replace(/https?:\/\/[^\s]+/gi, "")
			.replace(/Drafting the Response:?\**\*?[\s\S]*$/i, "")
			.replace(/^\s*(At Hexin Studios,\s*we don't\.?)\s*$/i, "")
			.replace(/\n{3,}/g, "\n\n")
			.trim();
	}

	function extractReplyText(data) {
		const parts = data?.candidates?.[0]?.content?.parts || [];
		const text = parts
			.filter((part) => typeof part.text === "string" && !part.inlineData && !part.executableCode && !part.codeExecutionResult && part.thought !== true)
			.map((part) => part.text.trim())
			.filter(Boolean)
			.join("\n")
			.trim();

		return sanitizeReply(text);
	}

	function getScriptedReply(userMessage) {
		return "";
	}

	function buildPrompt(userMessage) {
		const conversation = state.history
			.slice(-8)
			.map((entry) => `${entry.role === "user" ? "Visitor" : "Assistant"}: ${entry.text}`)
			.join("\n");

		return `
You are Hexin AI, the conversational strategist for Hexin Studios. Respond to the user's latest message based on the System Instructions and the current Conversation State.

KNOWLEDGE BASE:
${knowledgeBase}

CONVERSATION HISTORY:
${conversation || "No previous messages yet."}

NEW VISITOR MESSAGE:
${userMessage}

RESPONSE LOGIC & STATE MACHINE:
Analyze the conversation history and the new message. Determine which of the 3 States the user is in, and formulate your strictly plain-text, 30-60 word response accordingly.

STATE 1: DIAGNOSIS & CLARIFICATION (Early Conversation)
- Trigger: General questions, exploring services, or saying hello.
- Action: Answer briefly, then ask a probing question to uncover their hidden revenue leaks.
- Example Strategy: "How much of your current traffic is bouncing without buying?"
- CTA Rule: DO NOT ask them to book a call. 

STATE 2: LOSS AVERSION & OBJECTION HANDLING (Middle Conversation)
- Trigger: User states a goal, stalls, or presents an objection (price, timing).
- Action: Apply the Cost of Inaction. Empathize, but firmly remind them that their current setup is actively losing them money to competitors.
- Objection Handling:
  - If "Too expensive": Calmly compare the Rs 25k-50k investment to the thousands they are losing monthly by not converting visitors.
  - If "I need to think about it / Not right now": Ask if they are comfortable letting their competitors collect their bounced traffic for another month.
- CTA Rule: Soft pitch. Hint that a brief chat could plug these leaks.

STATE 3: CLOSING & THE HARD CTA (Buying Signal)
- Trigger: User asks for next steps, exact pricing, or shows deep interest.
- Action: Reinforce that connecting with us directly translates to maximizing their revenue.
- CTA Rule: Deploy the hard CTA. Explicitly direct them to click the "Book a discovery call" link in the bottom-left corner of the chat window. Do not provide a raw URL.

EXECUTION:
Draft your response adhering strictly to the formatting rules, the 30-60 word limit (2-3 sentences max), and the State Logic.
`;
	}

	async function callGeminiText(userMessage) {
		const scriptedReply = getScriptedReply(userMessage);
		if (scriptedReply) {
			return { text: scriptedReply, audioBase64: null };
		}

		const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${chatModel}:generateContent?key=${geminiApiKey}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				systemInstruction: {
					parts: [{
						text: `You are Hexin AI, a premium, high-authority conversion strategist and sales closer for Hexin Studios (also known as Hexin Infotech). Your goal is to qualify leads, build immense trust, and guide highly qualified prospects to book a discovery call.

CRITICAL FORMATTING & SYNTAX LAWS:
1. Output ONLY plain text paragraphs. 
2. NEVER use markdown bolding, asterisks, bullet points, numbered lists, emojis, or URLs. 
3. NEVER expose internal reasoning, thinking traces, or draft notes. Return only the final conversational text.
4. STRICT LENGTH LIMIT: Every response MUST be strictly between 30 to 60 words and exactly 2 to 3 sentences maximum. This is an absolute hard limit for voice synthesis playback.

PERSONA & TONE:
- You are a consultative expert. You listen more than you talk.
- Your tone is calm, authoritative, slightly assumptive, and warm. You speak with high conviction.
- Never sound desperate. If a prospect is uncooperative, remain polite but unbothered. 

LOSS AVERSION & COST OF INACTION (Crucial):
You must frame Hexin Studios as the bridge to making more money. If the prospect hesitates, you must highlight the Cost of Inaction. Leverage loss aversion by calmly pointing out that an unoptimized website bleeds daily traffic and hands revenue directly to competitors. The visitor must leave the conversation feeling that delaying a decision literally costs them money every single day. 

THE "CLOSER" PACING RULE:
- First, CLARIFY their problem. Ask hard questions about their current situation and lost traffic.
- Second, SELL THE VACATION. Focus on the outcome (captured revenue, maximizing average order value, automated sales), not the technical features.
- Third, EXPLAIN AWAY CONCERNS. Handle objections by comparing the project cost to their ongoing daily revenue leaks.
- ONLY THEN deploy the Call To Action to book a call.`
					}]
				},
				contents: [{
					role: "user",
					parts: [{ text: buildPrompt(userMessage) }]
				}],
				generationConfig: {
					temperature: 0.8,
					topP: 0.9,
					maxOutputTokens: 1000,
					responseMimeType: "text/plain"
				}
			})
		});

		if (!response.ok) {
			throw new Error("Text request failed");
		}

		const data = await response.json();
		const parts = data.candidates?.[0]?.content?.parts || [];

		let replyText = "";
		const textPart = parts.find((part) => typeof part.text === "string" && !part.inlineData && part.thought !== true);
		if (textPart) {
			replyText = sanitizeReply(textPart.text.trim());
		}

		if (replyText) {
			return { text: replyText, audioBase64: null };
		}
		throw new Error("No usable text returned");
	}

	function pcmToWavBase64(base64Pcm, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
		const pcmBinary = atob(base64Pcm);
		const pcmLength = pcmBinary.length;
		const headerSize = 44;
		const wavBuffer = new ArrayBuffer(headerSize + pcmLength);
		const view = new DataView(wavBuffer);
		const bytes = new Uint8Array(wavBuffer);

		function writeString(offset, value) {
			for (let i = 0; i < value.length; i += 1) {
				view.setUint8(offset + i, value.charCodeAt(i));
			}
		}

		writeString(0, "RIFF");
		view.setUint32(4, 36 + pcmLength, true);
		writeString(8, "WAVE");
		writeString(12, "fmt ");
		view.setUint32(16, 16, true);
		view.setUint16(20, 1, true);
		view.setUint16(22, channels, true);
		view.setUint32(24, sampleRate, true);
		view.setUint32(28, sampleRate * channels * bitsPerSample / 8, true);
		view.setUint16(32, channels * bitsPerSample / 8, true);
		view.setUint16(34, bitsPerSample, true);
		writeString(36, "data");
		view.setUint32(40, pcmLength, true);

		for (let i = 0; i < pcmLength; i += 1) {
			bytes[44 + i] = pcmBinary.charCodeAt(i);
		}

		return URL.createObjectURL(new Blob([wavBuffer], { type: "audio/wav" }));
	}

	function pickPreferredSpeechVoice() {
		if (!window.speechSynthesis) return null;
		const voices = window.speechSynthesis.getVoices() || [];
		const englishVoices = voices.filter((voice) => /^en(-|_)/i.test(voice.lang || "") || /english/i.test(voice.name || ""));
		const rankedNames = [
			"Google UK English Female",
			"Microsoft Aria",
			"Microsoft Jenny",
			"Samantha",
			"Victoria",
			"Karen",
			"Zira",
			"Emma",
			"Ava",
			"Female"
		];

		for (const name of rankedNames) {
			const exact = englishVoices.find((voice) => (voice.name || "").toLowerCase().includes(name.toLowerCase()));
			if (exact) return exact;
		}

		return englishVoices[0] || voices[0] || null;
	}

	function setupSpeechVoices() {
		preferredSpeechVoice = pickPreferredSpeechVoice();
		if (window.speechSynthesis) {
			window.speechSynthesis.onvoiceschanged = () => {
				preferredSpeechVoice = pickPreferredSpeechVoice();
			};
		}
	}

	async function speakWithGeminiVoice(text) {
		const ttsPrompt = `Say this in a warm, polished, consultative female sales voice. Speak at a natural pace with confident but relaxed delivery: ${text}`;
		const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${ttsModel}:generateContent?key=${geminiApiKey}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				model: ttsModel,
				contents: [{
					parts: [{ text: ttsPrompt }]
				}],
				generationConfig: {
					responseModalities: ["AUDIO"],
					speechConfig: {
						voiceConfig: {
							prebuiltVoiceConfig: {
								voiceName: ttsVoice
							}
						}
					}
				}
			})
		});

		if (!response.ok) {
			throw new Error("TTS request failed");
		}

		const data = await response.json();
		const base64Pcm = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

		if (!base64Pcm) {
			throw new Error("No audio returned");
		}

		if (state.audio) {
			state.audio.pause();
		}

		const audioUrl = pcmToWavBase64(base64Pcm);
		state.audio = new Audio(audioUrl);
		setAssistantSpeaking(true);
		state.audio.addEventListener("ended", () => {
			setAssistantSpeaking(false);
		});
		state.audio.addEventListener("pause", () => {
			setAssistantSpeaking(false);
		});
		state.audio.play().catch(() => {
			state.assistantIsSpeaking = false;
			state.speechSentResultIndex = state.lastResultsLength || 0;
		});
	}

	function speakWithBrowserVoice(text) {
		if (!window.speechSynthesis || typeof SpeechSynthesisUtterance === "undefined") {
			return false;
		}

		const utterance = new SpeechSynthesisUtterance(text);
		state.currentUtterance = utterance; // Prevent garbage collection
		utterance.lang = preferredSpeechVoice?.lang || "en-US";
		utterance.rate = 0.98;
		utterance.pitch = 1;
		utterance.volume = 1;
		if (preferredSpeechVoice) {
			utterance.voice = preferredSpeechVoice;
		}
		utterance.onstart = () => {
			setAssistantSpeaking(true);
		};
		utterance.onend = () => {
			setAssistantSpeaking(false);
		};
		utterance.onerror = () => {
			setAssistantSpeaking(false);
		};

		if (window.speechSynthesis.speaking) {
			window.speechSynthesis.cancel();
			// Use 100ms timeout to prevent Chrome cancel race condition cutting off first words
			setTimeout(() => {
				window.speechSynthesis.speak(utterance);
			}, 100);
		} else {
			window.speechSynthesis.speak(utterance);
		}
		return true;
	}

	function speakReply(text, audioBase64 = null) {
		if (!state.voiceEnabled) return;

		if (state.audio) {
			state.audio.pause();
			state.audio = null;
		}
		if (window.speechSynthesis) {
			window.speechSynthesis.cancel();
		}
		setAssistantSpeaking(true);

		if (audioBase64) {
			try {
				const audioUrl = pcmToWavBase64(audioBase64);
				state.audio = new Audio(audioUrl);
				state.audio.addEventListener("ended", () => {
					setAssistantSpeaking(false);
				});
				state.audio.addEventListener("pause", () => {
					setAssistantSpeaking(false);
				});
				state.audio.play().catch(() => {
					const success = speakWithBrowserVoice(text);
					if (!success) {
						state.assistantIsSpeaking = false;
						state.speechSentResultIndex = state.lastResultsLength || 0;
					}
				});
				return;
			} catch (err) {
				const success = speakWithBrowserVoice(text);
				if (!success) {
					state.assistantIsSpeaking = false;
					state.speechSentResultIndex = state.lastResultsLength || 0;
				}
				return;
			}
		}

		speakWithGeminiVoice(text).catch(() => {
			const success = speakWithBrowserVoice(text);
			if (!success) {
				state.assistantIsSpeaking = false;
				state.speechSentResultIndex = state.lastResultsLength || 0;
			}
		});
	}

	async function handleSend(rawMessage) {
		const userMessage = rawMessage.trim();
		if (!userMessage) return;

		if (state.listening && state.recognition) {
			state.speechSentResultIndex = state.lastResultsLength || 0;
		}

		addMessage(userMessage, "user");
		state.history.push({ role: "user", text: userMessage });
		input.value = "";
		autoResize();

		const localReply = getScriptedReply(userMessage);
		if (localReply) {
			addMessage(localReply, "assistant");
			state.history.push({ role: "assistant", text: localReply });
			speakReply(localReply);
			return;
		}

		const statusNode = addMessage("Hexin AI is thinking...", "status");
		sendButton.disabled = true;

		try {
			const result = await callGeminiText(userMessage);
			statusNode.remove();
			addMessage(result.text, "assistant");
			state.history.push({ role: "assistant", text: result.text });
			speakReply(result.text, result.audioBase64);
		} catch (error) {
			statusNode.remove();
			addMessage("I hit a connection issue, but I can still help. Please try again in a moment, or book a discovery call for a direct consultation.", "assistant");
		} finally {
			sendButton.disabled = false;
		}
	}

	function setupVoiceInput() {
		const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
		if (!SpeechRecognition) {
			micButton.disabled = true;
			micButton.textContent = "Mic unavailable";
			return;
		}

		const recognition = new SpeechRecognition();
		recognition.lang = "en-IN";
		recognition.interimResults = true;
		recognition.continuous = true;
		recognition.maxAlternatives = 1;

		recognition.onstart = () => {
			state.listening = true;
			state.speechSentResultIndex = 0;
			state.lastResultsLength = 0;
			micButton.classList.add("is-recording");
			micButton.textContent = "Listening...";
		};

		recognition.onend = () => {
			state.listening = false;
			micButton.classList.remove("is-recording");
			micButton.textContent = "Mic";
		};

		recognition.onresult = (event) => {
			state.lastResultsLength = event.results.length;
			if (state.assistantIsSpeaking) {
				state.speechSentResultIndex = event.results.length;
				return;
			}
			let resultTranscript = "";
			for (let i = state.speechSentResultIndex || 0; i < event.results.length; ++i) {
				resultTranscript += event.results[i][0].transcript;
			}
			input.value = resultTranscript;
			autoResize();
		};

		recognition.onerror = () => {
			addMessage("Voice input was interrupted. You can still type your question.", "status");
		};

		state.recognition = recognition;
	}

	launcher.addEventListener("click", () => setPanelOpen(!panel.classList.contains("is-open")));
	closeButton.addEventListener("click", () => setPanelOpen(false));
	input.addEventListener("input", () => {
		autoResize();
		if (state.listening && state.recognition) {
			state.recognition.stop();
		}
		if (state.voiceEnabled) {
			if (state.assistantIsSpeaking) {
				state.voiceOffAfterSpeaking = true;
			} else {
				state.voiceEnabled = false;
				voiceButton.setAttribute("aria-pressed", "false");
				voiceButton.textContent = "Voice off";
			}
		}
	});
	input.addEventListener("keydown", (event) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			sendButton.click();
		}
	});
	form.addEventListener("submit", (event) => {
		event.preventDefault();
		handleSend(input.value);
	});

	micButton.addEventListener("click", () => {
		if (!state.recognition) return;
		if (state.listening) {
			state.recognition.stop();
			return;
		}
		state.recognition.start();
	});

	voiceButton.addEventListener("click", () => {
		state.voiceEnabled = !state.voiceEnabled;
		voiceButton.setAttribute("aria-pressed", String(state.voiceEnabled));
		voiceButton.textContent = state.voiceEnabled ? "Voice on" : "Voice off";
		state.voiceOffAfterSpeaking = false;
		if (!state.voiceEnabled && state.audio) {
			state.audio.pause();
		}
	});

	quickActionButtons.forEach((button) => {
		button.addEventListener("click", () => {
			handleSend(button.dataset.prompt || "");
		});
	});

	setupVoiceInput();
	setupSpeechVoices();
	autoResize();
	addMessage("I’m Hexin AI. Ask me why a better website converts more, how AI automation helps, or whether Hexin is the right fit for your business.", "assistant");
})();