using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using System.Text.Json;
using Jellyfin.Plugin.LikeLoveHate.Models;
using MediaBrowser.Common.Configuration;

namespace Jellyfin.Plugin.LikeLoveHate.Data;

/// <summary>
/// JSON-file backed repository for user reactions.
/// </summary>
public class ReactionRepository
{
    private static readonly JsonSerializerOptions _jsonOptions = new() { WriteIndented = true };

    private readonly string _dataPath;
    private readonly object _lock = new();
    private Dictionary<string, UserReaction> _reactions = new();

    /// <summary>
    /// Initializes a new instance of the <see cref="ReactionRepository"/> class.
    /// </summary>
    /// <param name="appPaths">Application paths for locating plugin config directory.</param>
    public ReactionRepository(IApplicationPaths appPaths)
    {
        _dataPath = Path.Combine(appPaths.PluginConfigurationsPath, "Jellyfin.Plugin.LikeLoveHate", "reactions.json");
        Directory.CreateDirectory(Path.GetDirectoryName(_dataPath)!);
        LoadReactions();
    }

    private static string GetKey(Guid itemId, Guid userId) => $"{itemId}_{userId}";

    /// <summary>
    /// Save or update a user's reaction.
    /// </summary>
    /// <param name="reaction">The reaction to save.</param>
    public void SaveReaction(UserReaction reaction)
    {
        lock (_lock)
        {
            var key = GetKey(reaction.ItemId, reaction.UserId);
            _reactions[key] = reaction;
            PersistReactions();
        }
    }

    /// <summary>
    /// Get a specific user's reaction for an item.
    /// </summary>
    /// <param name="itemId">The media item ID.</param>
    /// <param name="userId">The user ID.</param>
    /// <returns>The reaction, or null if none exists.</returns>
    public UserReaction? GetReaction(Guid itemId, Guid userId)
    {
        lock (_lock)
        {
            var key = GetKey(itemId, userId);
            return _reactions.TryGetValue(key, out var reaction) ? reaction : null;
        }
    }

    /// <summary>
    /// Get all reactions for a media item.
    /// </summary>
    /// <param name="itemId">The media item ID.</param>
    /// <returns>Read-only collection of reactions ordered by most recent first.</returns>
    public IReadOnlyList<UserReaction> GetReactionsForItem(Guid itemId)
    {
        lock (_lock)
        {
            return _reactions.Values
                .Where(r => r.ItemId == itemId)
                .OrderByDescending(r => r.Timestamp)
                .ToList()
                .AsReadOnly();
        }
    }

    /// <summary>
    /// Delete a user's reaction for an item.
    /// </summary>
    /// <param name="itemId">The media item ID.</param>
    /// <param name="userId">The user ID.</param>
    public void DeleteReaction(Guid itemId, Guid userId)
    {
        lock (_lock)
        {
            var key = GetKey(itemId, userId);
            _reactions.Remove(key);
            PersistReactions();
        }
    }

    /// <summary>
    /// Get aggregate reaction statistics for an item.
    /// </summary>
    /// <param name="itemId">The media item ID.</param>
    /// <returns>The reaction stats.</returns>
    public ReactionStats GetStatsForItem(Guid itemId)
    {
        lock (_lock)
        {
            var items = _reactions.Values.Where(r => r.ItemId == itemId).ToList();
            var stats = new ReactionStats
            {
                Likes = items.Count(r => r.Reaction == ReactionType.Like),
                Loves = items.Count(r => r.Reaction == ReactionType.Love),
                Hates = items.Count(r => r.Reaction == ReactionType.Hate),
                Total = items.Count,
            };

            foreach (var item in items)
            {
                stats.UserReactions[item.UserId] = item;
            }

            return stats;
        }
    }

    /// <summary>
    /// Get all reactions across all items (for export).
    /// </summary>
    /// <returns>Read-only collection of all reactions.</returns>
    public IReadOnlyList<UserReaction> GetAllReactions()
    {
        lock (_lock)
        {
            return _reactions.Values.ToList().AsReadOnly();
        }
    }

    private void LoadReactions()
    {
        lock (_lock)
        {
            try
            {
                if (File.Exists(_dataPath))
                {
                    var json = File.ReadAllText(_dataPath);
                    _reactions = JsonSerializer.Deserialize<Dictionary<string, UserReaction>>(json) ?? new();
                }
            }
            catch (Exception)
            {
                _reactions = new Dictionary<string, UserReaction>();
            }
        }
    }

    private void PersistReactions()
    {
        lock (_lock)
        {
            try
            {
                var json = JsonSerializer.Serialize(_reactions, _jsonOptions);
                File.WriteAllText(_dataPath, json);
            }
            catch (Exception)
            {
                // Silently fail — logged at controller level
            }
        }
    }
}
