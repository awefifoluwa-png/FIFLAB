# Deployment

## Netlify Drop — no coding needed

1. Extract the delivery ZIP.
2. Find the **netlify-ready** folder. Open it and check that it contains `index.html`, `assets/` and `fonts/` directly inside it.
3. Sign in to Netlify and open https://app.netlify.com/drop
4. Drag **netlify-ready** into the deployment area.
5. Open the generated link, select an available project name and set the project public if required by your Netlify account defaults.
6. Test in a private/incognito browser window before sharing.

Do not upload the outer delivery folder or the source folder for this manual deployment. The ready folder is already built and needs no build command. Keep its assets, fonts, header file and licence notices together.

This app uses a single entry page with internal state-based navigation, so it does not need server routes or a database. No ChatGPT login, paid API or exposed key is involved.

## Netlify from a Git repository

Upload the **contents** of source/ to your repository, connect that repository to Netlify, and use:

- Node: 22.12+ (the included configuration selects Node 22)
- Build command: `npm run build`
- Publish directory: `dist`
- Base directory: the directory containing package.json, if your repo has a parent folder

The source includes netlify.toml and package-lock.json. `npm ci` reproduces the dependency set locally. Netlify normally installs dependencies before building.

## Other static hosts

Deploy the contents of dist/ to a standard HTTPS static host. Relative Vite asset paths are configured. Keep local report fonts with the app. Serve appropriate JavaScript/CSS/font MIME types. No backend environment variables are required.

## Updates and research data

Before switching domains, origins or browser profiles, download your JSON workspace backup. Browser storage is tied to the origin. Upload updated build files to the existing project's deploy area to update the app. Do not place actual research backups, credentials or private datasets in the public deployment folder.

Netlify documentation: https://docs.netlify.com/start/quickstarts/netlify-drop-quickstart/
