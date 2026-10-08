# Unterrichtsplaner

Eine GitHub-Pages-Webseite zum Erstellen, Bearbeiten und Drucken von Unterrichtskonzeptionen für 45-minütige Deutschstunden. Die Oberfläche ruft einen Cloudflare Worker auf, der die OpenAI API sicher serverseitig verwendet.

## Architektur

- `index.html`, `styles.css`, `app.js`: statische Website für GitHub Pages
- `worker/`: Cloudflare Worker mit dem API-Endpunkt `POST /api/concept`

Der Browser erhält **niemals** den OpenAI-API-Schlüssel.

## Cloudflare Worker bereitstellen

1. Cloudflare-Konto anlegen und in `worker/` anmelden:

   ```sh
   cd worker
   npx wrangler login
   ```

2. In `app.js` die Platzhalter-URL
   `https://teach-concept-api.YOUR-SUBDOMAIN.workers.dev/api/concept`
   durch die URL des nachfolgenden Deployments ersetzen.
3. Secrets setzen. Für `ALLOWED_ORIGIN` wird die GitHub-Pages-Herkunft ohne Pfad verwendet, voraussichtlich `https://sgolzicloud.github.io`.

   ```sh
   npx wrangler secret put OPENAI_API_KEY
   npx wrangler secret put ALLOWED_ORIGIN
   npx wrangler deploy
   ```

4. Optional kann mit `npx wrangler secret put OPENAI_MODEL` ein anderes Modell als `gpt-4.1-mini` gewählt werden.

Der OpenAI-Key darf nicht in `app.js`, in Git-Commits oder als GitHub-Pages-Secret abgelegt werden.

## Schutz vor Missbrauch

Der Worker ist für die GitHub-Pages-Herkunft per CORS begrenzt. CORS allein schützt aber nicht vor direkten, automatisierten Anfragen. Lege deshalb vor der Veröffentlichung in Cloudflare eine **WAF Rate Limiting Rule** für den Pfad `/api/concept` an, beispielsweise maximal 10 Anfragen pro Minute je IP-Adresse.

## GitHub Pages bereitstellen

Aktiviere im Repository unter **Settings → Pages** als Quelle **GitHub Actions**. Der Workflow unter `.github/workflows/deploy.yml` veröffentlicht die statischen Dateien.

Nach dem ersten Deployment lautet die Seitenadresse:

```text
https://sgolzicloud.github.io/teach/
```
