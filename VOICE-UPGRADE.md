# Voice chat upgrade (human-like voice)

## Changed / new files
- js/ai-voice.js        rewritten: neural voice, speaks while the answer streams, barge-in, browser-voice fallback
- js/ai-page.js         exposes streamed tokens to other modules (Chat.hooks.token)
- js/ai-i18n.js         voice hint texts (EN + SW) mention interrupting
- ai.html               cache-bust (?v=2 / ?v=3b)
- src/handlers/assistant.js   spoken-style VOICE_PROMPT, warmer temperature, no code-mode in voice
- src/handlers/tts.js   NEW: POST /api/ai-tts  ->  audio/mpeg (Deepgram Aura via Workers AI, edge-cached)

## One step you must do: register the route
Your router file was not in the zip. Next to the line that routes /api/ai-assistant to `ask`, add:

    import { speak } from './handlers/tts.js';
    // POST /api/ai-tts  -> speak({ request, env, ctx })

Use the SAME auth / rate-limit wrapper you use for /api/ai-assistant, and pass `ctx` (the Worker's
execution context) so the edge cache can write. The `AI` binding is already used by assistant.js.

## Optional vars (wrangler.toml [vars])
- TTS_VOICE  = "thalia"            (aura-2-en speakers: thalia, luna, asteria, orion, apollo, ...)
- TTS_MODEL  = "@cf/deepgram/aura-2-en"

## Limits to know
- Kiswahili has no neural voice on Workers AI: /api/ai-tts answers 501 and the page uses the browser voice.
- Speech recognition (listening) is still the browser's (Chrome / Edge). Not available on iOS Safari.
- Barge-in works best with headphones or phones; on a laptop with loud speakers, echo can trigger it.
