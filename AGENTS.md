<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- 3D game lives in src/game (R3F); per-frame state is mutable module objects in store.ts, HUD reads a tiny subscribe store — avoids React re-renders every frame.
- Multiplayer uses one Realtime channel (presence for roster, broadcast ~10Hz for positions/fx), no DB tables — lowest latency and cost.
- Characters and music are procedural (no downloads) to keep load instant.
- vite.config.ts strips devtools `data-tsd-source` attrs from src/game files — R3F crashes on them in dev.
- Background music is the user's uploaded song (CDN asset), played via HTMLAudioElement with mute + volume.
