# 👍 LikeLoveHate — Jellyfin Plugin

A Jellyfin plugin that adds **Like**, **Love**, and **Hate** reaction buttons to media item detail pages using Google Material Design icons.

![Jellyfin](https://img.shields.io/badge/Jellyfin-10.9+-00a4dc?style=flat-square&logo=jellyfin)
![.NET](https://img.shields.io/badge/.NET-9.0-512bd4?style=flat-square&logo=dotnet)
![License](https://img.shields.io/badge/License-GPL--3.0-blue?style=flat-square)

## Features

- 🎯 **Three reactions** — Like (👍), Love (👍👍), Hate (👎) with Material Design icons
- 💉 **Auto-injected UI** — Reaction buttons appear on every media detail page
- 👥 **Community reactions** — See what other users on your server thought
- 📊 **Aggregate counts** — Like/Love/Hate totals at a glance
- 🔄 **Toggle behavior** — Click again to remove your reaction
- 📦 **JSON export** — Export all reaction data from the config page

## Installation

### From Repository (Recommended)

1. In Jellyfin, go to **Dashboard → Plugins → Repositories**
2. Click **Add** and paste:
   ```
   https://jamino.me/jellyfin-likelovehate/manifest.json
   ```
3. Go to **Catalog**, find **LikeLoveHate**, and click **Install**
4. Restart Jellyfin

### Manual Install

1. Download the latest `.zip` from [Releases](https://github.com/DrBiznes/jellyfin-likelovehate/releases)
2. Extract `Jellyfin.Plugin.LikeLoveHate.dll` to:
   ```
   {JellyfinDataDir}/plugins/LikeLoveHate/
   ```
3. Restart Jellyfin

## Building from Source

```bash
# Clone the repo
git clone https://github.com/DrBiznes/jellyfin-likelovehate.git
cd jellyfin-likelovehate

# Build
dotnet build Jellyfin.Plugin.LikeLoveHate.sln --configuration Release
```

The DLL will be at `Jellyfin.Plugin.LikeLoveHate/bin/Release/net9.0/Jellyfin.Plugin.LikeLoveHate.dll`.

## API Endpoints

All endpoints are under `/api/LikeLoveHate/`:

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/React` | Set a reaction (query: `itemId`, `userId`, `reaction`, `userName`) |
| `GET` | `/Item/{itemId}` | Get reactions + stats for an item |
| `GET` | `/MyReaction/{itemId}?userId=` | Get current user's reaction |
| `DELETE` | `/Reaction?itemId=&userId=` | Remove a reaction |
| `GET` | `/Export` | Download all reactions as JSON |

**Reaction values:** `1` = Like, `2` = Love, `3` = Hate

## Configuration

In the Jellyfin dashboard under **Plugins → LikeLoveHate**:
- **Activity logging** — Toggle whether reactions are logged to the server log
- **Export** — Download all reaction data as a JSON file

## License

This plugin is licensed under the [GNU General Public License v3.0](LICENSE).
