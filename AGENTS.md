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

- StudentOS AI calls go through the server route src/routes/api/ai.ts (logic in src/lib/ai.server.ts); keep prompts and keys server-side.
- App data persists in browser storage via src/lib/local-firebase.ts (a stand-in for the original Firebase calls) until a real backend is added.
