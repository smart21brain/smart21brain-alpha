# Image generation for Smart21Brain AI

## New / changed files
- src/handlers/image.js   NEW: POST /api/ai-image -> { image: "data:image/..;base64,..", prompt, model }
- js/ai-image.js          NEW: image studio, "Image" mode, inline pictures in chat, My images (saved on this device)
- css/ai-image.css        NEW
- js/ai-page.js           small hooks (Chat.intercept / beginTurn / paintImage), 5th welcome card
- ai.html                 header button (#imageBtn), css + js includes

## One step you must do: register the route (your router file was not in the zip)
    import { generate } from './handlers/image.js';
    // POST /api/ai-image  -> generate({ request, env, ctx })
Use the SAME auth / rate-limit wrapper as /api/ai-assistant. Image calls cost more than chat, so give this
route its own, lower limit (for example 10 pictures per user per hour).
The existing `AI` binding is used. No new secrets.

## Optional var
- IMAGE_MODEL  first-choice model id, e.g. "@cf/black-forest-labs/flux-1-schnell"

## How learners use it
1. Type "Create an image of ...", "draw a ...", "imagine ...", or "tengeneza picha ya ..." in Auto mode.
2. Tap the Image mode button: every message becomes a picture.
3. Tap the picture icon in the header: studio with 10 styles, square / wide / tall, 1-4 pictures, Surprise me,
   download, add to chat, and a My images gallery.

## Behaviour to know
- Square pictures use FLUX schnell; wide / tall use SDXL Lightning (each falls back to the other if it is down).
- The chat model rewrites the request into a clear English prompt (so Kiswahili works) and refuses unsuitable
  requests (sexual, gory, violent, hateful, real named people). A small word filter runs first. The rewrite can be
  turned off with the "Let AI improve my description" checkbox (the word filter still applies).
- Pictures are stored only in the learner's browser (IndexedDB, last 40). Chats keep a reference to the picture,
  not the picture itself.
- Not covered: editing an uploaded photo (needs an image-to-image model).
