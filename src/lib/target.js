// Set at build time by vite.artifact.config.js. Everything that only makes sense
// inside a published Claude artifact (Claude as the model, file saving through
// the viewer) is gated on this, so the local-LLM app and the artifact share one
// codebase and cannot drift apart.
export const IS_ARTIFACT = import.meta.env.VITE_TARGET === 'artifact'
