# Publishing a New Version

Step-by-step guide for releasing an update to the LikeLoveHate plugin.

## Prerequisites (One-Time Setup)

1. **Enable GitHub Pages** on your repo:
   - Go to **Settings → Pages**
   - Under **Source**, select **"Deploy from a branch"**
   - Set branch to `gh-pages` / `/ (root)` and save
   - *(The `gh-pages` branch is created automatically on your first release)*

2. Verify the repository URL is `https://github.com/DrBiznes/jellyfin-likelovehate`

---

## Release Steps

### 1. Bump the version

Edit `build.yaml` in the repo root and update the version number:

```yaml
version: "1.1.0.0"   # ← change this
```

### 2. Commit and push

```bash
git add -A
git commit -m "Bump version to 1.1.0.0"
git push origin master
```

Wait for the **Build Plugin** workflow to pass (green check on GitHub).

### 3. Create a GitHub Release

1. Go to your repo → **Releases** → **Draft a new release**
2. Click **Choose a tag** → type `v1.1.0.0` → **Create new tag on publish**
3. Set the **Release title** to `v1.1.0.0`
4. Write release notes describing what changed
5. Click **Publish release**

### 4. Wait for the workflow

The **Publish Plugin** workflow will automatically:
- Build the plugin in Release mode
- Zip the DLL
- Generate the MD5 checksum
- Upload the `.zip` to your release
- Update `manifest.json` on GitHub Pages

You can monitor progress in the **Actions** tab.

### 5. Verify

After the workflow completes, confirm:

- The `.zip` file appears in your release assets
- The manifest is live at:
  ```
  https://jamino.me/jellyfin-likelovehate/manifest.json
  ```

Users with your repo added will see the update in their Jellyfin plugin catalog.

---

## Quick Reference

| What | Where |
|------|-------|
| Version number | `build.yaml` → `version` field |
| Target Jellyfin version | `build.yaml` → `targetAbi` field |
| Workflow files | `.github/workflows/build.yaml` and `publish.yaml` |
| Manifest URL | `https://jamino.me/jellyfin-likelovehate/manifest.json` |
| Plugin GUID | `a7b3c1d2-4e5f-6789-abcd-ef0123456789` |
